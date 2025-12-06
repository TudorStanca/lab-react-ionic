package com.example.myapp.todo.ui

import android.app.Application
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.example.myapp.MyAppDatabase
import com.example.myapp.todo.workers.SyncWorkManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class SyncUiState(
    val isSyncing: Boolean = false,
    val lastSyncStatus: String = "Not synced yet",
    val pendingOperationsCount: Int = 0
)

class SyncStatusViewModel(application: Application) : AndroidViewModel(application) {
    private val _uiState = MutableStateFlow(SyncUiState())
    val uiState: StateFlow<SyncUiState> = _uiState

    private val workManager = WorkManager.getInstance(application)
    private val database = MyAppDatabase.getDatabase(application)

    init {
        observeSyncWork()
        observePendingOperations()
    }

    private fun observeSyncWork() {
        viewModelScope.launch {
            workManager.getWorkInfosByTagFlow("item_sync").collect { workInfos ->
                val latestWork = workInfos.firstOrNull()
                val currentState = _uiState.value
                _uiState.value = when (latestWork?.state) {
                    WorkInfo.State.RUNNING -> {
                        currentState.copy(isSyncing = true, lastSyncStatus = "Syncing...")
                    }
                    WorkInfo.State.SUCCEEDED -> {
                        currentState.copy(isSyncing = false, lastSyncStatus = "Last sync: Success")
                    }
                    WorkInfo.State.FAILED -> {
                        currentState.copy(isSyncing = false, lastSyncStatus = "Last sync: Failed")
                    }
                    WorkInfo.State.ENQUEUED -> {
                        currentState.copy(isSyncing = false, lastSyncStatus = "Sync pending...")
                    }
                    else -> {
                        currentState.copy(isSyncing = false, lastSyncStatus = "Not synced yet")
                    }
                }
            }
        }
    }

    private fun observePendingOperations() {
        viewModelScope.launch {
            // Poll for pending operations count every few seconds
            while (true) {
                val count = database.pendingOperationDao().getAllPendingOperations().size
                _uiState.value = _uiState.value.copy(pendingOperationsCount = count)
                kotlinx.coroutines.delay(2000) // Check every 2 seconds
            }
        }
    }

    fun triggerSync() {
        SyncWorkManager.triggerSync(getApplication())
    }

    companion object {
        fun Factory(application: Application): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                SyncStatusViewModel(application)
            }
        }
    }
}

@Composable
fun SyncStatusCard() {
    val context = LocalContext.current
    val viewModel = viewModel<SyncStatusViewModel>(
        factory = SyncStatusViewModel.Factory(
            context.applicationContext as Application
        )
    )
    val uiState by viewModel.uiState.collectAsState()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Sync Status",
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = uiState.lastSyncStatus,
                    style = MaterialTheme.typography.bodyMedium
                )
                if (uiState.pendingOperationsCount > 0) {
                    Text(
                        text = "${uiState.pendingOperationsCount} pending operation(s)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }

            Button(
                onClick = { viewModel.triggerSync() },
                enabled = !uiState.isSyncing
            ) {
                if (uiState.isSyncing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Sync Now")
                }
            }
        }
    }
}

