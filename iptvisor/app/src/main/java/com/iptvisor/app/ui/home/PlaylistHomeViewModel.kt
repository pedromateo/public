package com.iptvisor.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.iptvisor.app.data.local.CategoryEntity
import com.iptvisor.app.data.local.FavoriteStreamEntity
import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.repository.PlaylistRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
class PlaylistHomeViewModel(
    private val playlistId: Long,
    private val repository: PlaylistRepository
) : ViewModel() {

    val playlist: StateFlow<PlaylistEntity?> = repository.observePlaylists()
        .map { playlists -> playlists.firstOrNull { it.id == playlistId } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val favoriteCategories: StateFlow<List<CategoryEntity>> =
        repository.observeFavoriteCategories(playlistId)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val favoriteStreams: StateFlow<List<FavoriteStreamEntity>> =
        repository.observeFavorites(playlistId)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val liveCategories: StateFlow<List<CategoryEntity>> =
        repository.observeCategories(playlistId, ContentType.LIVE)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val vodCategories: StateFlow<List<CategoryEntity>> =
        repository.observeCategories(playlistId, ContentType.VOD)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val seriesCategories: StateFlow<List<CategoryEntity>> =
        repository.observeCategories(playlistId, ContentType.SERIES)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val searchResults: StateFlow<List<StreamEntity>> = _searchQuery
        .debounce(250)
        .map { it.trim() }
        .distinctUntilChanged()
        .flatMapLatest { query ->
            if (query.isEmpty()) {
                flowOf(emptyList())
            } else {
                repository.searchStreams(playlistId, query)
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _indexingProgress = MutableStateFlow<Int?>(null)
    val indexingProgress: StateFlow<Int?> = _indexingProgress.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun toggleCategoryFavorite(categoryId: Long, isFavorite: Boolean) {
        viewModelScope.launch {
            try {
                repository.toggleCategoryFavorite(categoryId, isFavorite)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Error al actualizar favorito."
            }
        }
    }

    fun removeFavoriteStream(stableKey: String) {
        viewModelScope.launch {
            try {
                repository.removeFavorite(playlistId, stableKey)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Error al quitar favorito."
            }
        }
    }

    fun indexAllXtream() {
        if (_indexingProgress.value != null) return
        viewModelScope.launch {
            _indexingProgress.value = 0
            try {
                repository.indexAllXtreamStreams(playlistId) { progress ->
                    _indexingProgress.value = progress
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Error al indexar el catálogo."
            } finally {
                _indexingProgress.value = null
            }
        }
    }

    fun refreshPlaylist() {
        if (_isRefreshing.value) return
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                repository.refreshPlaylist(playlistId)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Error al actualizar la lista."
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    companion object {
        fun factory(playlistId: Long, repository: PlaylistRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return PlaylistHomeViewModel(playlistId, repository) as T
                }
            }
    }
}
