package com.iptvisor.app.ui.home

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
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.iptvisor.app.data.local.CategoryEntity
import com.iptvisor.app.data.local.FavoriteStreamEntity
import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.PlaylistType

private enum class HomeTab(val label: String) {
    FAVORITES("Favoritos"),
    LIVE("Directo"),
    VOD("Películas"),
    SERIES("Series")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlaylistHomeScreen(
    playlistId: Long,
    onBack: () -> Unit,
    onOpenCategory: (ContentType, String, String) -> Unit,
    onOpenSeries: (String, String) -> Unit,
    onOpenStream: (Long) -> Unit,
    onOpenDirectStream: (title: String, url: String, isLive: Boolean) -> Unit
) {
    val context = LocalContext.current
    val container = (context.applicationContext as IPTVisorApp).container
    val viewModel: PlaylistHomeViewModel = viewModel(
        key = "home_$playlistId",
        factory = PlaylistHomeViewModel.factory(playlistId, container.repository)
    )

    val playlist by viewModel.playlist.collectAsState()
    val favoriteCategories by viewModel.favoriteCategories.collectAsState()
    val favoriteStreams by viewModel.favoriteStreams.collectAsState()
    val liveCategories by viewModel.liveCategories.collectAsState()
    val vodCategories by viewModel.vodCategories.collectAsState()
    val seriesCategories by viewModel.seriesCategories.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    val indexingProgress by viewModel.indexingProgress.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    var selectedTabIndex by rememberSaveable { mutableIntStateOf(0) }
    var isSearchActive by rememberSaveable { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(errorMessage) {
        val msg = errorMessage
        if (msg != null) {
            snackbarHostState.showSnackbar(msg)
            viewModel.clearError()
        }
    }

    val tabs = HomeTab.entries

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = playlist?.name ?: "Lista",
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
                    if (isRefreshing) {
                        CircularProgressIndicator(
                            modifier = Modifier
                                .padding(horizontal = 12.dp)
                                .size(22.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        IconButton(onClick = { viewModel.refreshPlaylist() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                        }
                    }
                    IconButton(
                        onClick = {
                            isSearchActive = !isSearchActive
                            if (!isSearchActive) {
                                viewModel.updateSearchQuery("")
                            }
                        }
                    ) {
                        Icon(
                            imageVector = if (isSearchActive) Icons.Default.Close else Icons.Default.Search,
                            contentDescription = if (isSearchActive) "Cerrar búsqueda" else "Buscar"
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        bottomBar = {
            if (!isSearchActive) {
                NavigationBar {
                    tabs.forEachIndexed { index, tab ->
                        NavigationBarItem(
                            selected = selectedTabIndex == index,
                            onClick = { selectedTabIndex = index },
                            icon = {
                                val icon = when (tab) {
                                    HomeTab.FAVORITES -> Icons.Default.Star
                                    HomeTab.LIVE -> Icons.Default.PlayArrow
                                    HomeTab.VOD -> Icons.Default.List
                                    HomeTab.SERIES -> Icons.Default.List
                                }
                                Icon(icon, contentDescription = tab.label)
                            },
                            label = { Text(tab.label) }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (isSearchActive) {
                SearchSection(
                    playlist = playlist,
                    query = searchQuery,
                    results = searchResults,
                    indexingProgress = indexingProgress,
                    onQueryChange = viewModel::updateSearchQuery,
                    onIndexAll = viewModel::indexAllXtream,
                    onStreamClick = { stream ->
                        if (stream.type == ContentType.SERIES) {
                            onOpenSeries(stream.streamId, stream.name)
                        } else {
                            onOpenStream(stream.id)
                        }
                    }
                )
            } else {
                when (tabs[selectedTabIndex]) {
                    HomeTab.FAVORITES -> FavoritesTabContent(
                        favoriteCategories = favoriteCategories,
                        favoriteStreams = favoriteStreams,
                        onOpenCategory = onOpenCategory,
                        onToggleCategoryFavorite = { cat ->
                            viewModel.toggleCategoryFavorite(cat.id, !cat.isFavorite)
                        },
                        onPlayFavorite = { fav ->
                            if (fav.type == ContentType.SERIES) {
                                onOpenSeries(fav.streamId, fav.name)
                            } else {
                                onOpenDirectStream(
                                    fav.name,
                                    fav.streamUrl,
                                    fav.type == ContentType.LIVE
                                )
                            }
                        },
                        onRemoveFavorite = { fav ->
                            viewModel.removeFavoriteStream(fav.stableKey)
                        }
                    )

                    HomeTab.LIVE -> CategoryListContent(
                        categories = liveCategories,
                        emptyMessage = "No hay categorías de directo disponibles.",
                        onCategoryClick = { cat ->
                            onOpenCategory(ContentType.LIVE, cat.categoryId, cat.name)
                        },
                        onToggleFavorite = { cat ->
                            viewModel.toggleCategoryFavorite(cat.id, !cat.isFavorite)
                        }
                    )

                    HomeTab.VOD -> CategoryListContent(
                        categories = vodCategories,
                        emptyMessage = "No hay categorías de películas disponibles.",
                        onCategoryClick = { cat ->
                            onOpenCategory(ContentType.VOD, cat.categoryId, cat.name)
                        },
                        onToggleFavorite = { cat ->
                            viewModel.toggleCategoryFavorite(cat.id, !cat.isFavorite)
                        }
                    )

                    HomeTab.SERIES -> CategoryListContent(
                        categories = seriesCategories,
                        emptyMessage = "No hay categorías de series disponibles.",
                        onCategoryClick = { cat ->
                            onOpenCategory(ContentType.SERIES, cat.categoryId, cat.name)
                        },
                        onToggleFavorite = { cat ->
                            viewModel.toggleCategoryFavorite(cat.id, !cat.isFavorite)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchSection(
    playlist: PlaylistEntity?,
    query: String,
    results: List<StreamEntity>,
    indexingProgress: Int?,
    onQueryChange: (String) -> Unit,
    onIndexAll: () -> Unit,
    onStreamClick: (StreamEntity) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            label = { Text("Buscar canales, películas o series...") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = { onQueryChange("") }) {
                        Icon(Icons.Default.Close, contentDescription = "Limpiar")
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        )

        if (playlist != null && playlist.type == PlaylistType.XTREAM && !playlist.isFullyIndexed) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer
                )
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Solo se busca en categorías ya cargadas.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    if (indexingProgress != null) {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth()
                        )
                        val formattedCount = remember(indexingProgress) {
                            java.text.NumberFormat.getIntegerInstance().format(indexingProgress)
                        }
                        Text(
                            text = "Indexando catálogo: $formattedCount elementos...",
                            style = MaterialTheme.typography.labelSmall
                        )
                    } else {
                        Button(onClick = onIndexAll) {
                            Text("Indexar todo en segundo plano")
                        }
                    }
                }
            }
        }

        if (query.isNotBlank() && results.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Sin resultados para \"$query\".",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(
                    items = results,
                    key = { it.id }
                ) { stream ->
                    StreamSearchCard(
                        stream = stream,
                        onClick = { onStreamClick(stream) }
                    )
                }
            }
        }
    }
}

@Composable
private fun StreamSearchCard(
    stream: StreamEntity,
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
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (stream.logoUrl.isNotBlank()) {
                AsyncImage(
                    model = stream.logoUrl,
                    contentDescription = stream.name,
                    modifier = Modifier.size(44.dp),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(12.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stream.name,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = when (stream.type) {
                        ContentType.LIVE -> "Directo"
                        ContentType.VOD -> "Película"
                        ContentType.SERIES -> "Serie"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(Icons.Default.PlayArrow, contentDescription = "Abrir")
        }
    }
}

@Composable
private fun FavoritesTabContent(
    favoriteCategories: List<CategoryEntity>,
    favoriteStreams: List<FavoriteStreamEntity>,
    onOpenCategory: (ContentType, String, String) -> Unit,
    onToggleCategoryFavorite: (CategoryEntity) -> Unit,
    onPlayFavorite: (FavoriteStreamEntity) -> Unit,
    onRemoveFavorite: (FavoriteStreamEntity) -> Unit
) {
    if (favoriteCategories.isEmpty() && favoriteStreams.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Todavía no tienes categorías ni canales favoritos.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (favoriteCategories.isNotEmpty()) {
            item(key = "header_fav_categories") {
                Text(
                    text = "Categorías fijadas",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            items(
                items = favoriteCategories,
                key = { "fav_cat_${it.id}" }
            ) { category ->
                CategoryRowCard(
                    category = category,
                    onClick = {
                        onOpenCategory(category.type, category.categoryId, category.name)
                    },
                    onToggleFavorite = { onToggleCategoryFavorite(category) }
                )
            }
        }

        if (favoriteStreams.isNotEmpty()) {
            item(key = "header_fav_streams") {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Canales y títulos favoritos",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            items(
                items = favoriteStreams,
                key = { "fav_stream_${it.stableKey}" }
            ) { fav ->
                FavoriteStreamCard(
                    favorite = fav,
                    onPlay = { onPlayFavorite(fav) },
                    onRemove = { onRemoveFavorite(fav) }
                )
            }
        }
    }
}

@Composable
private fun FavoriteStreamCard(
    favorite: FavoriteStreamEntity,
    onPlay: () -> Unit,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onPlay)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (favorite.logoUrl.isNotBlank()) {
                AsyncImage(
                    model = favorite.logoUrl,
                    contentDescription = favorite.name,
                    modifier = Modifier.size(44.dp),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(12.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = favorite.name,
                    style = MaterialTheme.typography.titleSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = when (favorite.type) {
                        ContentType.LIVE -> "Directo"
                        ContentType.VOD -> "Película"
                        ContentType.SERIES -> "Serie"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            IconButton(onClick = onPlay) {
                Icon(Icons.Default.PlayArrow, contentDescription = "Reproducir")
            }
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Delete, contentDescription = "Quitar de favoritos")
            }
        }
    }
}

@Composable
private fun CategoryListContent(
    categories: List<CategoryEntity>,
    emptyMessage: String,
    onCategoryClick: (CategoryEntity) -> Unit,
    onToggleFavorite: (CategoryEntity) -> Unit
) {
    if (categories.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = emptyMessage,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(
            items = categories,
            key = { it.id }
        ) { category ->
            CategoryRowCard(
                category = category,
                onClick = { onCategoryClick(category) },
                onToggleFavorite = { onToggleFavorite(category) }
            )
        }
    }
}

@Composable
private fun CategoryRowCard(
    category: CategoryEntity,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = category.name,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onToggleFavorite) {
                Icon(
                    imageVector = if (category.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = if (category.isFavorite) "Quitar favorito" else "Añadir favorito",
                    tint = if (category.isFavorite) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
