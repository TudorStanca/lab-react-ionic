package com.example.myapp.todo.data.remote

import android.util.Log
import com.example.myapp.auth.TAG
import com.example.myapp.core.data.remote.Api
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import org.json.JSONObject
import com.example.myapp.todo.data.Item
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString

class ItemWsClient(private val okHttpClient: OkHttpClient) {

    lateinit var webSocket: WebSocket

    suspend fun openSocket(
        onEvent: (itemEvent: ItemEvent?) -> Unit,
        onClosed: () -> Unit,
        onFailure: () -> Unit
    ) {
        withContext(Dispatchers.IO) {
            Log.d(TAG, "openSocket")
            val request = Request.Builder().url(Api.wsUrl).build()
            webSocket = okHttpClient.newWebSocket(
                request,
                ItemWebSocketListener(onEvent = onEvent, onClosed = onClosed, onFailure = onFailure)
            )
        }
    }

    fun closeSocket() {
        Log.d(TAG, "closeSocket")
        webSocket.close(1000, "")
    }

    class ItemWebSocketListener(
        private val onEvent: (itemEvent: ItemEvent?) -> Unit,
        private val onClosed: () -> Unit,
        private val onFailure: () -> Unit
    ) : WebSocketListener() {
        private val moshi = Moshi.Builder().build()
        private val itemEventJsonAdapter: JsonAdapter<ItemEvent> = moshi.adapter(ItemEvent::class.java)

        override fun onOpen(webSocket: WebSocket, response: Response) {
            Log.d(TAG, "onOpen")
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            Log.d(TAG, "onMessage string $text")
            try {
                var finalEvent: ItemEvent? = null
                try {
                    val top = JSONObject(text)
                    val type = top.optString("type", "created")
                    val payload = top.optJSONObject("payload")
                    val gameObj = payload?.optJSONObject("game")
                    if (gameObj != null) {
                        val id = gameObj.optString("_id", "")
                        val name = gameObj.optString("name", "")
                        val price = if (gameObj.has("price")) gameObj.optInt("price") else 0
                        val launchDate = gameObj.optString("launchDate", "")
                        val isCracked = if (gameObj.has("isCracked")) gameObj.optBoolean("isCracked") else false
                        val version = if (gameObj.has("version")) gameObj.optInt("version") else 0
                        val builtItem = Item(
                            _id = id,
                            name = name,
                            price = price,
                            launchDate = launchDate,
                            isCracked = isCracked,
                            version = version
                        )
                        finalEvent = ItemEvent(type, ItemPayload(builtItem))
                        Log.d(TAG, "Manual parse produced item: $builtItem")
                    }
                } catch (je: Exception) {
                    Log.w(TAG, "Manual JSON parsing failed", je)
                }

                if (finalEvent == null) {
                    try {
                        finalEvent = itemEventJsonAdapter.fromJson(text)
                        if (finalEvent == null) Log.w(TAG, "Moshi produced null ItemEvent for message")
                    } catch (me: Exception) {
                        Log.w(TAG, "Moshi parsing failed", me)
                    }
                }

                if (finalEvent == null) {
                    Log.w(TAG, "Both manual and Moshi parsing failed for message: $text")
                }
                onEvent(finalEvent)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to parse websocket message", e)
                Log.d(TAG, "Raw websocket message: $text")
                onEvent(null)
            }
        }

        override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
            Log.d(TAG, "onMessage bytes $bytes")
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {}

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            Log.d(TAG, "onMessage bytes $code $reason")
            onClosed()
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            Log.d(TAG, "onMessage bytes $t")
            onFailure()
        }
    }

    fun authorize(token: String) {
        val auth = """
            {
              "type":"authorization",
              "payload":{
                "token": "$token"
              }
            }
        """.trimIndent()
        Log.d(TAG, "auth $auth")
        webSocket.send(auth)
    }
}