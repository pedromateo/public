package com.iptvisor.app.ui.streams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.repository.PlaylistRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class CategoryStreamsViewModel(
    private val playlistId: Long,
    private val type: ContentType,
    private val categoryId: String,
    private val repository: PlaylistRepository
) : ViewModel() {

    val streams: StateFlow<List<StreamEntity>> =
        repository.observeStreams(playlistId, type, categoryId)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val favoriteKeys: StateFlow<Set<String>> =
        repository.observeFavorites(playlistId)
            .map { favorites -> favorites.mapTo(HashSet()) { it.stableKey } }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptySet())

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    init {
        loadCategory(forceRefresh = false)
    }

    fun refreshCategory() {
        loadCategory(forceRefresh = true)
    }

    private fun loadCategory(forceRefresh: Boolean) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                repository.ensureCategoryLoaded(
                    playlistId = playlistId,
                    type = type,
                    categoryId = categoryId,
                    forceRefresh = forceRefresh
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Error al cargar el contenido."
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun toggleFavorite(stream: StreamEntity) {
        viewModelScope.launch {
            try {
                repository.toggleFavorite(stream)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Error al actualizar favorito."
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    companion object {
        fun factory(
            playlistId: Long,
            type: ContentType,
            categoryId: String,
            repository: PlaylistRepository
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return CategoryStreamsViewModel(playlistId, type, categoryId, repository) as T
            }
        }
    }
}
