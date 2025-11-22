package com.example.myapp.todo.data.remote

import com.example.myapp.todo.data.Item

// Be tolerant: payload or game may be missing/partial in incoming messages
data class ItemPayload(val game: Item?)
data class ItemEvent(val type: String, val payload: ItemPayload?)
