package com.example.myapp.todo.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_operations")
data class PendingOperation(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val itemId: String,  // ID of the item to be synced
    val operationType: OperationType,  // CREATE, UPDATE, DELETE
    val timestamp: Long = System.currentTimeMillis()
)

enum class OperationType {
    CREATE,
    UPDATE,
    DELETE
}

