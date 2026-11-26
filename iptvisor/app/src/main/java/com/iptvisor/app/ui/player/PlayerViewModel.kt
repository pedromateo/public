package com.iptvisor.app.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.remote.StreamUrlBuilder
import com.iptvisor.app.data.repository.PlaylistRepository
import com.iptvisor.app.player.PlaybackManager
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class PlayerUiState(
    val title: String = "",
    val localUrl: String = "",
    val castUrl: String = "",
    val isLive: Boolean = true,
    val isFavorite: Boolean = false,
    val isCasting: Boolean = false,
    val errorMessage: String? = null,
    val isLoading: Boolean = true
)

private data class BasePlayerState(
    val title: String = "",
    val localUrl: String = "",
    val castUrl: String = "",
    val isLive: Boolean = true,
    val isFavorite: Boolean = false,
    val loadError: String? = null,
    val isLoading: Boolean = true
)

class PlayerViewModel(
    private val repository: PlaylistRepository,
    val playbackManager: PlaybackManager
) : ViewModel() {

    private val baseState = MutableStateFlow(BasePlayerState())

    private var currentPlaylist: PlaylistEntity? = null
    private var currentStream: StreamEntity? = null
    private var lastPlaylistId: Long? = null
    private var lastStreamId: Long? = null
    private var loadJob: Job? = null
    private var favoriteJob: Job? = null

    val uiState: StateFlow<PlayerUiState> = combine(
        baseState,
        playbackManager.isCastingFlow,
        playbackManager.isBufferingFlow,
        playbackManager.errorFlow
    ) { base, isCasting, isBuffering, playerError ->
        val error = base.loadError ?: playerError
        PlayerUiState(
            title = base.title,
            localUrl = base.localUrl,
            castUrl = base.castUrl,
            isLive = base.isLive,
            isFavorite = base.isFavorite,
            isCasting = isCasting,
            errorMessage = error,
            isLoading = base.isLoading || (isBuffering && error == null)
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = PlayerUiState()
    )

    fun loadStream(playlistId: Long, streamId: Long) {
        lastPlaylistId = playlistId
        lastStreamId = streamId
        loadJob?.cancel()
        favoriteJob?.cancel()

        loadJob = viewModelScope.launch {
            baseState.value = BasePlayerState(isLoading = true)
            try {
                val playlist = repository.getPlaylist(playlistId)
                val stream = repository.getStreamById(streamId)
                if (playlist == null || stream == null) {
                    baseState.value = BasePlayerState(
                        loadError = "No se encontró el canal o la lista.",
                        isLoading = false
                    )
                    return@launch
                }

                currentPlaylist = playlist
                currentStream = stream

                val localUrl = StreamUrlBuilder.buildLocalUrl(playlist, stream)
                val castUrl = StreamUrlBuilder.buildCastUrl(playlist, stream)
                val isLive = stream.type == ContentType.LIVE

                baseState.value = BasePlayerState(
                    title = stream.name,
                    localUrl = localUrl,
                    castUrl = castUrl,
                    isLive = isLive,
                    isFavorite = false,
                    loadError = null,
                    isLoading = false
                )

                favoriteJob = launch {
                    repository.isFavorite(playlistId, stream.stableKey).collect { fav ->
                        baseState.value = baseState.value.copy(isFavorite = fav)
                    }
                }

                playbackManager.play(
                    localUrl = localUrl,
                    castUrl = castUrl,
                    title = stream.name,
                    userAgent = playlist.userAgent,
                    isLive = isLive
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                baseState.value = BasePlayerState(
                    loadError = e.message ?: "Error al cargar la reproducción.",
                    isLoading = false
                )
            }
        }
    }

    fun loadDirectUrl(playlistId: Long, title: String, url: String, isLive: Boolean) {
        lastPlaylistId = playlistId
        lastStreamId = null
        currentStream = null
        loadJob?.cancel()
        favoriteJob?.cancel()

        loadJob = viewModelScope.launch {
            baseState.value = BasePlayerState(title = title, isLoading = true)
            try {
                val playlist = repository.getPlaylist(playlistId)
                currentPlaylist = playlist
                val userAgent = playlist?.userAgent.orEmpty()

                baseState.value = BasePlayerState(
                    title = title,
                    localUrl = url,
                    castUrl = url,
                    isLive = isLive,
                    isFavorite = false,
                    loadError = null,
                    isLoading = false
                )

                playbackManager.play(
                    localUrl = url,
                    castUrl = url,
                    title = title,
                    userAgent = userAgent,
                    isLive = isLive
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                baseState.value = BasePlayerState(
                    title = title,
                    loadError = e.message ?: "Error al cargar la reproducción.",
                    isLoading = false
                )
            }
        }
    }

    fun toggleFavorite() {
        val stream = currentStream ?: return
        viewModelScope.launch {
            runCatching { repository.toggleFavorite(stream) }
        }
    }

    fun retry() {
        val playlistId = lastPlaylistId
        val streamId = lastStreamId
        if (currentStream == null && playlistId != null && streamId != null) {
            loadStream(playlistId, streamId)
        } else {
            playbackManager.retryLast()
        }
    }

    companion object {
        fun factory(
            repository: PlaylistRepository,
            playbackManager: PlaybackManager
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return PlayerViewModel(repository, playbackManager) as T
            }
        }
    }
}
