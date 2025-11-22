package com.example.myapp.todo.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "items")
data class Item(
    @PrimaryKey val _id: String = "",
    val name: String = "",
    val price: Int = 0,
    val launchDate: String = "",
    val isCracked: Boolean = false,
    val version: Int = 0
)
