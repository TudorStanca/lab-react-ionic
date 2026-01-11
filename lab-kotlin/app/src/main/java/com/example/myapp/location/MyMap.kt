package com.example.myapp.location

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState

@Composable
fun MyMap(
    lat: Double,
    lng: Double,
    onLocationChange: (lat: Double, lng: Double) -> Unit,
    modifier: Modifier = Modifier
) {
    val markerState = rememberMarkerState(position = LatLng(lat, lng))
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(LatLng(lat, lng), 14f)
    }

    LaunchedEffect(lat, lng) {
        val pos = LatLng(lat, lng)
        markerState.position = pos
        cameraPositionState.position = CameraPosition.fromLatLngZoom(pos, cameraPositionState.position.zoom)
    }

    GoogleMap(
        modifier = modifier
            .fillMaxWidth()
            .height(320.dp),
        cameraPositionState = cameraPositionState,
        onMapClick = { latLng ->
            markerState.position = latLng
            onLocationChange(latLng.latitude, latLng.longitude)
        },
        onMapLongClick = { latLng ->
            markerState.position = latLng
            onLocationChange(latLng.latitude, latLng.longitude)
        }
    ) {
        Marker(state = markerState, title = "Selected location")
    }
}
