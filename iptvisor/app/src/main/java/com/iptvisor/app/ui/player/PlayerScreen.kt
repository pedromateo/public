package com.iptvisor.app.ui.player

import android.app.PictureInPictureParams
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.util.Rational
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.CastConnected
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PictureInPictureAlt
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.app.PictureInPictureModeChangedInfo
import androidx.core.util.Consumer
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.C
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import androidx.mediarouter.app.MediaRouteButton
import com.google.android.gms.cast.framework.CastButtonFactory
import com.iptvisor.app.IPTVisorApp
import com.iptvisor.app.player.PlaybackManager
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
    playlistId: Long,
    streamId: Long?,
    directTitle: String? = null,
    directUrl: String? = null,
    directIsLive: Boolean = false,
    favoriteStableKey: String? = null,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as IPTVisorApp
    val container = app.container
    val playbackManager = container.playbackManager

    val viewModel: PlayerViewModel = viewModel(
        factory = PlayerViewModel.factory(container.repository, playbackManager)
    )

    val uiState by viewModel.uiState.collectAsState()
    val activePlayer by playbackManager.activePlayerFlow.collectAsState()
    val isPlaying by playbackManager.isPlayingFlow.collectAsState()

    var controlsVisible by remember { mutableStateOf(true) }
    var showTracksDialog by remember { mutableStateOf(false) }

    val activity = remember(context) { context.findComponentActivity() }
    var isInPipMode by remember {
        mutableStateOf(
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                activity?.isInPictureInPictureMode == true
        )
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && activity != null) {
        DisposableEffect(activity) {
            val listener = Consumer<PictureInPictureModeChangedInfo> { info ->
                isInPipMode = info.isInPictureInPictureMode
            }
            activity.addOnPictureInPictureModeChangedListener(listener)
            onDispose {
                activity.removeOnPictureInPictureModeChangedListener(listener)
            }
        }
    }

    LaunchedEffect(playlistId, streamId, directUrl, favoriteStableKey) {
        if (streamId != null) {
            viewModel.loadStream(playlistId, streamId)
        } else if (favoriteStableKey != null) {
            viewModel.loadFavorite(playlistId, favoriteStableKey)
        } else if (directUrl != null) {
            viewModel.loadDirectUrl(
                playlistId = playlistId,
                title = directTitle.orEmpty(),
                url = directUrl,
                isLive = directIsLive
            )
        }
    }

    DisposableEffect(activity) {
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            activity?.window?.let { window ->
                WindowCompat.getInsetsController(window, window.decorView)
                    .show(WindowInsetsCompat.Type.systemBars())
            }
            playbackManager.release()
        }
    }

    LaunchedEffect(activity, isInPipMode) {
        if (activity != null && !isInPipMode) {
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        }
    }

    LaunchedEffect(controlsVisible, isPlaying) {
        if (controlsVisible && isPlaying) {
            delay(4_000)
            controlsVisible = false
        }
    }

    var currentPositionMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }

    LaunchedEffect(activePlayer, controlsVisible, uiState.isLive) {
        while (controlsVisible && !uiState.isLive && activePlayer != null) {
            val p = activePlayer
            if (p != null) {
                currentPositionMs = p.currentPosition.coerceAtLeast(0L)
                durationMs = p.duration.takeIf { it != C.TIME_UNSET && it > 0L } ?: 0L
            }
            delay(500)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                if (!isInPipMode) {
                    controlsVisible = !controlsVisible
                }
            }
    ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = false
                    keepScreenOn = true
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                }
            },
            update = { playerView ->
                playerView.player = activePlayer
            },
            modifier = Modifier.fillMaxSize()
        )

        if (uiState.isCasting && !isInPipMode) {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Filled.CastConnected,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.85f),
                    modifier = Modifier.size(56.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Transmitiendo a Chromecast",
                    color = Color.White.copy(alpha = 0.9f),
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }

        if (!isInPipMode) {
            AnimatedVisibility(
                visible = controlsVisible,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.align(Alignment.TopCenter)
            ) {
                PlayerTopBar(
                    title = uiState.title,
                    showFavorite = streamId != null,
                    isFavorite = uiState.isFavorite,
                    canExternalPlay = uiState.localUrl.isNotBlank(),
                    canPip = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && activity != null,
                    onBack = onBack,
                    onToggleFavorite = viewModel::toggleFavorite,
                    onOpenTracks = { showTracksDialog = true },
                    onEnterPip = {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && activity != null) {
                            val params = PictureInPictureParams.Builder()
                                .setAspectRatio(Rational(16, 9))
                                .build()
                            runCatching { activity.enterPictureInPictureMode(params) }
                        }
                    },
                    onExternalPlayer = {
                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(Uri.parse(uiState.localUrl), "video/*")
                        }
                        runCatching {
                            context.startActivity(
                                Intent.createChooser(intent, "Abrir con reproductor externo")
                            )
                        }
                    }
                )
            }

            if (uiState.errorMessage != null) {
                ErrorBanner(
                    message = uiState.errorMessage.orEmpty(),
                    onRetry = viewModel::retry,
                    modifier = Modifier.align(Alignment.Center)
                )
            } else if (uiState.isLoading) {
                CircularProgressIndicator(
                    color = Color.White,
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                AnimatedVisibility(
                    visible = controlsVisible,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier.align(Alignment.Center)
                ) {
                    IconButton(
                        onClick = { playbackManager.togglePlayPause() },
                        modifier = Modifier
                            .size(68.dp)
                            .background(Color.Black.copy(alpha = 0.55f), CircleShape)
                    ) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = if (isPlaying) "Pausar" else "Reproducir",
                            tint = Color.White,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                }
            }

            if (!uiState.isLive && durationMs > 0L) {
                AnimatedVisibility(
                    visible = controlsVisible,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier.align(Alignment.BottomCenter)
                ) {
                    VodSeekBar(
                        positionMs = currentPositionMs,
                        durationMs = durationMs,
                        onSeek = { targetMs ->
                            activePlayer?.seekTo(targetMs)
                            currentPositionMs = targetMs
                        }
                    )
                }
            }
        }
    }

    if (showTracksDialog) {
        TrackSelectionDialog(
            tracks = playbackManager.getTrackGroups(),
            onSelectAudio = { groupIndex ->
                playbackManager.selectAudioTrack(groupIndex)
                showTracksDialog = false
            },
            onSelectSubtitle = { groupIndex ->
                playbackManager.selectSubtitleTrack(groupIndex)
                showTracksDialog = false
            },
            onDisableSubtitles = {
                playbackManager.disableSubtitles()
                showTracksDialog = false
            },
            onDismiss = { showTracksDialog = false }
        )
    }
}

@Composable
private fun PlayerTopBar(
    title: String,
    showFavorite: Boolean,
    isFavorite: Boolean,
    canExternalPlay: Boolean,
    canPip: Boolean,
    onBack: () -> Unit,
    onToggleFavorite: () -> Unit,
    onOpenTracks: () -> Unit,
    onEnterPip: () -> Unit,
    onExternalPlayer: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color.Black.copy(alpha = 0.78f), Color.Transparent)
                )
            )
            .statusBarsPadding()
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Volver",
                tint = Color.White
            )
        }

        Text(
            text = title,
            color = Color.White,
            style = MaterialTheme.typography.titleMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 8.dp)
        )

        if (showFavorite) {
            IconButton(onClick = onToggleFavorite) {
                Icon(
                    imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                    contentDescription = "Favorito",
                    tint = if (isFavorite) Color(0xFFFF5252) else Color.White
                )
            }
        }

        AndroidView(
            factory = { ctx ->
                MediaRouteButton(ctx).apply {
                    runCatching { CastButtonFactory.setUpMediaRouteButton(ctx, this) }
                }
            },
            modifier = Modifier.size(48.dp)
        )

        IconButton(onClick = onOpenTracks) {
            Icon(
                imageVector = Icons.Filled.Subtitles,
                contentDescription = "Pistas de audio y subtítulos",
                tint = Color.White
            )
        }

        if (canPip) {
            IconButton(onClick = onEnterPip) {
                Icon(
                    imageVector = Icons.Filled.PictureInPictureAlt,
                    contentDescription = "Picture-in-Picture",
                    tint = Color.White
                )
            }
        }

        if (canExternalPlay) {
            IconButton(onClick = onExternalPlayer) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.OpenInNew,
                    contentDescription = "Reproductor externo",
                    tint = Color.White
                )
            }
        }
    }
}

@Composable
private fun ErrorBanner(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .padding(24.dp)
            .background(Color.Black.copy(alpha = 0.8f), RoundedCornerShape(12.dp))
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = message,
            color = Color.White,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(onClick = onRetry) {
            Icon(
                imageVector = Icons.Filled.Refresh,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Reintentar")
        }
    }
}

@Composable
private fun VodSeekBar(
    positionMs: Long,
    durationMs: Long,
    onSeek: (Long) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.78f))
                )
            )
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Slider(
            value = positionMs.toFloat().coerceIn(0f, durationMs.toFloat()),
            onValueChange = { onSeek(it.toLong()) },
            valueRange = 0f..durationMs.toFloat()
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = formatTimeMs(positionMs),
                color = Color.White,
                style = MaterialTheme.typography.labelSmall
            )
            Text(
                text = formatTimeMs(durationMs),
                color = Color.White,
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

@OptIn(UnstableApi::class)
@Composable
private fun TrackSelectionDialog(
    tracks: Tracks?,
    onSelectAudio: (Int) -> Unit,
    onSelectSubtitle: (Int) -> Unit,
    onDisableSubtitles: () -> Unit,
    onDismiss: () -> Unit
) {
    val audioGroups = remember(tracks) {
        tracks?.groups?.mapIndexedNotNull { index, group ->
            if (group.type == C.TRACK_TYPE_AUDIO) index to group else null
        }.orEmpty()
    }
    val textGroups = remember(tracks) {
        tracks?.groups?.mapIndexedNotNull { index, group ->
            if (group.type == C.TRACK_TYPE_TEXT) index to group else null
        }.orEmpty()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Audio y Subtítulos") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "Audio",
                    style = MaterialTheme.typography.titleSmall
                )
                Spacer(modifier = Modifier.height(4.dp))
                if (audioGroups.isEmpty()) {
                    Text(
                        text = "No hay pistas de audio disponibles",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    audioGroups.forEachIndexed { pos, (groupIndex, group) ->
                        val label = buildTrackLabel(group, "Audio ${pos + 1}")
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectAudio(groupIndex) }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = group.isSelected,
                                onClick = { onSelectAudio(groupIndex) }
                            )
                            Text(text = label, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Subtítulos",
                    style = MaterialTheme.typography.titleSmall
                )
                Spacer(modifier = Modifier.height(4.dp))
                val anySubtitleSelected = textGroups.any { it.second.isSelected }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onDisableSubtitles() }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = !anySubtitleSelected,
                        onClick = onDisableSubtitles
                    )
                    Text(text = "Desactivados", style = MaterialTheme.typography.bodyMedium)
                }

                textGroups.forEachIndexed { pos, (groupIndex, group) ->
                    val label = buildTrackLabel(group, "Subtítulo ${pos + 1}")
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectSubtitle(groupIndex) }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = group.isSelected,
                            onClick = { onSelectSubtitle(groupIndex) }
                        )
                        Text(text = label, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cerrar")
            }
        }
    )
}

@OptIn(UnstableApi::class)
private fun buildTrackLabel(group: Tracks.Group, fallback: String): String {
    if (group.length == 0) return fallback
    val format = group.getTrackFormat(0)
    val parts = listOfNotNull(
        format.label?.takeIf { it.isNotBlank() },
        format.language?.takeIf { it.isNotBlank() && it != C.LANGUAGE_UNDETERMINED }
    )
    return if (parts.isEmpty()) fallback else parts.joinToString(" - ")
}

private fun formatTimeMs(ms: Long): String {
    val totalSeconds = (ms / 1000L).coerceAtLeast(0L)
    val hours = totalSeconds / 3600L
    val minutes = (totalSeconds % 3600L) / 60L
    val seconds = totalSeconds % 60L
    return if (hours > 0L) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}

private tailrec fun Context.findComponentActivity(): ComponentActivity? = when (this) {
    is ComponentActivity -> this
    is ContextWrapper -> baseContext.findComponentActivity()
    else -> null
}
