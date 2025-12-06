package com.example.myapp.todo.workers

import android.content.Context
import android.util.Log
import com.example.myapp.MyApplication
import com.example.myapp.core.TAG
import com.example.myapp.todo.utils.ConnectivityManagerNetworkMonitor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch

/**
 * Monitors network connectivity and triggers sync + WebSocket reconnection when device comes back online
 */
class NetworkSyncManager(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var wasOffline = false

    fun startMonitoring() {
        Log.d(TAG, "NetworkSyncManager: Starting network monitoring")

        scope.launch {
            ConnectivityManagerNetworkMonitor(context).isOnline
                .distinctUntilChanged() // Only emit when connectivity changes
                .collect { isOnline ->
                    Log.d(TAG, "NetworkSyncManager: Network status changed - isOnline: $isOnline")

                    if (isOnline && wasOffline) {
                        // Device just came back online
                        Log.d(TAG, "NetworkSyncManager: Device came back online")

                        // 1. Trigger sync for pending operations
                        Log.d(TAG, "NetworkSyncManager: Triggering sync for pending operations")
                        SyncWorkManager.triggerSync(context)

                        // 2. Reconnect WebSocket to receive live updates
                        Log.d(TAG, "NetworkSyncManager: Reconnecting WebSocket")
                        reconnectWebSocket()
                    }

                    wasOffline = !isOnline
                }
        }
    }

    private fun reconnectWebSocket() {
        scope.launch {
            try {
                val application = context.applicationContext as? MyApplication
                if (application != null) {
                    Log.d(TAG, "NetworkSyncManager: Reopening WebSocket connection")
                    // Close existing connection if any
                    try {
                        application.container.itemRepository.closeWsClient()
                    } catch (e: Exception) {
                        Log.w(TAG, "NetworkSyncManager: Error closing existing WebSocket", e)
                    }

                    // Small delay to ensure clean close
                    kotlinx.coroutines.delay(500)

                    // Reopen WebSocket
                    application.container.itemRepository.openWsClient()
                    Log.d(TAG, "NetworkSyncManager: WebSocket reconnected successfully")
                } else {
                    Log.w(TAG, "NetworkSyncManager: Could not get MyApplication instance")
                }
            } catch (e: Exception) {
                Log.e(TAG, "NetworkSyncManager: Failed to reconnect WebSocket", e)
            }
        }
    }
}

