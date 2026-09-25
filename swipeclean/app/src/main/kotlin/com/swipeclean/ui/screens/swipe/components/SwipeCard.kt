package com.swipeclean.ui.screens.swipe.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AspectRatio
import androidx.compose.material.icons.filled.Crop
import androidx.compose.material.icons.filled.ZoomIn
import androidx.compose.material.icons.filled.ZoomOut
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import coil.request.ImageRequest
import com.swipeclean.R
import com.swipeclean.core.theme.DarkSurface
import com.swipeclean.core.theme.PrimaryBlue
import com.swipeclean.core.theme.TextPrimary
import com.swipeclean.core.theme.TextSecondary
import com.swipeclean.core.utils.FileSizeFormatter
import com.swipeclean.data.model.PhotoItem
import com.swipeclean.domain.model.SwipeDirection
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun SwipeCard(
    photo: PhotoItem,
    modifier: Modifier = Modifier,
    swipeProgress: Float = 0f, // -1f (left/trash) a +1f (right/keep)
    isZoomed: Boolean = false,
    onZoomStateChanged: (Boolean) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    val painter = rememberAsyncImagePainter(
        model = ImageRequest.Builder(context)
            .data(photo.uri)
            .crossfade(true)
            .build()
    )

    val intrinsicSize = painter.intrinsicSize
    val hasIntrinsic = !intrinsicSize.width.isNaN() && intrinsicSize.width > 0f && !intrinsicSize.height.isNaN() && intrinsicSize.height > 0f
    val imageAspectRatio = when {
        hasIntrinsic -> intrinsicSize.width / intrinsicSize.height
        photo.width > 0 && photo.height > 0 -> photo.width.toFloat() / photo.height.toFloat()
        else -> 1f
    }
    val isLandscape = imageAspectRatio > 1.05f

    // Para fotos apaisadas: por defecto se muestra ~60% del ancho (20% recortado a cada lado).
    // Factor de escala relativo a ContentScale.Fit = 1 / 0.60 = 1.667f
    val defaultScale = if (isLandscape) 1.667f else 1.0f
    val minScale = 1.0f
    val maxScale = 5.0f

    val scaleAnim = remember(photo.id) { Animatable(defaultScale) }
    val panXAnim = remember(photo.id) { Animatable(0f) }
    val panYAnim = remember(photo.id) { Animatable(0f) }

    val infoAlpha by animateFloatAsState(
        targetValue = if (!isZoomed) 1f else 0f,
        animationSpec = tween(durationMillis = 200),
        label = "infoAlpha"
    )

    val controlsAlpha by animateFloatAsState(
        targetValue = if (swipeProgress == 0f) 1f else 0f,
        animationSpec = tween(durationMillis = 150),
        label = "controlsAlpha"
    )

    LaunchedEffect(defaultScale) {
        if (!isZoomed && abs(scaleAnim.value - defaultScale) > 0.05f) {
            scaleAnim.snapTo(defaultScale)
        }
    }

    Card(
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        modifier = modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(24.dp))
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val containerWidthPx = constraints.maxWidth.toFloat()
            val containerHeightPx = constraints.maxHeight.toFloat()

            fun calculateMaxPanX(scale: Float): Float {
                val renderedWidth = if (isLandscape) {
                    containerWidthPx * scale
                } else {
                    maxOf(containerWidthPx, containerHeightPx * imageAspectRatio) * scale
                }
                return ((renderedWidth - containerWidthPx) / 2f).coerceAtLeast(0f)
            }

            fun calculateMaxPanY(scale: Float): Float {
                val renderedHeight = if (isLandscape) {
                    (containerWidthPx / imageAspectRatio) * scale
                } else {
                    maxOf(containerHeightPx, containerWidthPx / imageAspectRatio) * scale
                }
                return ((renderedHeight - containerHeightPx) / 2f).coerceAtLeast(0f)
            }

            val cardInteractionModifier = if (swipeProgress == 0f) {
                Modifier
                    .pointerInput(photo.id, isZoomed, defaultScale) {
                        if (isZoomed) {
                            detectTransformGestures(panZoomLock = false) { _, pan, zoom, _ ->
                                coroutineScope.launch {
                                    val newScale = (scaleAnim.value * zoom).coerceIn(minScale, maxScale)
                                    scaleAnim.snapTo(newScale)

                                    val maxPanX = calculateMaxPanX(newScale)
                                    val maxPanY = calculateMaxPanY(newScale)

                                    panXAnim.snapTo((panXAnim.value + pan.x).coerceIn(-maxPanX, maxPanX))
                                    panYAnim.snapTo((panYAnim.value + pan.y).coerceIn(-maxPanY, maxPanY))

                                    val atDefault = abs(newScale - defaultScale) < 0.05f &&
                                            abs(panXAnim.value) < 5f &&
                                            abs(panYAnim.value) < 5f
                                    if (atDefault) {
                                        onZoomStateChanged(false)
                                    }
                                }
                            }
                        } else {
                            awaitEachGesture {
                                val down = awaitFirstDown(requireUnconsumed = false)
                                do {
                                    val event = awaitPointerEvent()
                                    val activePointers = event.changes.filter { it.pressed }
                                    if (activePointers.size >= 2) {
                                        activePointers.forEach { it.consume() }
                                        onZoomStateChanged(true)
                                        break
                                    }
                                } while (event.changes.any { it.pressed })
                            }
                        }
                    }
                    .pointerInput(photo.id, isZoomed, defaultScale) {
                        detectTapGestures(
                            onDoubleTap = { tapOffset ->
                                coroutineScope.launch {
                                    val isCurrentlyZoomed = isZoomed || abs(scaleAnim.value - defaultScale) > 0.05f
                                    if (isCurrentlyZoomed) {
                                        launch {
                                            scaleAnim.animateTo(
                                                defaultScale,
                                                spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                            )
                                        }
                                        launch {
                                            panXAnim.animateTo(
                                                0f,
                                                spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                            )
                                        }
                                        launch {
                                            panYAnim.animateTo(
                                                0f,
                                                spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                            )
                                        }
                                        onZoomStateChanged(false)
                                    } else {
                                        val targetScale = if (isLandscape) 3.0f else 2.5f
                                        val maxPanX = calculateMaxPanX(targetScale)
                                        val maxPanY = calculateMaxPanY(targetScale)

                                        val targetPanX = ((containerWidthPx / 2f - tapOffset.x) * 1.5f).coerceIn(-maxPanX, maxPanX)
                                        val targetPanY = ((containerHeightPx / 2f - tapOffset.y) * 1.5f).coerceIn(-maxPanY, maxPanY)

                                        launch {
                                            scaleAnim.animateTo(
                                                targetScale,
                                                spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                            )
                                        }
                                        launch {
                                            panXAnim.animateTo(
                                                targetPanX,
                                                spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                            )
                                        }
                                        launch {
                                            panYAnim.animateTo(
                                                targetPanY,
                                                spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                            )
                                        }
                                        onZoomStateChanged(true)
                                    }
                                }
                            }
                        )
                    }
            } else {
                Modifier
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .then(cardInteractionModifier)
                    .clipToBounds()
            ) {
                // Imagen con zoom y desplazamiento aplicados
                Image(
                    painter = painter,
                    contentDescription = photo.name,
                    contentScale = if (isLandscape) ContentScale.Fit else ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = scaleAnim.value
                            scaleY = scaleAnim.value
                            translationX = panXAnim.value
                            translationY = panYAnim.value
                        }
                )

                // Gradiente inferior y metadatos (se ocultan suavemente cuando el usuario amplía la foto)
                if (infoAlpha > 0f) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.BottomCenter)
                            .graphicsLayer { alpha = infoAlpha }
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp)
                                .align(Alignment.BottomCenter)
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                                    )
                                )
                        )

                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(20.dp)
                        ) {
                            Text(
                                text = photo.name,
                                color = TextPrimary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = FileSizeFormatter.formatBytes(photo.sizeBytes),
                                    color = TextSecondary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                if (photo.bucketName != null) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "•  ${photo.bucketName}",
                                        color = TextSecondary,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // Barra superior de controles de visualización y zoom
                if (controlsAlpha > 0f) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.TopCenter)
                            .padding(top = 16.dp, start = 16.dp, end = 16.dp)
                            .graphicsLayer { alpha = controlsAlpha },
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (isLandscape) {
                            val isFullView = abs(scaleAnim.value - 1.0f) < 0.05f
                            Surface(
                                color = Color.Black.copy(alpha = 0.65f),
                                shape = RoundedCornerShape(20.dp),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.25f)),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .clickable {
                                        coroutineScope.launch {
                                            val target = if (isFullView) defaultScale else 1.0f
                                            launch {
                                                scaleAnim.animateTo(
                                                    target,
                                                    spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                                )
                                            }
                                            launch {
                                                panXAnim.animateTo(
                                                    0f,
                                                    spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                                )
                                            }
                                            launch {
                                                panYAnim.animateTo(
                                                    0f,
                                                    spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                                )
                                            }
                                            onZoomStateChanged(target != defaultScale)
                                        }
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = if (isFullView) Icons.Default.Crop else Icons.Default.AspectRatio,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = if (isFullView) {
                                            stringResource(R.string.fit_photo_20)
                                        } else {
                                            stringResource(R.string.see_full_photo)
                                        },
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        } else {
                            Spacer(modifier = Modifier.width(1.dp))
                        }

                        // Botón de zoom rápido / restablecer
                        val isZoomActive = isZoomed || abs(scaleAnim.value - defaultScale) > 0.05f
                        Surface(
                            color = if (isZoomActive) PrimaryBlue.copy(alpha = 0.85f) else Color.Black.copy(alpha = 0.65f),
                            shape = RoundedCornerShape(20.dp),
                            border = BorderStroke(1.dp, if (isZoomActive) PrimaryBlue else Color.White.copy(alpha = 0.25f)),
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .clickable {
                                    coroutineScope.launch {
                                        if (isZoomActive) {
                                            launch {
                                                scaleAnim.animateTo(
                                                    defaultScale,
                                                    spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                                )
                                            }
                                            launch {
                                                panXAnim.animateTo(
                                                    0f,
                                                    spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                                )
                                            }
                                            launch {
                                                panYAnim.animateTo(
                                                    0f,
                                                    spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                                )
                                            }
                                            onZoomStateChanged(false)
                                        } else {
                                            val target = if (isLandscape) 3.0f else 2.5f
                                            launch {
                                                scaleAnim.animateTo(
                                                    target,
                                                    spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                                                )
                                            }
                                            onZoomStateChanged(true)
                                        }
                                    }
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = if (isZoomActive) Icons.Default.ZoomOut else Icons.Default.ZoomIn,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (isZoomActive) {
                                        "${(scaleAnim.value * 10).roundToInt() / 10f}x • ${stringResource(R.string.reset_zoom)}"
                                    } else {
                                        stringResource(R.string.zoom_in)
                                    },
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }

                // Sellos de feedback visual según arrastre (KEEP / TRASH)
                if (swipeProgress < 0f) {
                    CardOverlay(
                        direction = SwipeDirection.LEFT,
                        alpha = (-swipeProgress).coerceIn(0f, 1f),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(24.dp)
                    )
                } else if (swipeProgress > 0f) {
                    CardOverlay(
                        direction = SwipeDirection.RIGHT,
                        alpha = swipeProgress.coerceIn(0f, 1f),
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(24.dp)
                    )
                }
            }
        }
    }
}
