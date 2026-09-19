package com.swipeclean.ui.screens.swipe.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import com.swipeclean.data.model.PhotoItem
import com.swipeclean.domain.model.SwipeDirection
import com.swipeclean.ui.screens.swipe.SwipeUiState
import kotlinx.coroutines.launch
import kotlin.math.abs

@Composable
fun SwipeDeck(
    uiState: SwipeUiState,
    onSwipeCompleted: (PhotoItem, SwipeDirection) -> Unit,
    onUndoAnimationFinished: () -> Unit,
    onSetAnimating: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val currentPhoto = uiState.currentPhoto
    val nextPhoto = uiState.nextPhoto
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current

    BoxWithConstraints(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        val screenWidthPx = constraints.maxWidth.toFloat()
        val swipeThreshold = screenWidthPx * 0.35f

        // 1. Tarjeta de fondo (preparada con escala previa para rendimiento)
        if (nextPhoto != null) {
            val backgroundScale = 0.94f
            SwipeCard(
                photo = nextPhoto,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 24.dp)
                    .scale(backgroundScale)
            )
        }

        // 2. Tarjeta activa superior
        if (currentPhoto != null) {
            val offsetX = remember(currentPhoto.id) { Animatable(0f) }
            val offsetY = remember(currentPhoto.id) { Animatable(0f) }

            // Manejo de la Animación Espacial Inversa (Undo)
            val isRestoring = uiState.undoingAction?.photo?.id == currentPhoto.id
            LaunchedEffect(currentPhoto.id, isRestoring) {
                if (isRestoring && uiState.undoingAction != null) {
                    val initialOffset = if (uiState.undoingAction.direction == SwipeDirection.LEFT) {
                        -screenWidthPx * 1.2f
                    } else {
                        screenWidthPx * 1.2f
                    }
                    offsetX.snapTo(initialOffset)
                    offsetY.snapTo(0f)

                    offsetX.animateTo(
                        targetValue = 0f,
                        animationSpec = spring(
                            dampingRatio = Spring.DampingRatioMediumBouncy,
                            stiffness = Spring.StiffnessMediumLow
                        )
                    )
                    onUndoAnimationFinished()
                }
            }

            val swipeProgress = (offsetX.value / swipeThreshold).coerceIn(-1f, 1f)
            val rotationDegree = (offsetX.value / screenWidthPx) * 16f

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 24.dp)
                    .graphicsLayer {
                        translationX = offsetX.value
                        translationY = offsetY.value
                        rotationZ = rotationDegree
                    }
                    .pointerInput(currentPhoto.id, uiState.isAnimating) {
                        if (uiState.isAnimating) return@pointerInput

                        detectDragGestures(
                            onDrag = { change, dragAmount ->
                                change.consume()
                                scope.launch {
                                    offsetX.snapTo(offsetX.value + dragAmount.x)
                                    offsetY.snapTo(offsetY.value + dragAmount.y * 0.3f)
                                }
                            },
                            onDragEnd = {
                                scope.launch {
                                    val currentX = offsetX.value
                                    if (abs(currentX) > swipeThreshold) {
                                        onSetAnimating(true)
                                        val direction = if (currentX > 0) SwipeDirection.RIGHT else SwipeDirection.LEFT
                                        val targetX = if (direction == SwipeDirection.RIGHT) screenWidthPx * 1.3f else -screenWidthPx * 1.3f

                                        offsetX.animateTo(
                                            targetValue = targetX,
                                            animationSpec = tween(durationMillis = 200)
                                        )
                                        onSwipeCompleted(currentPhoto, direction)
                                    } else {
                                        // Vuelve al centro
                                        offsetX.animateTo(
                                            targetValue = 0f,
                                            animationSpec = spring(
                                                dampingRatio = Spring.DampingRatioMediumBouncy,
                                                stiffness = Spring.StiffnessMedium
                                            )
                                        )
                                        offsetY.animateTo(0f, spring())
                                    }
                                }
                            }
                        )
                    }
            ) {
                SwipeCard(
                    photo = currentPhoto,
                    swipeProgress = swipeProgress
                )
            }
        }
    }
}
