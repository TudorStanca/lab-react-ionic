@file:Suppress("OPT_IN_USAGE")

package com.example.myapp.todo.ui.item

import android.util.Log
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.myapp.R
import com.example.myapp.core.Result
import com.example.myapp.location.MyMap
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private val IsoUtcDateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
    timeZone = TimeZone.getTimeZone("UTC")
}

private fun Long.toIsoUtcStringCompat(): String = IsoUtcDateFormat.format(Date(this))

private fun String.toEpochMillisOrNullCompat(): Long? = try {
    IsoUtcDateFormat.parse(this)?.time
} catch (_: ParseException) {
    null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItemScreen(itemId: String?, onClose: () -> Unit) {
    val itemViewModel = viewModel<ItemViewModel>(factory = ItemViewModel.Factory(itemId))
    val itemUiState = itemViewModel.uiState

    var name by rememberSaveable { mutableStateOf(itemUiState.item.name) }
    var price by rememberSaveable { mutableIntStateOf(itemUiState.item.price) }
    var launchDate by rememberSaveable { mutableStateOf(itemUiState.item.launchDate) }
    var isCracked by rememberSaveable { mutableStateOf(itemUiState.item.isCracked) }

    // Coordinates shown/saved for this item
    var lat by rememberSaveable { mutableStateOf(if (itemUiState.item.lat != 0.0) itemUiState.item.lat else 46.7712) }
    var lng by rememberSaveable { mutableStateOf(if (itemUiState.item.lng != 0.0) itemUiState.item.lng else 23.6236) }

    Log.d("ItemScreen", "recompose, name = $name")
    Log.d("ItemScreen", "recompose, price = $price")
    Log.d("ItemScreen", "recompose, launchDate = $launchDate")
    Log.d("ItemScreen", "recompose, isCracked = $isCracked")

    LaunchedEffect(itemUiState.submitResult) {
        Log.d("ItemScreen", "Submit = ${itemUiState.submitResult}")
        if (itemUiState.submitResult is Result.Success) {
            Log.d("ItemScreen", "Closing screen")
            onClose()
        }
    }

    var itemInitialized by remember { mutableStateOf(itemId == null) }
    LaunchedEffect(itemId, itemUiState.loadResult) {
        Log.d("ItemScreen", "Item initialized = ${itemUiState.loadResult}")
        if (itemInitialized) {
            return@LaunchedEffect
        }
        if (itemUiState.loadResult !is Result.Loading) {
            name = itemUiState.item.name
            price = itemUiState.item.price
            launchDate = itemUiState.item.launchDate
            isCracked = itemUiState.item.isCracked
            lat = if (itemUiState.item.lat != 0.0) itemUiState.item.lat else 46.7712
            lng = if (itemUiState.item.lng != 0.0) itemUiState.item.lng else 23.6236
            itemInitialized = true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = stringResource(id = R.string.item)) },
                actions = {
                    Button(onClick = {
                        Log.d("ItemScreen", "save item")
                        itemViewModel.saveOrUpdateItem(name, price, launchDate, isCracked, lat, lng)
                    }) { Text("Save") }
                }
            )
        }
    ) {
        Column(
            modifier = Modifier
                .padding(it)
                .fillMaxSize()
        ) {
            if (itemUiState.loadResult is Result.Loading) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) { CircularProgressIndicator() }
            } else {
                if (itemUiState.submitResult is Result.Loading) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) { LinearProgressIndicator() }
                }
                if (itemUiState.loadResult is Result.Error) {
                    Text(text = "Failed to load item - ${(itemUiState.loadResult as Result.Error).exception?.message}")
                }
                Row {
                    TextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Name") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                Row {
                    TextField(
                        value = price.toString(),
                        onValueChange = {
                            price = it.toIntOrNull() ?: price
                        },
                        label = { Text("Nr Players") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Row {
                    val datePickerState = rememberDatePickerState(
                        initialSelectedDateMillis = launchDate.toEpochMillisOrNullCompat()
                    )
                    LaunchedEffect(datePickerState.selectedDateMillis) {
                        datePickerState.selectedDateMillis?.let { millis ->
                            launchDate = millis.toIsoUtcStringCompat()
                        }
                    }

                    DatePicker(
                        state = datePickerState,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Row {
                    RadioButton(
                        selected = isCracked,
                        onClick = { isCracked = !isCracked }
                    )
                    Text(
                        text = "Is Cracked",
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }

                if (itemUiState.loadResult !is Result.Loading) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Location: $lat, $lng",
                        modifier = Modifier.fillMaxWidth()
                    )
                    MyMap(
                        lat = lat,
                        lng = lng,
                        onLocationChange = { newLat, newLng ->
                            lat = newLat
                            lng = newLng
                        }
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                }

                if (itemUiState.submitResult is Result.Error) {
                    Text(
                        text = "Failed to submit item - ${(itemUiState.submitResult as Result.Error).exception?.message}",
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Preview
@Composable
fun PreviewItemScreen() {
    ItemScreen(itemId = "0", onClose = {})
}
