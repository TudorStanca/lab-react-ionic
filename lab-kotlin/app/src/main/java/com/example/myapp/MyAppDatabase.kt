package com.example.myapp

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.myapp.todo.data.Item
import com.example.myapp.todo.data.local.ItemDao
import com.example.myapp.todo.data.local.PendingOperation
import com.example.myapp.todo.data.local.PendingOperationDao

@Database(entities = arrayOf(Item::class, PendingOperation::class), version = 4)
abstract class MyAppDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao
    abstract fun pendingOperationDao(): PendingOperationDao

    companion object {
        @Volatile
        private var INSTANCE: MyAppDatabase? = null

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Create the new table
                database.execSQL(
                    "CREATE TABLE items_new (" +
                            "_id TEXT NOT NULL, " +
                            "name TEXT NOT NULL, " +
                            "price REAL NOT NULL DEFAULT 0.0, " +
                            "launchDate TEXT NOT NULL, " +
                            "isCracked INTEGER NOT NULL DEFAULT 0, " +
                            "PRIMARY KEY(_id))"
                )
                // Copy the data
                database.execSQL(
                    "INSERT INTO items_new (_id, name, price, launchDate, isCracked) " +
                            "SELECT _id, name, price, launchDate, isCracked FROM items"
                )
                // Remove the old table
                database.execSQL("DROP TABLE items")
                // Change the table name
                database.execSQL("ALTER TABLE items_new RENAME TO items")
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Add needsSync column to items table
                database.execSQL("ALTER TABLE items ADD COLUMN needsSync INTEGER NOT NULL DEFAULT 0")
                database.execSQL("ALTER TABLE items ADD COLUMN version INTEGER NOT NULL DEFAULT 0")

                // Create pending_operations table
                database.execSQL(
                    "CREATE TABLE pending_operations (" +
                            "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                            "itemId TEXT NOT NULL, " +
                            "operationType TEXT NOT NULL, " +
                            "timestamp INTEGER NOT NULL)"
                )
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE items ADD COLUMN lat REAL NOT NULL DEFAULT 0.0")
                database.execSQL("ALTER TABLE items ADD COLUMN lng REAL NOT NULL DEFAULT 0.0")
            }
        }

        fun getDatabase(context: Context): MyAppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context,
                    MyAppDatabase::class.java,
                    "app_database"
                )
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
