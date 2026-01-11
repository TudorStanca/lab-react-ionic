package com.example.myapp.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.conflate

class LocationMonitor(context: Context) {
    private val appContext = context.applicationContext
    private val fusedClient = LocationServices.getFusedLocationProviderClient(appContext)

    /**
     * Emits last known location (if available), then continuous updates.
     *
     * Caller must have runtime location permission.
     */
    @SuppressLint("MissingPermission")
    fun locationUpdates(intervalMillis: Long = 10_000L): Flow<Location> = callbackFlow {
        fusedClient.lastLocation
            .addOnSuccessListener { loc ->
                if (loc != null) trySend(loc)
            }

        val request = LocationRequest.Builder(intervalMillis)
            .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
            .build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                trySend(loc)
            }
        }

        fusedClient.requestLocationUpdates(request, callback, appContext.mainLooper)

        awaitClose {
            fusedClient.removeLocationUpdates(callback)
        }
    }.conflate()
}
