package com.example.myapp.todo.ui.items

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.myapp.MyApplication
import com.example.myapp.core.TAG
import com.example.myapp.sensors.ProximitySensorMonitor
import com.example.myapp.sensors.ProximitySensorState
import com.example.myapp.todo.data.Item
import com.example.myapp.todo.data.ItemRepository
import com.example.myapp.todo.workers.SyncWorkManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ItemsViewModel(
    private val itemRepository: ItemRepository,
    proximitySensorMonitor: ProximitySensorMonitor,
    private val application: MyApplication
) : ViewModel() {
    val uiState: Flow<List<Item>> = itemRepository.itemStream

    val proximityUiState: StateFlow<ProximitySensorState> = proximitySensorMonitor.proximityState
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(stopTimeoutMillis = 5_000),
            initialValue = ProximitySensorState(isAvailable = false)
        )

    init {
        Log.d(TAG, "init")
        loadItems()
    }

    fun loadItems() {
        Log.d(TAG, "loadItems...")
        viewModelScope.launch {
            // Refresh will check for pending operations
            // If pending ops exist, trigger sync immediately
            itemRepository.refresh()

            // Also trigger sync in case there are pending operations
            SyncWorkManager.triggerSync(application)
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app =
                    (this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as MyApplication)
                ItemsViewModel(app.container.itemRepository, app.container.proximitySensorMonitor, app)
            }
        }
    }
}
