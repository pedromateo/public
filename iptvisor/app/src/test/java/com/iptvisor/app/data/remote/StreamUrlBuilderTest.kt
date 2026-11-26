package com.iptvisor.app.data.remote

import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.PlaylistType
import org.junit.Assert.assertEquals
import org.junit.Test

class StreamUrlBuilderTest {

    private fun xtreamPlaylist(serverUrl: String = "http://example.invalid:8080") = PlaylistEntity(
        id = 1L,
        name = "Test Xtream",
        type = PlaylistType.XTREAM,
        serverUrl = serverUrl,
        username = "testuser",
        password = "testpass",
    )

    private fun m3uPlaylist() = PlaylistEntity(
        id = 2L,
        name = "Test M3U",
        type = PlaylistType.M3U_URL,
        m3uUri = "http://example.invalid/playlist.m3u",
    )

    private fun stream(
        type: ContentType,
        streamId: String = "123",
        containerExtension: String = "",
        streamUrl: String = "",
    ) = StreamEntity(
        playlistId = 1L,
        categoryId = "10",
        streamId = streamId,
        stableKey = "key:$streamId",
        name = "Test Stream",
        streamUrl = streamUrl,
        containerExtension = containerExtension,
        type = type,
    )

    @Test
    fun `normalizeBaseUrl handles blank, missing scheme, trailing slashes, and whitespace`() {
        assertEquals("", StreamUrlBuilder.normalizeBaseUrl(""))
        assertEquals("", StreamUrlBuilder.normalizeBaseUrl("   "))
        assertEquals("http://example.invalid", StreamUrlBuilder.normalizeBaseUrl("example.invalid"))
        assertEquals("http://example.invalid", StreamUrlBuilder.normalizeBaseUrl("  http://example.invalid///  "))
        assertEquals("https://example.invalid:8443", StreamUrlBuilder.normalizeBaseUrl("https://example.invalid:8443/"))
        assertEquals("HTTP://example.invalid", StreamUrlBuilder.normalizeBaseUrl("HTTP://example.invalid/"))
    }

    @Test
    fun `buildLocalUrl builds Xtream live ts and m3u8 urls`() {
        val playlist = xtreamPlaylist("example.invalid:8080/")

        val defaultLive = stream(type = ContentType.LIVE, streamId = "42", containerExtension = "")
        assertEquals(
            "http://example.invalid:8080/live/testuser/testpass/42.ts",
            StreamUrlBuilder.buildLocalUrl(playlist, defaultLive),
        )

        val hlsLive = stream(type = ContentType.LIVE, streamId = "42", containerExtension = "M3U8")
        assertEquals(
            "http://example.invalid:8080/live/testuser/testpass/42.m3u8",
            StreamUrlBuilder.buildLocalUrl(playlist, hlsLive),
        )
    }

    @Test
    fun `buildLocalUrl builds Xtream vod urls with explicit or default mp4 extension`() {
        val playlist = xtreamPlaylist()

        val mkvVod = stream(type = ContentType.VOD, streamId = "77", containerExtension = "mkv")
        assertEquals(
            "http://example.invalid:8080/movie/testuser/testpass/77.mkv",
            StreamUrlBuilder.buildLocalUrl(playlist, mkvVod),
        )

        val mp4Vod = stream(type = ContentType.VOD, streamId = "78", containerExtension = "mp4")
        assertEquals(
            "http://example.invalid:8080/movie/testuser/testpass/78.mp4",
            StreamUrlBuilder.buildLocalUrl(playlist, mp4Vod),
        )

        val blankExtVod = stream(type = ContentType.VOD, streamId = "79", containerExtension = "")
        assertEquals(
            "http://example.invalid:8080/movie/testuser/testpass/79.mp4",
            StreamUrlBuilder.buildLocalUrl(playlist, blankExtVod),
        )
    }

    @Test
    fun `buildLocalUrl returns streamUrl verbatim for M3U playlists`() {
        val playlist = m3uPlaylist()
        val m3uStream = stream(
            type = ContentType.LIVE,
            streamId = "m3u:abc",
            streamUrl = "http://example.invalid/channel/1.ts",
        )
        assertEquals(
            "http://example.invalid/channel/1.ts",
            StreamUrlBuilder.buildLocalUrl(playlist, m3uStream),
        )
    }

    @Test
    fun `buildCastUrl forces m3u8 for Xtream live and delegates otherwise`() {
        val xtream = xtreamPlaylist()
        val liveTs = stream(type = ContentType.LIVE, streamId = "55", containerExtension = "ts")
        assertEquals(
            "http://example.invalid:8080/live/testuser/testpass/55.m3u8",
            StreamUrlBuilder.buildCastUrl(xtream, liveTs),
        )

        val vodMkv = stream(type = ContentType.VOD, streamId = "88", containerExtension = "mkv")
        assertEquals(
            "http://example.invalid:8080/movie/testuser/testpass/88.mkv",
            StreamUrlBuilder.buildCastUrl(xtream, vodMkv),
        )

        val m3u = m3uPlaylist()
        val m3uLive = stream(type = ContentType.LIVE, streamUrl = "http://example.invalid/live.ts")
        assertEquals(
            "http://example.invalid/live.ts",
            StreamUrlBuilder.buildCastUrl(m3u, m3uLive),
        )
    }

    @Test
    fun `buildEpisodeUrl builds series episode url with explicit or default extension`() {
        val playlist = xtreamPlaylist("https://example.invalid/")

        assertEquals(
            "https://example.invalid/series/testuser/testpass/901.mkv",
            StreamUrlBuilder.buildEpisodeUrl(playlist, episodeId = "901", containerExtension = "mkv"),
        )
        assertEquals(
            "https://example.invalid/series/testuser/testpass/902.mp4",
            StreamUrlBuilder.buildEpisodeUrl(playlist, episodeId = "902", containerExtension = ""),
        )
    }
}
