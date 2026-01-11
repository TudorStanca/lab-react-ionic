@file:Suppress("OPT_IN_USAGE")

package com.example.myapp.todo.ui.items

import android.util.Log
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.myapp.R
import com.example.myapp.todo.ui.MyNetworkStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItemsScreen(
    onItemClick: (id: String?) -> Unit,
    onAddItem: () -> Unit,
    onLogout: () -> Unit,
    onOpenLocation: () -> Unit
) {
    Log.d("ItemsScreen", "recompose")
    val itemsViewModel = viewModel<ItemsViewModel>(factory = ItemsViewModel.Factory)
    val itemsUiState by itemsViewModel.uiState.collectAsStateWithLifecycle(
        initialValue = listOf()
    )

    val proximityState by itemsViewModel.proximityUiState.collectAsStateWithLifecycle()

    var showSensorSheet by rememberSaveable { mutableStateOf(false) }
    val sensorSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (showSensorSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSensorSheet = false },
            sheetState = sensorSheetState
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Proximity sensor",
                    style = MaterialTheme.typography.titleLarge
                )

                if (!proximityState.isAvailable) {
                    Text(
                        text = "No proximity sensor available on this device",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                } else {
                    Text(
                        text = "Status: ${if (proximityState.isNear) "NEAR" else "AWAY"}",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = "Distance: ${proximityState.distance ?: "-"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "Max range: ${proximityState.maxRange ?: "-"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = { showSensorSheet = false }) {
                    Text("Close")
                }

                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = stringResource(id = R.string.items)) },
                actions = {
                    MyNetworkStatus()
                    Button(onClick = onOpenLocation) { Text("Location") }
                    Button(onClick = { showSensorSheet = true }) { Text("Sensor") }
                    Button(onClick = onLogout) { Text("Logout") }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    Log.d("ItemsScreen", "add")
                    onAddItem()
                },
            ) { Icon(Icons.Rounded.Add, "Add") }
        }
    ) {
        ItemList(
            itemList = itemsUiState,
            onItemClick = onItemClick,
            modifier = Modifier.padding(it)
        )
    }
}

@Preview
@Composable
fun PreviewItemsScreen() {
    ItemsScreen(onItemClick = {}, onAddItem = {}, onLogout = {}, onOpenLocation = {})
}
