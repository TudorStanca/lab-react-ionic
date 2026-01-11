package com.example.myapp.todo.ui.items

import android.util.Log
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.myapp.todo.data.Item

typealias OnItemFn = (id: String?) -> Unit

@Composable
fun ItemList(itemList: List<Item>, onItemClick: OnItemFn, modifier: Modifier) {
    Log.d("ItemList", "recompose")

    AnimatedContent(
        targetState = itemList,
        transitionSpec = {
            // New list slides in from bottom, old list slides out upwards.
            (slideInVertically(animationSpec = tween(220)) { it / 3 } + fadeIn(tween(220)))
                .togetherWith(slideOutVertically(animationSpec = tween(180)) { -it / 3 } + fadeOut(tween(180)))
        },
        label = "items-list"
    ) { animatedList ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(12.dp)
        ) {
            itemsIndexed(animatedList, key = { _, item -> item._id }) { _, item ->
                ItemDetail(
                    item,
                    onItemClick,
                    modifier = Modifier.animateContentSize(animationSpec = spring())
                )
            }
        }
    }
}

@Composable
fun ItemDetail(item: Item, onItemClick: OnItemFn, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.padding(vertical = 8.dp),
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

        Text(
            text = """
                ${item.name}
                Price: ${item.price}
                Launch Date: ${item.launchDate}
                Cracked: ${item.isCracked}
                Version: ${item.version}
                ${if (item._id.startsWith("temp_")) "⚠️ Offline Item" else ""}
                """.trimIndent(),
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier
                .weight(1f)
                .clickable { onItemClick(item._id) },
            overflow = TextOverflow.Ellipsis
        )
    }
}
