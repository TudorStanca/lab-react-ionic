package com.example.myapp.todo.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "items")
data class Item(
    @PrimaryKey val _id: String = "",
    val text: String = "",
)
