package com.example.myapp.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.conflate

class AndroidProximitySensorMonitor(context: Context) : ProximitySensorMonitor {
    private val appContext = context.applicationContext

    override val proximityState: Flow<ProximitySensorState> = callbackFlow {
        val sensorManager = appContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val proximitySensor = sensorManager?.getDefaultSensor(Sensor.TYPE_PROXIMITY)

        if (sensorManager == null || proximitySensor == null) {
            trySend(ProximitySensorState(isAvailable = false))
            close()
            return@callbackFlow
        }

        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                val distance = event.values.firstOrNull()
                val maxRange = proximitySensor.maximumRange
                val isNear = ProximitySensorState.isNearFromDistance(distance)

                trySend(
                    ProximitySensorState(
                        isAvailable = true,
                        distance = distance,
                        maxRange = maxRange,
                        isNear = isNear
                    )
                )
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }

        // Seed initial state so UI can show availability/max range immediately.
        trySend(
            ProximitySensorState(
                isAvailable = true,
                distance = null,
                maxRange = proximitySensor.maximumRange,
                isNear = false
            )
        )

        sensorManager.registerListener(
            listener,
            proximitySensor,
            SensorManager.SENSOR_DELAY_NORMAL
        )

        awaitClose {
            sensorManager.unregisterListener(listener, proximitySensor)
        }
    }.conflate()
}
