package com.example.myapp.todo.ui

import android.app.Application
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.myapp.MyApplication
import com.example.myapp.MyAppDatabase
import kotlinx.coroutines.launch

class DebugViewModel(application: Application) : AndroidViewModel(application) {
    private val database = MyAppDatabase.getDatabase(application)

    var message by mutableStateOf("")
        private set

    fun clearPendingOperations() {
        viewModelScope.launch {
            try {
                val count = database.pendingOperationDao().getAllPendingOperations().size
                database.pendingOperationDao().deleteAll()

                val itemsNeedingSync = database.itemDao().getItemsNeedingSync()
                itemsNeedingSync.forEach { item ->
                    database.itemDao().update(item.copy(needsSync = false))
                }

                message = "Cleared $count pending operations and ${itemsNeedingSync.size} items needing sync"
            } catch (e: Exception) {
                message = "Error: ${e.message}"
            }
        }
    }

    companion object {
        fun Factory(application: Application): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                DebugViewModel(application)
            }
        }
    }
}

@Composable
fun DebugPanel() {
    val context = LocalContext.current
    val viewModel = viewModel<DebugViewModel>(
        factory = DebugViewModel.Factory(
            context.applicationContext as Application
        )
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Debug Tools",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onErrorContainer
            )

            Button(
                onClick = { viewModel.clearPendingOperations() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("Clear Pending Operations")
            }

            if (viewModel.message.isNotEmpty()) {
                Text(
                    text = viewModel.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        }
    }
}

