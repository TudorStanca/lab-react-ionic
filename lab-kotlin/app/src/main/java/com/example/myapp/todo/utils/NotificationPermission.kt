package com.example.myapp.todo.utils

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

private const val TAG = "NotificationPermission"
const val NOTIFICATION_PERMISSION_REQUEST_CODE = 1001

/**
 * Checks if notification permission is granted
 */
fun hasNotificationPermission(context: Context): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    } else {
        // Below Android 13, notifications are always allowed
        true
    }
}

/**
 * Requests notification permission (Android 13+)
 */
fun requestNotificationPermission(activity: Activity) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        if (!hasNotificationPermission(activity)) {
            Log.d(TAG, "Requesting notification permission")
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                NOTIFICATION_PERMISSION_REQUEST_CODE
            )
        }
    }
}

