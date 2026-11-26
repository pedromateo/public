package com.iptvisor.app.data.remote

import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.iptvisor.app.data.local.CategoryEntity
import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.SeriesEpisode
import com.iptvisor.app.data.model.SeriesInfo
import com.iptvisor.app.data.model.SeriesSeason
import com.iptvisor.app.data.model.StableKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Request
import java.io.IOException
import java.io.InputStreamReader

/**
 * Streaming Xtream Codes API client backed by [JsonReader] so large responses
 * (tens of thousands of streams) are parsed with constant memory usage.
 */
class XtreamStreamingClient(
    private val httpClientFactory: HttpClientFactory,
) {

    /**
     * Fetches categories for [playlist] and [type].
     */
    suspend fun fetchCategories(
        playlist: PlaylistEntity,
        type: ContentType,
    ): List<CategoryEntity> = withContext(Dispatchers.IO) {
        val action = when (type) {
            ContentType.LIVE -> "get_live_categories"
            ContentType.VOD -> "get_vod_categories"
            ContentType.SERIES -> "get_series_categories"
        }
        val url = buildApiUrl(playlist, action)
        val result = ArrayList<CategoryEntity>()
        val now = System.currentTimeMillis()

        executeStreamingJson(playlist.userAgent, url) { reader ->
            if (reader.peek() != JsonToken.BEGIN_ARRAY) {
                reader.skipValue()
                return@executeStreamingJson
            }
            reader.beginArray()
            while (reader.hasNext()) {
                if (reader.peek() != JsonToken.BEGIN_OBJECT) {
                    reader.skipValue()
                    continue
                }
                var categoryId = ""
                var name = ""
                reader.beginObject()
                while (reader.hasNext()) {
                    when (reader.nextName()) {
                        "category_id" -> categoryId = readStringSafely(reader)
                        "category_name" -> name = readStringSafely(reader)
                        else -> reader.skipValue()
                    }
                }
                reader.endObject()
                if (categoryId.isNotEmpty()) {
                    result.add(
                        CategoryEntity(
                            playlistId = playlist.id,
                            categoryId = categoryId,
                            name = name.ifBlank { categoryId },
                            type = type,
                            isFavorite = false,
                            isLoaded = false,
                            lastUpdated = now,
                        ),
                    )
                }
            }
            reader.endArray()
        }
        result
    }

    /**
     * Streams items for [playlist] and [type] (optionally filtered by [categoryId])
     * and invokes [onBatch] for every [batchSize] parsed [StreamEntity] items.
     */
    suspend fun streamStreams(
        playlist: PlaylistEntity,
        type: ContentType,
        categoryId: String?,
        batchSize: Int = 1000,
        onBatch: suspend (List<StreamEntity>) -> Unit,
    ) = withContext(Dispatchers.IO) {
        val action = when (type) {
            ContentType.LIVE -> "get_live_streams"
            ContentType.VOD -> "get_vod_streams"
            ContentType.SERIES -> "get_series"
        }
        val extra = if (categoryId != null) mapOf("category_id" to categoryId) else emptyMap()
        val url = buildApiUrl(playlist, action, extra)
        val batch = ArrayList<StreamEntity>(batchSize)

        executeStreamingJson(playlist.userAgent, url) { reader ->
            if (reader.peek() != JsonToken.BEGIN_ARRAY) {
                reader.skipValue()
                return@executeStreamingJson
            }
            reader.beginArray()
            while (reader.hasNext()) {
                if (reader.peek() != JsonToken.BEGIN_OBJECT) {
                    reader.skipValue()
                    continue
                }
                var streamId = ""
                var name = ""
                var logoUrl = ""
                var parsedCategoryId = ""
                var containerExt = ""

                reader.beginObject()
                while (reader.hasNext()) {
                    when (reader.nextName()) {
                        "stream_id", "series_id" -> {
                            val value = readStringSafely(reader)
                            if (value.isNotEmpty()) streamId = value
                        }
                        "name" -> name = readStringSafely(reader)
                        "stream_icon", "cover" -> {
                            val value = readStringSafely(reader)
                            if (value.isNotEmpty()) logoUrl = value
                        }
                        "category_id" -> parsedCategoryId = readStringSafely(reader)
                        "container_extension" -> containerExt = readStringSafely(reader)
                        else -> reader.skipValue()
                    }
                }
                reader.endObject()

                if (streamId.isNotEmpty()) {
                    batch.add(
                        StreamEntity(
                            playlistId = playlist.id,
                            categoryId = parsedCategoryId.ifBlank { categoryId.orEmpty() },
                            streamId = streamId,
                            stableKey = StableKey.forXtream(type, streamId),
                            name = name,
                            streamUrl = "",
                            logoUrl = logoUrl,
                            containerExtension = containerExt,
                            type = type,
                        ),
                    )
                    if (batch.size >= batchSize) {
                        onBatch(batch.toList())
                        batch.clear()
                    }
                }
            }
            reader.endArray()
        }

        if (batch.isNotEmpty()) {
            onBatch(batch.toList())
        }
    }

    /**
     * Fetches series metadata and season/episode breakdown for [seriesId].
     */
    suspend fun fetchSeriesInfo(
        playlist: PlaylistEntity,
        seriesId: String,
    ): SeriesInfo = withContext(Dispatchers.IO) {
        val url = buildApiUrl(playlist, "get_series_info", mapOf("series_id" to seriesId))
        var title = ""
        var coverUrl = ""
        var plot = ""
        val seasonsMap = LinkedHashMap<Int, MutableList<SeriesEpisode>>()

        executeStreamingJson(playlist.userAgent, url) { reader ->
            if (reader.peek() != JsonToken.BEGIN_OBJECT) {
                reader.skipValue()
                return@executeStreamingJson
            }
            reader.beginObject()
            while (reader.hasNext()) {
                when (reader.nextName()) {
                    "info" -> {
                        if (reader.peek() == JsonToken.BEGIN_OBJECT) {
                            reader.beginObject()
                            while (reader.hasNext()) {
                                when (reader.nextName()) {
                                    "name" -> title = readStringSafely(reader)
                                    "cover" -> coverUrl = readStringSafely(reader)
                                    "plot" -> plot = readStringSafely(reader)
                                    else -> reader.skipValue()
                                }
                            }
                            reader.endObject()
                        } else {
                            reader.skipValue()
                        }
                    }
                    "episodes" -> {
                        parseEpisodesBlock(reader, seasonsMap)
                    }
                    else -> reader.skipValue()
                }
            }
            reader.endObject()
        }

        val seasons = seasonsMap.entries
            .sortedBy { it.key }
            .map { (seasonNum, eps) ->
                SeriesSeason(
                    seasonNumber = seasonNum,
                    name = "Season $seasonNum",
                    episodes = eps.sortedBy { it.episodeNum },
                )
            }

        SeriesInfo(
            title = title,
            coverUrl = coverUrl,
            plot = plot,
            seasons = seasons,
        )
    }

    private fun parseEpisodesBlock(
        reader: JsonReader,
        seasonsMap: MutableMap<Int, MutableList<SeriesEpisode>>,
    ) {
        if (reader.peek() != JsonToken.BEGIN_OBJECT) {
            reader.skipValue()
            return
        }
        reader.beginObject()
        while (reader.hasNext()) {
            val seasonKey = reader.nextName().toIntOrNull()
            if (reader.peek() == JsonToken.BEGIN_ARRAY) {
                reader.beginArray()
                while (reader.hasNext()) {
                    if (reader.peek() != JsonToken.BEGIN_OBJECT) {
                        reader.skipValue()
                        continue
                    }
                    var id = ""
                    var episodeNum = 0
                    var epTitle = ""
                    var containerExt = ""
                    var season = seasonKey ?: 1

                    reader.beginObject()
                    while (reader.hasNext()) {
                        when (reader.nextName()) {
                            "id" -> id = readStringSafely(reader)
                            "episode_num" -> episodeNum = readIntSafely(reader, 0)
                            "title" -> epTitle = readStringSafely(reader)
                            "container_extension" -> containerExt = readStringSafely(reader)
                            "season" -> season = readIntSafely(reader, season)
                            else -> reader.skipValue()
                        }
                    }
                    reader.endObject()

                    if (id.isNotEmpty()) {
                        seasonsMap.getOrPut(season) { ArrayList() }.add(
                            SeriesEpisode(
                                id = id,
                                episodeNum = episodeNum,
                                title = epTitle,
                                containerExtension = containerExt,
                                season = season,
                            ),
                        )
                    }
                }
                reader.endArray()
            } else {
                reader.skipValue()
            }
        }
        reader.endObject()
    }

    private fun buildApiUrl(
        playlist: PlaylistEntity,
        action: String,
        extraParams: Map<String, String> = emptyMap(),
    ): String {
        val base = StreamUrlBuilder.normalizeBaseUrl(playlist.serverUrl)
        val builder = "$base/player_api.php".toHttpUrl().newBuilder()
            .addQueryParameter("username", playlist.username)
            .addQueryParameter("password", playlist.password)
            .addQueryParameter("action", action)
        extraParams.forEach { (key, value) ->
            builder.addQueryParameter(key, value)
        }
        return builder.build().toString()
    }

    private suspend inline fun executeStreamingJson(
        userAgent: String,
        url: String,
        crossinline block: suspend (JsonReader) -> Unit,
    ) {
        val client = httpClientFactory.clientWithUserAgent(userAgent)
        val request = Request.Builder().url(url).build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("Xtream API request failed: HTTP ${response.code}")
            }
            val body = response.body ?: throw IOException("Empty Xtream API response body")
            JsonReader(InputStreamReader(body.byteStream(), Charsets.UTF_8)).use { reader ->
                reader.isLenient = true
                block(reader)
            }
        }
    }

    private fun readStringSafely(reader: JsonReader): String {
        return when (reader.peek()) {
            JsonToken.NULL -> {
                reader.nextNull()
                ""
            }
            JsonToken.STRING -> reader.nextString()
            JsonToken.NUMBER -> reader.nextString()
            JsonToken.BOOLEAN -> reader.nextBoolean().toString()
            else -> {
                reader.skipValue()
                ""
            }
        }
    }

    private fun readIntSafely(reader: JsonReader, fallback: Int): Int {
        return when (reader.peek()) {
            JsonToken.NULL -> {
                reader.nextNull()
                fallback
            }
            JsonToken.NUMBER -> {
                val raw = reader.nextString()
                raw.toIntOrNull() ?: raw.toDoubleOrNull()?.toInt() ?: fallback
            }
            JsonToken.STRING -> reader.nextString().trim().toIntOrNull() ?: fallback
            else -> {
                reader.skipValue()
                fallback
            }
        }
    }
}
