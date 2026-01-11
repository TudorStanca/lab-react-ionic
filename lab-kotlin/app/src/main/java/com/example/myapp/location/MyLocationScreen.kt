@file:Suppress("OPT_IN_USAGE")

package com.example.myapp.location

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyLocationScreen(onClose: () -> Unit) {
    val vm = viewModel<MyLocationViewModel>(factory = MyLocationViewModel.Factory)
    val location by vm.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My location") },
                actions = {
                    Button(onClick = onClose) {
                        Text("Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            val lat = location?.latitude ?: 46.7712
            val lng = location?.longitude ?: 23.6236

            Text("Lat: $lat, Lng: $lng")
            MyMap(
                lat = lat,
                lng = lng,
                onLocationChange = { _, _ ->
                    // read-only map in this screen
                }
            )
        }
    }
}
