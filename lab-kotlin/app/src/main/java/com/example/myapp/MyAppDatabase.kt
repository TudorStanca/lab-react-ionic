package com.example.myapp

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.myapp.todo.data.Item
import com.example.myapp.todo.data.local.ItemDao

@Database(entities = arrayOf(Item::class), version = 2)
abstract class MyAppDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao

    companion object {
        @Volatile
        private var INSTANCE: MyAppDatabase? = null

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Create the new table
                database.execSQL("CREATE TABLE items_new (_id TEXT NOT NULL, text TEXT NOT NULL, PRIMARY KEY(_id))")
                // Copy the data
                database.execSQL("INSERT INTO items_new (_id, text) SELECT id, text FROM items")
                // Remove the old table
                database.execSQL("DROP TABLE items")
                // Change the table name
                database.execSQL("ALTER TABLE items_new RENAME TO items")
            }
        }

        fun getDatabase(context: Context): MyAppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context,
                    MyAppDatabase::class.java,
                    "app_database"
                )
                    .addMigrations(MIGRATION_1_2)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
