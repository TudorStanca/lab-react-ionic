package com.example.myapp.sensors

import kotlinx.coroutines.flow.Flow

/**
 * Cold [Flow] of proximity sensor readings.
 *
 * Collecting the flow registers a sensor listener; cancelling collection unregisters it.
 */
interface ProximitySensorMonitor {
    val proximityState: Flow<ProximitySensorState>
}

data class ProximitySensorState(
    val isAvailable: Boolean = false,
    /** Raw distance reported by the sensor (usually in cm or a device-specific unit). */
    val distance: Float? = null,
    val maxRange: Float? = null,
    /** Convenience flag; many devices report 0 when the object is near. */
    val isNear: Boolean = false
) {
    companion object {
        fun isNearFromDistance(distance: Float?): Boolean = distance != null && distance == 0f
    }
}
