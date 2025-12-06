package com.example.myapp.todo.workers

import android.content.Context
import android.util.Log
import androidx.work.*
import com.example.myapp.core.TAG
import java.util.concurrent.TimeUnit

object SyncWorkManager {
    private const val SYNC_WORK_NAME = "item_sync_work"
    private const val SYNC_WORK_TAG = "item_sync"

    fun initialize(context: Context) {
        Log.d(TAG, "SyncWorkManager: Initializing periodic sync work")

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)  // Only run when network is available
            .build()

        // Create a periodic work request that runs every 15 minutes (minimum interval)
        val syncWorkRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            repeatInterval = 15,
            repeatIntervalTimeUnit = TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .addTag(SYNC_WORK_TAG)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()

        // Enqueue the work, replacing any existing work with the same name
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,  // Keep existing work if already scheduled
            syncWorkRequest
        )

        Log.d(TAG, "SyncWorkManager: Periodic sync work scheduled")
    }

    fun triggerSync(context: Context) {
        Log.d(TAG, "SyncWorkManager: Triggering immediate sync")

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWorkRequest = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .addTag(SYNC_WORK_TAG)
            .build()

        WorkManager.getInstance(context).enqueue(syncWorkRequest)
    }

    fun cancelSync(context: Context) {
        Log.d(TAG, "SyncWorkManager: Canceling sync work")
        WorkManager.getInstance(context).cancelUniqueWork(SYNC_WORK_NAME)
    }
}

