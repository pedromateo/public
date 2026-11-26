package com.iptvisor.app.data.remote

import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.PlaylistType

/**
 * Constructs normalized server base URLs and playback/cast URLs for Xtream and M3U streams.
 */
object StreamUrlBuilder {

    /**
     * Normalizes [serverUrl] by trimming whitespace, prepending `http://` when no HTTP(S) scheme
     * is present, and stripping any trailing slashes.
     */
    fun normalizeBaseUrl(serverUrl: String): String {
        val trimmed = serverUrl.trim()
        if (trimmed.isEmpty()) return ""
        val withScheme = if (
            trimmed.startsWith("http://", ignoreCase = true) ||
            trimmed.startsWith("https://", ignoreCase = true)
        ) {
            trimmed
        } else {
            "http://$trimmed"
        }
        return withScheme.trimEnd('/')
    }

    /**
     * Builds the local ExoPlayer playback URL for [stream] under [playlist].
     */
    fun buildLocalUrl(playlist: PlaylistEntity, stream: StreamEntity): String {
        if (playlist.type != PlaylistType.XTREAM) {
            return stream.streamUrl
        }
        val base = normalizeBaseUrl(playlist.serverUrl)
        return when (stream.type) {
            ContentType.LIVE -> {
                val ext = if (stream.containerExtension.equals("m3u8", ignoreCase = true)) {
                    "m3u8"
                } else {
                    "ts"
                }
                "$base/live/${playlist.username}/${playlist.password}/${stream.streamId}.$ext"
            }
            ContentType.VOD -> {
                val ext = stream.containerExtension.ifBlank { "mp4" }
                "$base/movie/${playlist.username}/${playlist.password}/${stream.streamId}.$ext"
            }
            ContentType.SERIES -> stream.streamUrl
        }
    }

    /**
     * Builds the Chromecast-compatible playback URL for [stream].
     * Live Xtream streams are requested as `.m3u8` because Chromecast requires HLS rather than raw `.ts`.
     */
    fun buildCastUrl(playlist: PlaylistEntity, stream: StreamEntity): String {
        if (playlist.type == PlaylistType.XTREAM && stream.type == ContentType.LIVE) {
            val base = normalizeBaseUrl(playlist.serverUrl)
            return "$base/live/${playlist.username}/${playlist.password}/${stream.streamId}.m3u8"
        }
        return buildLocalUrl(playlist, stream)
    }

    /**
     * Builds the Xtream series episode playback URL.
     */
    fun buildEpisodeUrl(
        playlist: PlaylistEntity,
        episodeId: String,
        containerExtension: String,
    ): String {
        val base = normalizeBaseUrl(playlist.serverUrl)
        val ext = containerExtension.ifBlank { "mp4" }
        return "$base/series/${playlist.username}/${playlist.password}/$episodeId.$ext"
    }
}
