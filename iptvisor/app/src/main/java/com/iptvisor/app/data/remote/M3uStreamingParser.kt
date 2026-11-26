package com.iptvisor.app.data.remote

import android.content.Context
import android.net.Uri
import com.iptvisor.app.data.local.CategoryEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.StableKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStream
import java.io.InputStreamReader

/**
 * Streaming line-by-line M3U/M3U8 playlist parser that processes arbitrarily large playlists
 * without loading the entire file into memory.
 */
class M3uStreamingParser(
    private val httpClientFactory: HttpClientFactory,
) {

    private data class ExtInfMeta(
        val name: String,
        val logoUrl: String,
        val groupTitle: String,
    )

    /**
     * Parses an M3U [inputStream] line by line, emitting batches of newly discovered
     * [CategoryEntity] and [StreamEntity] items to [onBatch].
     */
    suspend fun parseStream(
        inputStream: InputStream,
        playlistId: Long,
        batchSize: Int = 1000,
        onBatch: suspend (categories: List<CategoryEntity>, streams: List<StreamEntity>) -> Unit,
    ) = withContext(Dispatchers.IO) {
        val reader = BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8))
        val seenCategories = HashSet<Pair<ContentType, String>>()
        val pendingCategories = ArrayList<CategoryEntity>()
        val pendingStreams = ArrayList<StreamEntity>(batchSize)
        var currentMeta: ExtInfMeta? = null
        val now = System.currentTimeMillis()

        reader.use { br ->
            var line = br.readLine()
            while (line != null) {
                val trimmed = line.trim()
                if (trimmed.isEmpty()) {
                    line = br.readLine()
                    continue
                }

                if (trimmed.startsWith("#EXTINF:", ignoreCase = true)) {
                    currentMeta = parseExtInf(trimmed)
                } else if (!trimmed.startsWith("#")) {
                    val url = trimmed
                    val meta = currentMeta
                    currentMeta = null

                    val name = meta?.name?.ifBlank { url } ?: url
                    val group = meta?.groupTitle?.ifBlank { DEFAULT_GROUP } ?: DEFAULT_GROUP
                    val logo = meta?.logoUrl ?: ""
                    val type = inferContentType(url)

                    val catKey = type to group
                    if (seenCategories.add(catKey)) {
                        pendingCategories.add(
                            CategoryEntity(
                                playlistId = playlistId,
                                categoryId = group,
                                name = group,
                                type = type,
                                isFavorite = false,
                                isLoaded = true,
                                lastUpdated = now,
                            ),
                        )
                    }

                    val stableKey = StableKey.forM3u(name, url)
                    pendingStreams.add(
                        StreamEntity(
                            playlistId = playlistId,
                            categoryId = group,
                            streamId = stableKey,
                            stableKey = stableKey,
                            name = name,
                            streamUrl = url,
                            logoUrl = logo,
                            containerExtension = "",
                            type = type,
                        ),
                    )

                    if (pendingStreams.size >= batchSize) {
                        onBatch(pendingCategories.toList(), pendingStreams.toList())
                        pendingCategories.clear()
                        pendingStreams.clear()
                    }
                }
                line = br.readLine()
            }
        }

        if (pendingCategories.isNotEmpty() || pendingStreams.isNotEmpty()) {
            onBatch(pendingCategories.toList(), pendingStreams.toList())
        }
    }

    /**
     * Streams and parses an M3U playlist from an HTTP(S) [url] using [userAgent].
     */
    suspend fun parseFromUrl(
        url: String,
        userAgent: String,
        playlistId: Long,
        onBatch: suspend (List<CategoryEntity>, List<StreamEntity>) -> Unit,
    ) = withContext(Dispatchers.IO) {
        val client = httpClientFactory.clientWithUserAgent(userAgent)
        val request = Request.Builder().url(url).build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("Failed to fetch M3U playlist: HTTP ${response.code}")
            }
            val body = response.body ?: throw IOException("Empty response body from M3U URL")
            body.byteStream().use { stream ->
                parseStream(stream, playlistId, onBatch = onBatch)
            }
        }
    }

    /**
     * Streams and parses an M3U playlist from a local Android content [uri].
     */
    suspend fun parseFromContentUri(
        context: Context,
        uri: Uri,
        playlistId: Long,
        onBatch: suspend (List<CategoryEntity>, List<StreamEntity>) -> Unit,
    ) = withContext(Dispatchers.IO) {
        val stream = context.contentResolver.openInputStream(uri)
            ?: throw IOException("Unable to open M3U URI: $uri")
        stream.use { input ->
            parseStream(input, playlistId, onBatch = onBatch)
        }
    }

    private fun parseExtInf(line: String): ExtInfMeta {
        val logo = TVG_LOGO_REGEX.find(line)?.groupValues?.getOrNull(1)?.trim().orEmpty()
        val group = GROUP_TITLE_REGEX.find(line)?.groupValues?.getOrNull(1)?.trim().orEmpty()

        val lastQuote = line.lastIndexOf('"')
        val commaIndex = if (lastQuote >= 0) {
            line.indexOf(',', startIndex = lastQuote + 1)
        } else {
            line.lastIndexOf(',')
        }
        val name = if (commaIndex >= 0 && commaIndex + 1 < line.length) {
            line.substring(commaIndex + 1).trim()
        } else {
            ""
        }

        return ExtInfMeta(
            name = name,
            logoUrl = logo,
            groupTitle = group,
        )
    }

    private fun inferContentType(url: String): ContentType {
        val path = url.substringBefore('?').substringBefore('#').lowercase()
        return if (path.endsWith(".mp4") || path.endsWith(".mkv") || path.endsWith(".avi")) {
            ContentType.VOD
        } else {
            ContentType.LIVE
        }
    }

    private companion object {
        const val DEFAULT_GROUP = "General"
        val TVG_LOGO_REGEX = Regex("""tvg-logo\s*=\s*"([^"]*)"""", RegexOption.IGNORE_CASE)
        val GROUP_TITLE_REGEX = Regex("""group-title\s*=\s*"([^"]*)"""", RegexOption.IGNORE_CASE)
    }
}
