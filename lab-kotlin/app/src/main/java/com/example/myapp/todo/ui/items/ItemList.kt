package com.example.myapp.todo.ui.items

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myapp.todo.data.Item

typealias OnItemFn = (id: String?) -> Unit

@Composable
fun ItemList(itemList: List<Item>, onItemClick: OnItemFn, modifier: Modifier) {
    Log.d("ItemList", "recompose")
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(12.dp)
    ) {
        items(itemList) { item ->
            ItemDetail(item, onItemClick)
        }
    }
}

@Composable
fun ItemDetail(item: Item, onItemClick: OnItemFn) {
    Row(
        modifier = Modifier.padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Sync Status Indicator
        val (icon, tint, description) = when {
            item._id.startsWith("temp_") -> Triple(
                Icons.Default.CloudOff,
                MaterialTheme.colorScheme.error,
                "Created offline - not synced"
            )
            item.needsSync -> Triple(
                Icons.Default.Sync,
                MaterialTheme.colorScheme.tertiary,
                "Modified offline - needs sync"
            )
            else -> Triple(
                Icons.Default.Cloud,
                MaterialTheme.colorScheme.primary,
                "Synced with server"
            )
        }

        Icon(
            imageVector = icon,
            contentDescription = description,
            tint = tint,
            modifier = Modifier
                .size(24.dp)
                .background(
                    tint.copy(alpha = 0.1f),
                    RoundedCornerShape(4.dp)
                )
                .padding(4.dp)
        )

        Spacer(modifier = Modifier.width(12.dp))

        ClickableText(
            text = AnnotatedString(
                """
                ${item.name}
                Price: ${item.price}
                Launch Date: ${item.launchDate}
                Cracked: ${item.isCracked}
                Version: ${item.version}
                ${if (item._id.startsWith("temp_")) "⚠️ Offline Item" else ""}
                """.trimIndent()
            ),
            style = TextStyle(fontSize = 18.sp),
            onClick = { onItemClick(item._id) },
            modifier = Modifier.weight(1f)
        )
    }
}
