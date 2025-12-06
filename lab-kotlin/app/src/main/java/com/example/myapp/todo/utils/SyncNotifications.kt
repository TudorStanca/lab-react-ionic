package com.example.myapp.todo.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.myapp.auth.TAG

const val SYNC_CHANNEL_ID = "sync_channel"
const val SYNC_NOTIFICATION_ID = 1001

/**
 * Creates notification channel for sync notifications
 * Must be called before showing notifications (Android O+)
 */
fun createSyncNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Log.d(TAG, "createSyncNotificationChannel: Creating notification channel")
        val name = "Sync Notifications"
        val descriptionText = "Notifications for offline data synchronization"
        val importance = NotificationManager.IMPORTANCE_DEFAULT
        val channel = NotificationChannel(SYNC_CHANNEL_ID, name, importance).apply {
            description = descriptionText
        }

        val notificationManager: NotificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
        Log.d(TAG, "createSyncNotificationChannel: Channel created successfully")
    }
}

/**
 * Shows a simple notification when sync completes
 */
fun showSyncCompletedNotification(
    context: Context,
    syncedCount: Int,
    failedCount: Int = 0
) {
    Log.d(TAG, "showSyncCompletedNotification: Synced=$syncedCount, Failed=$failedCount")

    // Check permission
    if (!hasNotificationPermission(context)) {
        Log.w(TAG, "showSyncCompletedNotification: No notification permission granted!")
        return
    }

    val textTitle = "Sync Completed"
    val textContent = when {
        failedCount > 0 -> "Synced $syncedCount item(s), $failedCount failed"
        syncedCount == 1 -> "1 item synced with server"
        else -> "$syncedCount items synced with server"
    }

    Log.d(TAG, "showSyncCompletedNotification: Title='$textTitle', Content='$textContent'")

    val builder = NotificationCompat.Builder(context, SYNC_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.stat_notify_sync) // Using system sync icon
        .setContentTitle(textTitle)
        .setContentText(textContent)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true) // Dismiss when user taps it

    try {
        with(NotificationManagerCompat.from(context)) {
            notify(SYNC_NOTIFICATION_ID, builder.build())
        }
        Log.d(TAG, "showSyncCompletedNotification: Notification posted successfully")
    } catch (e: SecurityException) {
        Log.e(TAG, "showSyncCompletedNotification: SecurityException - permission not granted", e)
    }
}

/**
 * Shows notification when sync starts (optional)
 */
fun showSyncInProgressNotification(
    context: Context,
    itemCount: Int
) {
    Log.d(TAG, "showSyncInProgressNotification: Syncing $itemCount item(s)")

    // Check permission
    if (!hasNotificationPermission(context)) {
        Log.w(TAG, "showSyncInProgressNotification: No notification permission granted!")
        return
    }

    val textTitle = "Syncing..."
    val textContent = "Syncing $itemCount item(s) with server"

    val builder = NotificationCompat.Builder(context, SYNC_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.stat_notify_sync)
        .setContentTitle(textTitle)
        .setContentText(textContent)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setOngoing(true) // Can't be dismissed while syncing

    try {
        with(NotificationManagerCompat.from(context)) {
            notify(SYNC_NOTIFICATION_ID, builder.build())
        }
        Log.d(TAG, "showSyncInProgressNotification: Notification posted successfully")
    } catch (e: SecurityException) {
        Log.e(TAG, "showSyncInProgressNotification: SecurityException - permission not granted", e)
    }
}

/**
 * Dismisses the sync notification
 */
fun dismissSyncNotification(context: Context) {
    Log.d(TAG, "dismissSyncNotification: Dismissing notification")
    NotificationManagerCompat.from(context).cancel(SYNC_NOTIFICATION_ID)
}

