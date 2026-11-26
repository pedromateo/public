package com.iptvisor.app.ui.streams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.model.SeriesEpisode
import com.iptvisor.app.data.model.SeriesInfo
import com.iptvisor.app.data.remote.StreamUrlBuilder
import com.iptvisor.app.data.repository.PlaylistRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SeriesDetailUiState(
    val seriesInfo: SeriesInfo? = null,
    val playlist: PlaylistEntity? = null,
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)

class SeriesDetailViewModel(
    private val playlistId: Long,
    private val seriesId: String,
    private val repository: PlaylistRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SeriesDetailUiState())
    val uiState: StateFlow<SeriesDetailUiState> = _uiState.asStateFlow()

    init {
        loadSeries()
    }

    fun loadSeries() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            try {
                val playlist = repository.getPlaylist(playlistId)
                val info = repository.getSeriesInfo(playlistId, seriesId)
                _uiState.value = SeriesDetailUiState(
                    seriesInfo = info,
                    playlist = playlist,
                    isLoading = false,
                    errorMessage = null
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "Error al cargar la serie."
                )
            }
        }
    }

    fun buildEpisodeUrl(episode: SeriesEpisode): String? {
        val playlist = _uiState.value.playlist ?: return null
        return StreamUrlBuilder.buildEpisodeUrl(playlist, episode.id, episode.containerExtension)
    }

    companion object {
        fun factory(
            playlistId: Long,
            seriesId: String,
            repository: PlaylistRepository
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return SeriesDetailViewModel(playlistId, seriesId, repository) as T
            }
        }
    }
}
