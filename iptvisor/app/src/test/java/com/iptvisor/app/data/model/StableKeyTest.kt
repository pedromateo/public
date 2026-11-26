package com.iptvisor.app.data.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class StableKeyTest {

    @Test
    fun `forXtream returns expected prefix and format`() {
        assertEquals("xtream:LIVE:12345", StableKey.forXtream(ContentType.LIVE, "12345"))
        assertEquals("xtream:VOD:999", StableKey.forXtream(ContentType.VOD, "999"))
        assertEquals("xtream:SERIES:42", StableKey.forXtream(ContentType.SERIES, "42"))
    }

    @Test
    fun `forXtream is deterministic`() {
        val first = StableKey.forXtream(ContentType.LIVE, "500")
        val second = StableKey.forXtream(ContentType.LIVE, "500")
        assertEquals(first, second)
    }

    @Test
    fun `forXtream produces unique keys across content types and stream ids`() {
        val live = StableKey.forXtream(ContentType.LIVE, "100")
        val vod = StableKey.forXtream(ContentType.VOD, "100")
        val series = StableKey.forXtream(ContentType.SERIES, "100")
        val liveOther = StableKey.forXtream(ContentType.LIVE, "101")

        assertEquals(4, setOf(live, vod, series, liveOther).size)
    }

    @Test
    fun `forM3u returns m3u prefix with 64-char sha256 hex digest`() {
        val key = StableKey.forM3u("Channel One", "http://example.invalid/live/1.ts")
        assertTrue(key.startsWith("m3u:"))
        val hashPart = key.removePrefix("m3u:")
        assertEquals(64, hashPart.length)
        assertTrue(hashPart.all { it in '0'..'9' || it in 'a'..'f' })
    }

    @Test
    fun `forM3u is deterministic`() {
        val first = StableKey.forM3u("News", "http://example.invalid/news.m3u8")
        val second = StableKey.forM3u("News", "http://example.invalid/news.m3u8")
        assertEquals(first, second)
    }

    @Test
    fun `forM3u produces unique keys for different names, urls, and delimiter boundaries`() {
        val a = StableKey.forM3u("Channel A", "http://example.invalid/a.ts")
        val b = StableKey.forM3u("Channel B", "http://example.invalid/a.ts")
        val c = StableKey.forM3u("Channel A", "http://example.invalid/b.ts")
        val boundary1 = StableKey.forM3u("ab", "c")
        val boundary2 = StableKey.forM3u("a", "bc")

        assertNotEquals(a, b)
        assertNotEquals(a, c)
        assertNotEquals(b, c)
        assertNotEquals(boundary1, boundary2)
    }
}
