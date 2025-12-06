package com.example.myapp.todo.data

import android.util.Log
import com.example.myapp.core.TAG
import com.example.myapp.core.data.remote.Api
import com.example.myapp.todo.data.local.ItemDao
import com.example.myapp.todo.data.local.OperationType
import com.example.myapp.todo.data.local.PendingOperation
import com.example.myapp.todo.data.local.PendingOperationDao
import com.example.myapp.todo.data.remote.ItemEvent
import com.example.myapp.todo.data.remote.ItemService
import com.example.myapp.todo.data.remote.ItemWsClient
import com.example.myapp.todo.utils.ConnectivityManagerNetworkMonitor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import java.util.UUID

class ItemRepository(
    private val itemService: ItemService,
    private val itemWsClient: ItemWsClient,
    private val itemDao: ItemDao,
    private val pendingOperationDao: PendingOperationDao,
    private val connectivityMonitor: ConnectivityManagerNetworkMonitor
) {
    val itemStream by lazy { itemDao.getAll() }

    init {
        Log.d(TAG, "init")
    }

    private fun getBearerToken() = "Bearer ${Api.tokenInterceptor.token}"

    private suspend fun isOnline(): Boolean {
        return try {
            withContext(Dispatchers.IO) {
                kotlinx.coroutines.withTimeout(500) {  // 500ms timeout
                    connectivityMonitor.isOnline.first()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to check connectivity status, assuming online", e)
            // If we can't determine, assume online and let server call fail if actually offline
            true
        }
    }

    suspend fun refresh() {
        Log.d(TAG, "refresh started")
        try {
            // Check if we have pending operations that need to sync first
            val pendingOps = pendingOperationDao.getAllPendingOperations()
            Log.d(TAG, "refresh: Pending operations count = ${pendingOps.size}")

            if (pendingOps.isNotEmpty()) {
                Log.d(TAG, "refresh: Found ${pendingOps.size} pending operations")
                Log.d(TAG, "refresh: Attempting to fetch server data anyway to show something to user")

                // Still fetch server data so user sees something
                // but don't delete pending operations - let WorkManager handle them
                try {
                    val serverItems = itemService.find(authorization = getBearerToken())
                    Log.d(TAG, "refresh: Received ${serverItems.games.size} items from server (with pending ops)")

                    // Insert server items without deleting local changes
                    serverItems.games.forEach { serverItem ->
                        // Only insert if not already in local DB (to preserve offline changes)
                        val existsLocally = itemDao.getById(serverItem._id) != null
                        if (!existsLocally) {
                            itemDao.insert(serverItem.copy(needsSync = false))
                        }
                    }
                    Log.d(TAG, "refresh: Merged server items with pending local changes")
                } catch (e: Exception) {
                    Log.e(TAG, "refresh: Failed to fetch server data", e)
                }
                return
            }

            // No pending operations - all offline changes have been synced
            // Now it's safe to get fresh data from server (server is source of truth)
            Log.d(TAG, "refresh: No pending operations, fetching latest from server")
            Log.d(TAG, "refresh: Calling itemService.find() with token")
            val serverItems = itemService.find(authorization = getBearerToken())
            Log.d(TAG, "refresh: Received ${serverItems.games.size} items from server")

            // Clear local database and replace with server data
            // This ensures client is in sync with server after offline changes have been synced
            itemDao.deleteAll()
            serverItems.games.forEach { itemDao.insert(it.copy(needsSync = false)) }

            Log.d(TAG, "refresh succeeded: Synced ${serverItems.games.size} items from server")
        } catch (e: Exception) {
            Log.e(TAG, "refresh failed", e)
        }
    }

    suspend fun clearPendingOperations() {
        Log.d(TAG, "clearPendingOperations: Clearing all pending operations")
        pendingOperationDao.deleteAll()
        // Also clear needsSync flag on all items
        val items = itemDao.getItemsNeedingSync()
        items.forEach { item ->
            itemDao.update(item.copy(needsSync = false))
        }
        Log.d(TAG, "clearPendingOperations: Cleared ${items.size} items needing sync")
    }

    suspend fun openWsClient() {
        Log.d(TAG, "openWsClient")
        withContext(Dispatchers.IO) {
            getItemEvents().collect {
                Log.d(TAG, "Item event collected $it")
                if (it.isSuccess) {
                    val itemEvent = it.getOrNull()
                    val game = itemEvent?.payload?.game
                    if (game == null) {
                        Log.w(TAG, "Ignoring websocket event with null payload/game: $itemEvent")
                        return@collect
                    }
                    if (game._id.isBlank()) {
                        Log.w(TAG, "Ignoring websocket event with blank _id: $game")
                        return@collect
                    }
                    when (itemEvent.type) {
                        "created" -> handleItemCreated(game)
                        "updated" -> handleItemUpdated(game)
                        "deleted" -> handleItemDeleted(game)
                    }
                }
            }
        }
    }

    suspend fun closeWsClient() {
        Log.d(TAG, "closeWsClient")
        withContext(Dispatchers.IO) {
            itemWsClient.closeSocket()
        }
    }

    suspend fun getItemEvents(): Flow<kotlin.Result<ItemEvent>> = callbackFlow {
        Log.d(TAG, "getItemEvents started")
        itemWsClient.openSocket(
            onEvent = {
                Log.d(TAG, "onEvent $it")
                if (it != null) {
                    trySend(kotlin.Result.success(it))
                }
            },
            onClosed = {
                Log.d(TAG, "WebSocket closed, stream ending")
                close()
            },
            onFailure = {
                Log.e(TAG, "WebSocket failure, stream ending")
                close()
            }
        )
        awaitClose {
            Log.d(TAG, "getItemEvents awaitClose - closing WebSocket")
            itemWsClient.closeSocket()
        }
    }

    suspend fun update(item: Item): Item {
        Log.d(TAG, "update $item...")

        // Check if we're online
        val online = isOnline()
        Log.d(TAG, "update: online status = $online")

        if (!online) {
            // Offline: save locally immediately
            Log.d(TAG, "update: offline, queuing for sync")
            val itemToSync = item.copy(needsSync = true)
            itemDao.update(itemToSync)
            pendingOperationDao.insert(
                PendingOperation(
                    itemId = item._id,
                    operationType = OperationType.UPDATE
                )
            )
            return itemToSync
        }

        // Online: try server first
        return try {
            val updatedItem = itemService.update(itemId = item._id, item = item, authorization = getBearerToken())
            Log.d(TAG, "update $item succeeded")
            handleItemUpdated(updatedItem.copy(needsSync = false))
            updatedItem
        } catch (e: Exception) {
            Log.w(TAG, "update failed despite being online, queuing for offline sync", e)
            // Server call failed even though we're online - queue for sync
            val itemToSync = item.copy(needsSync = true)
            itemDao.update(itemToSync)
            pendingOperationDao.insert(
                PendingOperation(
                    itemId = item._id,
                    operationType = OperationType.UPDATE
                )
            )
            itemToSync
        }
    }

    suspend fun save(item: Item): Item {
        Log.d(TAG, "save $item...")

        // Check if we're online
        val online = isOnline()
        Log.d(TAG, "save: online status = $online")

        if (!online) {
            // Offline: save locally immediately
            Log.d(TAG, "save: offline, queuing for sync")
            val tempId = "temp_${UUID.randomUUID()}"
            val itemToSync = item.copy(_id = tempId, needsSync = true)
            itemDao.insert(itemToSync)
            pendingOperationDao.insert(
                PendingOperation(
                    itemId = tempId,
                    operationType = OperationType.CREATE
                )
            )
            Log.d(TAG, "save queued for sync with temp ID: $tempId")
            return itemToSync
        }

        // Online: try server first
        return try {
            val createdItem = itemService.create(item = item, authorization = getBearerToken())
            Log.d(TAG, "save $createdItem succeeded")
            handleItemCreated(createdItem.copy(needsSync = false))
            createdItem
        } catch (e: Exception) {
            Log.w(TAG, "save failed despite being online, queuing for offline sync", e)
            // Server call failed even though we're online - queue for sync
            val tempId = "temp_${UUID.randomUUID()}"
            val itemToSync = item.copy(_id = tempId, needsSync = true)
            itemDao.insert(itemToSync)
            pendingOperationDao.insert(
                PendingOperation(
                    itemId = tempId,
                    operationType = OperationType.CREATE
                )
            )
            Log.d(TAG, "save queued for sync with temp ID: $tempId")
            itemToSync
        }
    }

    private suspend fun handleItemDeleted(item: Item) {
        Log.d(TAG, "handleItemDeleted - todo $item")
    }

    private suspend fun handleItemUpdated(item: Item) {
        Log.d(TAG, "handleItemUpdated...")
        itemDao.update(item)
    }

    private suspend fun handleItemCreated(item: Item) {
        Log.d(TAG, "handleItemCreated...")
        itemDao.insert(item)
    }

    suspend fun deleteAll() {
        itemDao.deleteAll()
    }

    fun setToken(token: String) {
        itemWsClient.authorize(token)
    }
}