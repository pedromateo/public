package com.iptvisor.app.ui.streams

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.iptvisor.app.IPTVisorApp
import com.iptvisor.app.data.model.SeriesEpisode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeriesDetailScreen(
    playlistId: Long,
    seriesId: String,
    seriesName: String,
    onBack: () -> Unit,
    onPlayEpisode: (title: String, url: String) -> Unit
) {
    val context = LocalContext.current
    val container = (context.applicationContext as IPTVisorApp).container
    val viewModel: SeriesDetailViewModel = viewModel(
        key = "series_${playlistId}_$seriesId",
        factory = SeriesDetailViewModel.factory(playlistId, seriesId, container.repository)
    )

    val uiState by viewModel.uiState.collectAsState()
    var selectedSeasonIndex by rememberSaveable(seriesId) { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.seriesInfo?.title?.ifBlank { seriesName } ?: seriesName,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver"
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadSeries() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Recargar")
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                uiState.errorMessage != null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = uiState.errorMessage ?: "Error al cargar la serie.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error
                        )
                        Button(onClick = { viewModel.loadSeries() }) {
                            Text("Reintentar")
                        }
                    }
                }

                uiState.seriesInfo != null -> {
                    val info = uiState.seriesInfo!!
                    val seasons = info.seasons
                    val safeSeasonIndex = selectedSeasonIndex.coerceIn(0, (seasons.size - 1).coerceAtLeast(0))
                    val currentEpisodes = seasons.getOrNull(safeSeasonIndex)?.episodes.orEmpty()

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (info.coverUrl.isNotBlank() || info.plot.isNotBlank()) {
                            item(key = "series_header") {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    if (info.coverUrl.isNotBlank()) {
                                        AsyncImage(
                                            model = info.coverUrl,
                                            contentDescription = info.title,
                                            modifier = Modifier.size(width = 96.dp, height = 140.dp),
                                            contentScale = ContentScale.Crop
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                    }
                                    if (info.plot.isNotBlank()) {
                                        Text(
                                            text = info.plot,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 6,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                    }
                                }
                            }
                        }

                        if (seasons.isNotEmpty()) {
                            item(key = "season_selector") {
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    itemsIndexed(seasons) { index, season ->
                                        FilterChip(
                                            selected = index == safeSeasonIndex,
                                            onClick = { selectedSeasonIndex = index },
                                            label = {
                                                Text(season.name.ifBlank { "Temporada ${season.seasonNumber}" })
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        if (currentEpisodes.isEmpty()) {
                            item(key = "empty_episodes") {
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = "No hay episodios disponibles en esta temporada.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        } else {
                            items(
                                items = currentEpisodes,
                                key = { "${it.season}_${it.id}_${it.episodeNum}" }
                            ) { episode ->
                                EpisodeRowCard(
                                    episode = episode,
                                    onClick = {
                                        val url = viewModel.buildEpisodeUrl(episode)
                                        if (!url.isNullOrBlank()) {
                                            val epTitle = if (episode.title.isNotBlank()) {
                                                "E${episode.episodeNum} - ${episode.title}"
                                            } else {
                                                "Episodio ${episode.episodeNum}"
                                            }
                                            onPlayEpisode("$seriesName · $epTitle", url)
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EpisodeRowCard(
    episode: SeriesEpisode,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (episode.title.isNotBlank()) {
                        "${episode.episodeNum}. ${episode.title}"
                    } else {
                        "Episodio ${episode.episodeNum}"
                    },
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Icon(
                imageVector = Icons.Default.PlayArrow,
                contentDescription = "Reproducir episodio"
            )
        }
    }
}
