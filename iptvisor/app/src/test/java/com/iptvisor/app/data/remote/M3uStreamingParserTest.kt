package com.iptvisor.app.data.remote

import com.iptvisor.app.data.local.CategoryEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.StableKey
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream

class M3uStreamingParserTest {

    private val parser = M3uStreamingParser(HttpClientFactory())

    @Test
    fun `parseStream parses extinf attributes, commas in name, default group, and vod extensions`() = runTest {
        val m3u = """
            #EXTM3U
            #EXTVLCOPT:http-user-agent=TestAgent

            #EXTINF:-1 tvg-id="ch1" tvg-logo="http://example.invalid/logo1.png" group-title="News",World News, HD
            http://example.invalid/live/news.ts

            #EXTINF:-1 tvg-logo="http://example.invalid/logo2.png",Movie One
            http://example.invalid/movies/movie1.mp4?token=abc

            #EXTINF:-1 group-title="Cinema",Movie Two
            http://example.invalid/movies/movie2.MKV

            http://example.invalid/live/no_extinf.m3u8
        """.trimIndent()

        val categories = mutableListOf<CategoryEntity>()
        val streams = mutableListOf<StreamEntity>()

        parser.parseStream(
            inputStream = ByteArrayInputStream(m3u.toByteArray(Charsets.UTF_8)),
            playlistId = 7L,
            batchSize = 100,
        ) { batchCats, batchStreams ->
            categories.addAll(batchCats)
            streams.addAll(batchStreams)
        }

        assertEquals(4, streams.size)

        val news = streams[0]
        assertEquals(7L, news.playlistId)
        assertEquals("World News, HD", news.name)
        assertEquals("News", news.categoryId)
        assertEquals("http://example.invalid/logo1.png", news.logoUrl)
        assertEquals("http://example.invalid/live/news.ts", news.streamUrl)
        assertEquals(ContentType.LIVE, news.type)
        assertEquals(StableKey.forM3u("World News, HD", "http://example.invalid/live/news.ts"), news.stableKey)

        val movie1 = streams[1]
        assertEquals("Movie One", movie1.name)
        assertEquals("General", movie1.categoryId)
        assertEquals("http://example.invalid/logo2.png", movie1.logoUrl)
        assertEquals(ContentType.VOD, movie1.type)

        val movie2 = streams[2]
        assertEquals("Movie Two", movie2.name)
        assertEquals("Cinema", movie2.categoryId)
        assertEquals(ContentType.VOD, movie2.type)

        val noExtInf = streams[3]
        assertEquals("http://example.invalid/live/no_extinf.m3u8", noExtInf.name)
        assertEquals("General", noExtInf.categoryId)
        assertEquals(ContentType.LIVE, noExtInf.type)

        assertEquals(
            setOf(
                ContentType.LIVE to "News",
                ContentType.VOD to "General",
                ContentType.VOD to "Cinema",
                ContentType.LIVE to "General",
            ),
            categories.map { it.type to it.categoryId }.toSet(),
        )
    }

    @Test
    fun `parseStream emits batches of batchSize plus tail and deduplicates categories`() = runTest {
        val m3u = """
            #EXTM3U
            #EXTINF:-1 group-title="Sports",Channel 1
            http://example.invalid/1.ts
            #EXTINF:-1 group-title="Sports",Channel 2
            http://example.invalid/2.ts
            #EXTINF:-1 group-title="Sports",Channel 3
            http://example.invalid/3.ts
            #EXTINF:-1 group-title="Docs",Channel 4
            http://example.invalid/4.ts
            #EXTINF:-1 group-title="Docs",Channel 5
            http://example.invalid/5.ts
        """.trimIndent()

        val streamBatches = mutableListOf<List<StreamEntity>>()
        val categoryBatches = mutableListOf<List<CategoryEntity>>()

        parser.parseStream(
            inputStream = ByteArrayInputStream(m3u.toByteArray(Charsets.UTF_8)),
            playlistId = 1L,
            batchSize = 2,
        ) { cats, streams ->
            categoryBatches.add(cats)
            streamBatches.add(streams)
        }

        assertEquals(listOf(2, 2, 1), streamBatches.map { it.size })
        assertEquals(listOf("Sports"), categoryBatches[0].map { it.categoryId })
        assertEquals(listOf("Docs"), categoryBatches[1].map { it.categoryId })
        assertTrue(categoryBatches[2].isEmpty())
    }

    @Test
    fun `parseStream emits nothing for empty or comment-only input`() = runTest {
        val m3u = """
            #EXTM3U
            #EXTINF:-1 group-title="Empty",Dangling
        """.trimIndent()

        var batchCount = 0
        parser.parseStream(
            inputStream = ByteArrayInputStream(m3u.toByteArray(Charsets.UTF_8)),
            playlistId = 1L,
            batchSize = 2,
        ) { _, _ ->
            batchCount++
        }

        assertEquals(0, batchCount)
    }
}
