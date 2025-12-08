package com.example.myapp.todo.workers

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.myapp.MyAppDatabase
import com.example.myapp.core.TAG
import com.example.myapp.core.data.remote.Api
import com.example.myapp.todo.data.local.OperationType
import com.example.myapp.todo.data.remote.ItemService
import com.example.myapp.todo.utils.showSyncCompletedNotification
import com.example.myapp.todo.utils.showSyncInProgressNotification
import com.example.myapp.todo.utils.dismissSyncNotification
import retrofit2.HttpException

class SyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val database = MyAppDatabase.getDatabase(context)
    private val itemDao = database.itemDao()
    private val pendingOperationDao = database.pendingOperationDao()
    private val itemService = Api.retrofit.create(ItemService::class.java)

    override suspend fun doWork(): Result {
        Log.d(TAG, "SyncWorker: Starting sync...")

        return try {
            val token = Api.tokenInterceptor.token
            if (token.isNullOrBlank()) {
                Log.w(TAG, "SyncWorker: No auth token available, skipping sync")
                return Result.success()
            }

            val bearerToken = "Bearer $token"

            // Get all pending operations
            val pendingOperations = pendingOperationDao.getAllPendingOperations()
            Log.d(TAG, "SyncWorker: Found ${pendingOperations.size} pending operations")

            // If no pending operations, don't show notification
            if (pendingOperations.isEmpty()) {
                return Result.success()
            }

            // Show "syncing in progress" notification
            showSyncInProgressNotification(applicationContext, pendingOperations.size)

            var successCount = 0
            var failureCount = 0

            // Process each pending operation
            for (operation in pendingOperations) {
                try {
                    when (operation.operationType) {
                        OperationType.CREATE -> {
                            val item = itemDao.getById(operation.itemId)
                            if (item != null) {
                                Log.d(TAG, "SyncWorker: Creating item ${item._id} on server")
                                val createdItem = itemService.create(bearerToken, item)

                                // If the local item had a temp ID, delete it and insert the server version
                                if (item._id.startsWith("temp_")) {
                                    Log.d(TAG, "SyncWorker: Replacing temp item ${item._id} with server item ${createdItem._id}")
                                    itemDao.deleteById(item._id)
                                    itemDao.insert(createdItem.copy(needsSync = false))
                                } else {
                                    // Update the existing item
                                    itemDao.update(createdItem.copy(needsSync = false))
                                }

                                pendingOperationDao.deleteById(operation.id)
                                successCount++
                                Log.d(TAG, "SyncWorker: Successfully created item on server with ID ${createdItem._id}")
                            } else {
                                // Item was deleted locally, remove pending operation
                                pendingOperationDao.deleteById(operation.id)
                            }
                        }
                        OperationType.UPDATE -> {
                            val item = itemDao.getById(operation.itemId)
                            if (item != null) {
                                // If the item no longer needs sync (updated via WebSocket), skip it
                                if (!item.needsSync) {
                                    Log.d(TAG, "SyncWorker: Item ${operation.itemId} already synced via WebSocket")
                                    pendingOperationDao.deleteById(operation.id)
                                    successCount++
                                    continue
                                }

                                Log.d(TAG, "SyncWorker: Updating item ${item._id} on server")
                                try {
                                    val updatedItem = itemService.update(bearerToken, item._id, item)
                                    // Update local item with server data and clear sync flag
                                    itemDao.update(updatedItem.copy(needsSync = false))
                                    pendingOperationDao.deleteById(operation.id)
                                    successCount++
                                    Log.d(TAG, "SyncWorker: Successfully updated item ${item._id}")
                                } catch (e: retrofit2.HttpException) {
                                    // Handle version conflicts (409 or 400)
                                    if (e.code() == 409 || e.code() == 400) {
                                        Log.w(TAG, "SyncWorker: Version conflict for item ${item._id}, fetching from server")
                                        try {
                                            val serverItem = itemService.read(bearerToken, item._id)
                                            itemDao.update(serverItem.copy(needsSync = false))
                                            pendingOperationDao.deleteById(operation.id)
                                            successCount++
                                            Log.d(TAG, "SyncWorker: Resolved conflict by fetching server version")
                                        } catch (fetchError: Exception) {
                                            Log.e(TAG, "SyncWorker: Failed to resolve conflict for item ${item._id}", fetchError)
                                            throw fetchError
                                        }
                                    } else {
                                        throw e
                                    }
                                }
                            } else {
                                // Item was deleted locally, remove pending operation
                                pendingOperationDao.deleteById(operation.id)
                            }
                        }
                        OperationType.DELETE -> {
                            // DELETE operation - item already removed from local DB
                            // Just remove the pending operation
                            Log.d(TAG, "SyncWorker: DELETE operation for item ${operation.itemId} - handling not implemented yet")
                            pendingOperationDao.deleteById(operation.id)
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "SyncWorker: Failed to sync operation ${operation.id} for item ${operation.itemId}", e)
                    failureCount++
                    // Don't delete the operation, will retry next time
                }
            }

            Log.d(TAG, "SyncWorker: Sync completed - Success: $successCount, Failures: $failureCount")

            // Dismiss "syncing" notification
            dismissSyncNotification(applicationContext)

            // Show completion notification if any items were synced
            if (successCount > 0) {
                showSyncCompletedNotification(
                    applicationContext,
                    syncedCount = successCount,
                    failedCount = failureCount
                )
            }

            if (failureCount > 0) {
                // Some operations failed, retry later
                Result.retry()
            } else {
                // All operations synced successfully
                // Note: Don't call refresh here - the ItemsViewModel will call it when the UI is active
                // This avoids unnecessary network calls when the app is in background
                Log.d(TAG, "SyncWorker: All pending operations synced. UI will refresh when appropriate.")
                Result.success()
            }
        } catch (e: Exception) {
            Log.e(TAG, "SyncWorker: Sync failed with exception", e)
            dismissSyncNotification(applicationContext)
            Result.retry()
        }
    }
}

