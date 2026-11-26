package com.iptvisor.app

import android.net.Uri
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.ui.home.PlaylistHomeScreen
import com.iptvisor.app.ui.player.PlayerScreen
import com.iptvisor.app.ui.playlists.PlaylistSelectorScreen
import com.iptvisor.app.ui.streams.CategoryStreamsScreen
import com.iptvisor.app.ui.streams.SeriesDetailScreen
import com.iptvisor.app.ui.theme.IPTVisorTheme

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            IPTVisorTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    IPTVisorNavHost()
                }
            }
        }
    }
}

@Composable
private fun IPTVisorNavHost() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "playlists"
    ) {
        composable("playlists") {
            PlaylistSelectorScreen(
                onPlaylistSelected = { playlistId ->
                    navController.navigate("home/$playlistId")
                }
            )
        }

        composable(
            route = "home/{playlistId}",
            arguments = listOf(
                navArgument("playlistId") { type = NavType.LongType }
            )
        ) { backStackEntry ->
            val playlistId = backStackEntry.arguments?.getLong("playlistId") ?: 0L
            PlaylistHomeScreen(
                playlistId = playlistId,
                onBack = { navController.popBackStack() },
                onOpenCategory = { type, categoryId, categoryName ->
                    val encodedCatId = Uri.encode(categoryId)
                    val encodedCatName = Uri.encode(categoryName.ifBlank { "Categoría" })
                    navController.navigate(
                        "category/$playlistId/${type.name}/$encodedCatId/$encodedCatName"
                    )
                },
                onOpenSeries = { seriesId, seriesName ->
                    val encodedSeriesId = Uri.encode(seriesId)
                    val encodedSeriesName = Uri.encode(seriesName.ifBlank { "Serie" })
                    navController.navigate("series/$playlistId/$encodedSeriesId/$encodedSeriesName")
                },
                onOpenStream = { streamId ->
                    navController.navigate("player/$playlistId/$streamId")
                },
                onOpenDirectStream = { title, url, isLive ->
                    val encodedTitle = Uri.encode(title)
                    val encodedUrl = Uri.encode(url)
                    navController.navigate(
                        "playerDirect/$playlistId?title=$encodedTitle&url=$encodedUrl&isLive=$isLive"
                    )
                }
            )
        }

        composable(
            route = "category/{playlistId}/{type}/{categoryId}/{categoryName}",
            arguments = listOf(
                navArgument("playlistId") { type = NavType.LongType },
                navArgument("type") { type = NavType.StringType },
                navArgument("categoryId") { type = NavType.StringType },
                navArgument("categoryName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val args = backStackEntry.arguments
            val playlistId = args?.getLong("playlistId") ?: 0L
            val typeName = args?.getString("type") ?: ContentType.LIVE.name
            val type = runCatching { ContentType.valueOf(typeName) }.getOrDefault(ContentType.LIVE)
            val categoryId = args?.getString("categoryId") ?: ""
            val categoryName = args?.getString("categoryName") ?: ""

            CategoryStreamsScreen(
                playlistId = playlistId,
                type = type,
                categoryId = categoryId,
                categoryName = categoryName,
                onBack = { navController.popBackStack() },
                onOpenSeries = { seriesId, seriesName ->
                    val encodedSeriesId = Uri.encode(seriesId)
                    val encodedSeriesName = Uri.encode(seriesName.ifBlank { "Serie" })
                    navController.navigate("series/$playlistId/$encodedSeriesId/$encodedSeriesName")
                },
                onOpenStream = { streamId ->
                    navController.navigate("player/$playlistId/$streamId")
                }
            )
        }

        composable(
            route = "series/{playlistId}/{seriesId}/{seriesName}",
            arguments = listOf(
                navArgument("playlistId") { type = NavType.LongType },
                navArgument("seriesId") { type = NavType.StringType },
                navArgument("seriesName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val args = backStackEntry.arguments
            val playlistId = args?.getLong("playlistId") ?: 0L
            val seriesId = args?.getString("seriesId") ?: ""
            val seriesName = args?.getString("seriesName") ?: ""

            SeriesDetailScreen(
                playlistId = playlistId,
                seriesId = seriesId,
                seriesName = seriesName,
                onBack = { navController.popBackStack() },
                onPlayEpisode = { title, url ->
                    val encodedTitle = Uri.encode(title)
                    val encodedUrl = Uri.encode(url)
                    navController.navigate(
                        "playerDirect/$playlistId?title=$encodedTitle&url=$encodedUrl&isLive=false"
                    )
                }
            )
        }

        composable(
            route = "player/{playlistId}/{streamId}",
            arguments = listOf(
                navArgument("playlistId") { type = NavType.LongType },
                navArgument("streamId") { type = NavType.LongType }
            )
        ) { backStackEntry ->
            val args = backStackEntry.arguments
            val playlistId = args?.getLong("playlistId") ?: 0L
            val streamId = args?.getLong("streamId") ?: 0L

            PlayerScreen(
                playlistId = playlistId,
                streamId = streamId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = "playerDirect/{playlistId}?title={title}&url={url}&isLive={isLive}",
            arguments = listOf(
                navArgument("playlistId") { type = NavType.LongType },
                navArgument("title") {
                    type = NavType.StringType
                    defaultValue = ""
                },
                navArgument("url") {
                    type = NavType.StringType
                    defaultValue = ""
                },
                navArgument("isLive") {
                    type = NavType.BoolType
                    defaultValue = false
                }
            )
        ) { backStackEntry ->
            val args = backStackEntry.arguments
            val playlistId = args?.getLong("playlistId") ?: 0L
            val title = args?.getString("title") ?: ""
            val url = args?.getString("url") ?: ""
            val isLive = args?.getBoolean("isLive") ?: false

            PlayerScreen(
                playlistId = playlistId,
                streamId = null,
                directTitle = title,
                directUrl = url,
                directIsLive = isLive,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
