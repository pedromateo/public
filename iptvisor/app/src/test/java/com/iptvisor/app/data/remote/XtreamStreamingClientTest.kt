package com.iptvisor.app.data.remote

import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.PlaylistType
import com.iptvisor.app.data.model.StableKey
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.io.IOException

class XtreamStreamingClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: XtreamStreamingClient
    private lateinit var playlist: PlaylistEntity

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        client = XtreamStreamingClient(HttpClientFactory())
        playlist = PlaylistEntity(
            id = 5L,
            name = "Mock Xtream",
            type = PlaylistType.XTREAM,
            serverUrl = server.url("/").toString().trimEnd('/'),
            username = "testuser",
            password = "testpass",
            userAgent = "TestAgent/1.0",
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `fetchCategories parses categories, sends expected query params and user agent`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    [
                      {"category_id": 10, "category_name": "News"},
                      {"category_id": "20", "category_name": ""},
                      {"category_id": "", "category_name": "Ignored"}
                    ]
                    """.trimIndent(),
                ),
        )

        val categories = client.fetchCategories(playlist, ContentType.LIVE)

        assertEquals(2, categories.size)
        assertEquals("10", categories[0].categoryId)
        assertEquals("News", categories[0].name)
        assertEquals(ContentType.LIVE, categories[0].type)
        assertEquals(5L, categories[0].playlistId)

        assertEquals("20", categories[1].categoryId)
        assertEquals("20", categories[1].name)

        val request = server.takeRequest()
        assertEquals("TestAgent/1.0", request.getHeader("User-Agent"))
        val url = request.requestUrl!!
        assertEquals("/player_api.php", url.encodedPath)
        assertEquals("testuser", url.queryParameter("username"))
        assertEquals("testpass", url.queryParameter("password"))
        assertEquals("get_live_categories", url.queryParameter("action"))
    }

    @Test
    fun `streamStreams handles numeric and string stream_id, null fields, and batching`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    [
                      {"stream_id": 101, "name": "Movie 1", "stream_icon": "http://example.invalid/1.png", "category_id": "5", "container_extension": "mkv"},
                      {"stream_id": "102", "name": null, "stream_icon": null, "category_id": null, "container_extension": null},
                      {"stream_id": 103, "name": "Movie 3", "stream_icon": "", "category_id": "6", "container_extension": "mp4"},
                      {"stream_id": 104, "name": "Movie 4", "category_id": "6", "container_extension": "mp4"},
                      {"stream_id": 105, "name": "Movie 5", "category_id": "6", "container_extension": "mp4"}
                    ]
                    """.trimIndent(),
                ),
        )

        val batches = mutableListOf<List<StreamEntity>>()
        client.streamStreams(
            playlist = playlist,
            type = ContentType.VOD,
            categoryId = "99",
            batchSize = 2,
        ) { batch ->
            batches.add(batch)
        }

        assertEquals(listOf(2, 2, 1), batches.map { it.size })

        val first = batches[0][0]
        assertEquals("101", first.streamId)
        assertEquals(StableKey.forXtream(ContentType.VOD, "101"), first.stableKey)
        assertEquals("Movie 1", first.name)
        assertEquals("http://example.invalid/1.png", first.logoUrl)
        assertEquals("5", first.categoryId)
        assertEquals("mkv", first.containerExtension)

        val second = batches[0][1]
        assertEquals("102", second.streamId)
        assertEquals("", second.name)
        assertEquals("", second.logoUrl)
        assertEquals("99", second.categoryId)
        assertEquals("", second.containerExtension)

        val request = server.takeRequest()
        val url = request.requestUrl!!
        assertEquals("get_vod_streams", url.queryParameter("action"))
        assertEquals("99", url.queryParameter("category_id"))
    }

    @Test
    fun `fetchSeriesInfo parses metadata and sorts seasons and episodes`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "info": {
                        "name": "Example Show",
                        "cover": "http://example.invalid/cover.jpg",
                        "plot": "A test show plot."
                      },
                      "episodes": {
                        "2": [
                          {"id": "202", "episode_num": 2, "title": "S2E2", "container_extension": "mp4", "season": 2},
                          {"id": "201", "episode_num": "1", "title": "S2E1", "container_extension": "mkv", "season": 2}
                        ],
                        "1": [
                          {"id": "101", "episode_num": 1, "title": "Pilot", "container_extension": "mp4", "season": 1}
                        ]
                      }
                    }
                    """.trimIndent(),
                ),
        )

        val info = client.fetchSeriesInfo(playlist, seriesId = "555")

        assertEquals("Example Show", info.title)
        assertEquals("http://example.invalid/cover.jpg", info.coverUrl)
        assertEquals("A test show plot.", info.plot)
        assertEquals(2, info.seasons.size)

        val season1 = info.seasons[0]
        assertEquals(1, season1.seasonNumber)
        assertEquals("Season 1", season1.name)
        assertEquals(1, season1.episodes.size)
        assertEquals("101", season1.episodes[0].id)

        val season2 = info.seasons[1]
        assertEquals(2, season2.seasonNumber)
        assertEquals("Season 2", season2.name)
        assertEquals(listOf("201", "202"), season2.episodes.map { it.id })
        assertEquals(listOf(1, 2), season2.episodes.map { it.episodeNum })

        val request = server.takeRequest()
        val url = request.requestUrl!!
        assertEquals("get_series_info", url.queryParameter("action"))
        assertEquals("555", url.queryParameter("series_id"))
    }

    @Test(expected = IOException::class)
    fun `fetchCategories throws IOException on HTTP error`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500).setBody("Server Error"))
        client.fetchCategories(playlist, ContentType.SERIES)
    }
}
