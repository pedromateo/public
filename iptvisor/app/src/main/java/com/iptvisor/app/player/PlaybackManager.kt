package com.iptvisor.app.player

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.cast.CastPlayer
import androidx.media3.cast.SessionAvailabilityListener
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import com.google.android.gms.cast.framework.CastContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Coordinates local [ExoPlayer] and remote [CastPlayer] playback,
 * including automatic transient-error retries and track selection.
 */
@OptIn(UnstableApi::class)
class PlaybackManager(private val context: Context) {

    companion object {
        private const val MAX_RETRIES = 3
        private const val DEFAULT_USER_AGENT = "IPTVisor/1.0"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private var exoPlayer: ExoPlayer? = null
    private var castPlayer: CastPlayer? = null
    private var currentExoUserAgent: String? = null

    private var retryCount = 0
    private var retryJob: Job? = null

    private var lastLocalUrl: String? = null
    private var lastCastUrl: String? = null
    private var lastTitle: String = ""
    private var lastUserAgent: String = DEFAULT_USER_AGENT
    private var lastIsLive: Boolean = true

    private val _activePlayerFlow = MutableStateFlow<Player?>(null)
    val activePlayerFlow: StateFlow<Player?> = _activePlayerFlow.asStateFlow()

    private val _isCastingFlow = MutableStateFlow(false)
    val isCastingFlow: StateFlow<Boolean> = _isCastingFlow.asStateFlow()

    private val _isPlayingFlow = MutableStateFlow(false)
    val isPlayingFlow: StateFlow<Boolean> = _isPlayingFlow.asStateFlow()

    private val _isBufferingFlow = MutableStateFlow(false)
    val isBufferingFlow: StateFlow<Boolean> = _isBufferingFlow.asStateFlow()

    private val _errorFlow = MutableStateFlow<String?>(null)
    val errorFlow: StateFlow<String?> = _errorFlow.asStateFlow()

    private val playerListener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            _isPlayingFlow.value = isPlaying
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            _isBufferingFlow.value = playbackState == Player.STATE_BUFFERING
            if (playbackState == Player.STATE_READY) {
                retryCount = 0
                _errorFlow.value = null
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            if (retryCount < MAX_RETRIES) {
                retryCount++
                val delayMs = 1500L * retryCount
                retryJob?.cancel()
                retryJob = scope.launch {
                    delay(delayMs)
                    _activePlayerFlow.value?.let { player ->
                        player.prepare()
                        player.play()
                    }
                }
            } else {
                _isBufferingFlow.value = false
                _errorFlow.value = error.localizedMessage ?: "Playback failed (${error.errorCodeName})"
            }
        }
    }

    init {
        initCastPlayer()
    }

    private fun initCastPlayer() {
        val castContext = runCatching { CastContext.getSharedInstance(context) }.getOrNull() ?: return
        val player = runCatching { CastPlayer(castContext) }.getOrNull() ?: return
        player.addListener(playerListener)
        player.setSessionAvailabilityListener(object : SessionAvailabilityListener {
            override fun onCastSessionAvailable() {
                switchToCast()
            }

            override fun onCastSessionUnavailable() {
                switchToLocal()
            }
        })
        castPlayer = player
        if (player.isCastSessionAvailable) {
            _isCastingFlow.value = true
            _activePlayerFlow.value = player
        }
    }

    private fun getOrCreateExoPlayer(userAgent: String): ExoPlayer {
        val resolvedUa = userAgent.ifBlank { DEFAULT_USER_AGENT }
        val existing = exoPlayer
        if (existing != null && currentExoUserAgent == resolvedUa) {
            return existing
        }

        existing?.let {
            it.removeListener(playerListener)
            it.release()
        }

        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent(resolvedUa)
            .setAllowCrossProtocolRedirects(true)

        val player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(httpDataSourceFactory))
            .build()
        player.addListener(playerListener)
        exoPlayer = player
        currentExoUserAgent = resolvedUa
        return player
    }

    fun play(
        localUrl: String,
        castUrl: String,
        title: String,
        userAgent: String,
        isLive: Boolean
    ) {
        lastLocalUrl = localUrl
        lastCastUrl = castUrl
        lastTitle = title
        lastUserAgent = userAgent
        lastIsLive = isLive

        retryCount = 0
        retryJob?.cancel()
        _errorFlow.value = null
        _isBufferingFlow.value = true

        val cast = castPlayer
        if (cast != null && cast.isCastSessionAvailable) {
            exoPlayer?.pause()
            _isCastingFlow.value = true
            _activePlayerFlow.value = cast
            val mediaItem = buildMediaItem(
                url = castUrl,
                title = title,
                forceHlsMime = isLive && castUrl.substringBefore('?').endsWith(".m3u8", ignoreCase = true)
            )
            cast.setMediaItem(mediaItem)
            cast.prepare()
            cast.play()
        } else {
            val local = getOrCreateExoPlayer(userAgent)
            _isCastingFlow.value = false
            _activePlayerFlow.value = local
            val mediaItem = buildMediaItem(
                url = localUrl,
                title = title,
                forceHlsMime = isLive && localUrl.substringBefore('?').endsWith(".m3u8", ignoreCase = true)
            )
            local.setMediaItem(mediaItem)
            local.prepare()
            local.play()
        }
    }

    fun retryLast() {
        val localUrl = lastLocalUrl ?: return
        val castUrl = lastCastUrl ?: localUrl
        play(
            localUrl = localUrl,
            castUrl = castUrl,
            title = lastTitle,
            userAgent = lastUserAgent,
            isLive = lastIsLive
        )
    }

    fun togglePlayPause() {
        val player = _activePlayerFlow.value ?: return
        if (player.isPlaying) {
            player.pause()
        } else {
            player.play()
        }
    }

    private fun switchToCast() {
        val cast = castPlayer ?: return
        exoPlayer?.pause()
        _isCastingFlow.value = true
        _activePlayerFlow.value = cast
        val castUrl = lastCastUrl ?: return
        val mediaItem = buildMediaItem(
            url = castUrl,
            title = lastTitle,
            forceHlsMime = lastIsLive && castUrl.substringBefore('?').endsWith(".m3u8", ignoreCase = true)
        )
        cast.setMediaItem(mediaItem)
        cast.prepare()
        cast.play()
    }

    private fun switchToLocal() {
        _isCastingFlow.value = false
        val localUrl = lastLocalUrl
        if (localUrl != null) {
            val local = getOrCreateExoPlayer(lastUserAgent)
            _activePlayerFlow.value = local
            val mediaItem = buildMediaItem(
                url = localUrl,
                title = lastTitle,
                forceHlsMime = lastIsLive && localUrl.substringBefore('?').endsWith(".m3u8", ignoreCase = true)
            )
            local.setMediaItem(mediaItem)
            local.prepare()
            local.play()
        } else {
            _activePlayerFlow.value = exoPlayer
        }
    }

    private fun buildMediaItem(
        url: String,
        title: String,
        forceHlsMime: Boolean
    ): MediaItem {
        val builder = MediaItem.Builder()
            .setUri(url)
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setTitle(title)
                    .build()
            )
        if (forceHlsMime) {
            builder.setMimeType(MimeTypes.APPLICATION_M3U8)
        }
        return builder.build()
    }

    fun getTrackGroups(): Tracks? {
        return _activePlayerFlow.value?.currentTracks
    }

    fun selectAudioTrack(groupIndex: Int) {
        val player = _activePlayerFlow.value ?: return
        val group = player.currentTracks.groups.getOrNull(groupIndex) ?: return
        player.trackSelectionParameters = player.trackSelectionParameters
            .buildUpon()
            .setTrackTypeDisabled(C.TRACK_TYPE_AUDIO, false)
            .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, 0))
            .build()
    }

    fun selectSubtitleTrack(groupIndex: Int) {
        val player = _activePlayerFlow.value ?: return
        val group = player.currentTracks.groups.getOrNull(groupIndex) ?: return
        player.trackSelectionParameters = player.trackSelectionParameters
            .buildUpon()
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
            .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, 0))
            .build()
    }

    fun disableSubtitles() {
        val player = _activePlayerFlow.value ?: return
        player.trackSelectionParameters = player.trackSelectionParameters
            .buildUpon()
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
            .clearOverridesOfType(C.TRACK_TYPE_TEXT)
            .build()
    }

    fun release() {
        retryJob?.cancel()
        scope.cancel()
        exoPlayer?.let {
            it.removeListener(playerListener)
            it.release()
        }
        exoPlayer = null
        castPlayer?.let {
            it.removeListener(playerListener)
            it.setSessionAvailabilityListener(null)
            it.release()
        }
        castPlayer = null
        _activePlayerFlow.value = null
        _isCastingFlow.value = false
        _isPlayingFlow.value = false
        _isBufferingFlow.value = false
    }
}
