/*
 * Copyright (C) 2022 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.example.myapp

import android.app.Application
import android.util.Log
import com.example.myapp.core.AppContainer
import com.example.myapp.core.TAG
import com.example.myapp.todo.workers.NetworkSyncManager
import com.example.myapp.todo.workers.SyncWorkManager

class MyApplication : Application() {
    lateinit var container: AppContainer
    private lateinit var networkSyncManager: NetworkSyncManager

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "init")
        container = AppContainer(this)

        // Initialize WorkManager for background sync
        SyncWorkManager.initialize(this)

        // Initialize network monitor to trigger sync when device comes back online
        networkSyncManager = NetworkSyncManager(this)
        networkSyncManager.startMonitoring()
    }
}
