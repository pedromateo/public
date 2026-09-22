package com.swipeclean.ui.screens.swipe

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.swipeclean.R
import com.swipeclean.core.theme.CardBorder
import com.swipeclean.core.theme.DarkSurface
import com.swipeclean.core.theme.KeepGreen
import com.swipeclean.core.theme.PrimaryBlue
import com.swipeclean.core.theme.TextPrimary
import com.swipeclean.core.theme.TextSecondary
import com.swipeclean.core.theme.TrashRed
import com.swipeclean.core.utils.FileSizeFormatter
import com.swipeclean.domain.model.SwipeDirection
import com.swipeclean.ui.screens.swipe.components.SwipeDeck
import com.swipeclean.ui.screens.swipe.components.UndoActionBar

@Composable
fun SwipeScreen(
    bucketId: String?,
    bucketName: String?,
    startRandom: Boolean = false,
    viewModel: SwipeViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToSummary: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(bucketId, startRandom) {
        viewModel.loadPhotos(bucketId, startRandom = startRandom)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(top = 36.dp)
    ) {
        // Barra Superior
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onNavigateBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Atrás",
                    tint = TextPrimary
                )
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 8.dp)
            ) {
                Text(
                    text = bucketName ?: stringResource(R.string.all_photos_title),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (uiState.photos.isNotEmpty()) {
                    Text(
                        text = "${uiState.currentIndex.coerceAtMost(uiState.photos.size)} / ${uiState.photos.size}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Botón Aleatorio en Top Bar
                Surface(
                    color = if (uiState.isRandomOrder) PrimaryBlue.copy(alpha = 0.2f) else DarkSurface,
                    border = BorderStroke(1.dp, if (uiState.isRandomOrder) PrimaryBlue else CardBorder),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable {
                            val newMode = !uiState.isRandomOrder
                            viewModel.toggleRandomOrder()
                            Toast.makeText(
                                context,
                                if (newMode) context.getString(R.string.random_mode_toast_on) else context.getString(R.string.random_mode_toast_off),
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                ) {
                    Box(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Shuffle,
                            contentDescription = stringResource(R.string.random_order),
                            tint = if (uiState.isRandomOrder) PrimaryBlue else TextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                // Indicador de megabytes a liberar
                Surface(
                    color = if (uiState.bytesToFree > 0) TrashRed.copy(alpha = 0.2f) else DarkSurface,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = null,
                            tint = if (uiState.bytesToFree > 0) TrashRed else TextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = FileSizeFormatter.formatBytes(uiState.bytesToFree),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (uiState.bytesToFree > 0) TrashRed else TextSecondary
                        )
                    }
                }
            }
        }

        // Botón selector de orden aleatorio destacado
        if (!uiState.isLoading && !uiState.isFinished && uiState.photos.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = if (uiState.isRandomOrder) PrimaryBlue.copy(alpha = 0.15f) else DarkSurface,
                    shape = RoundedCornerShape(20.dp),
                    border = BorderStroke(
                        width = 1.dp,
                        color = if (uiState.isRandomOrder) PrimaryBlue else CardBorder
                    ),
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .clickable {
                            val newMode = !uiState.isRandomOrder
                            viewModel.toggleRandomOrder()
                            Toast.makeText(
                                context,
                                if (newMode) context.getString(R.string.random_mode_toast_on) else context.getString(R.string.random_mode_toast_off),
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Shuffle,
                            contentDescription = stringResource(R.string.random_order),
                            tint = if (uiState.isRandomOrder) PrimaryBlue else TextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (uiState.isRandomOrder) stringResource(R.string.random_mode_active) else stringResource(R.string.show_random),
                            fontSize = 12.sp,
                            fontWeight = if (uiState.isRandomOrder) FontWeight.Bold else FontWeight.Medium,
                            color = if (uiState.isRandomOrder) PrimaryBlue else TextSecondary
                        )
                        if (uiState.isRandomOrder) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable {
                                        viewModel.reshuffleRemaining()
                                        Toast.makeText(
                                            context,
                                            context.getString(R.string.photos_reshuffled),
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                    .padding(2.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = stringResource(R.string.reshuffle),
                                    tint = PrimaryBlue,
                                    modifier = Modifier.size(15.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Contenido Central
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(color = PrimaryBlue)
                }
                uiState.isFinished || uiState.photos.isEmpty() -> {
                    // Pantalla de finalización del lote
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = KeepGreen,
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = stringResource(R.string.all_done),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = stringResource(R.string.no_photos_left),
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(28.dp))

                        if (uiState.trashedCount > 0) {
                            Button(
                                onClick = onNavigateToSummary,
                                colors = ButtonDefaults.buttonColors(containerColor = TrashRed),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth(0.8f)
                                    .height(50.dp)
                            ) {
                                Text(
                                    text = "Revisar y Limpiar (${FileSizeFormatter.formatBytes(uiState.bytesToFree)})",
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        } else {
                            Button(
                                onClick = onNavigateBack,
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth(0.8f)
                                    .height(50.dp)
                            ) {
                                Text(text = stringResource(R.string.back_to_albums))
                            }
                        }
                    }
                }
                else -> {
                    SwipeDeck(
                        uiState = uiState,
                        onSwipeCompleted = { photo, direction ->
                            viewModel.onSwipeCompleted(photo, direction)
                        },
                        onUndoAnimationFinished = {
                            viewModel.onUndoAnimationFinished()
                        },
                        onSetAnimating = { animating ->
                            viewModel.setAnimating(animating)
                        }
                    )
                }
            }
        }

        // Barra Inferior de Acciones
        if (!uiState.isFinished && uiState.photos.isNotEmpty()) {
            UndoActionBar(
                canUndo = uiState.canUndo,
                onUndoClick = { viewModel.onUndoClicked() },
                onTrashClick = {
                    val current = uiState.currentPhoto
                    if (current != null && !uiState.isAnimating) {
                        viewModel.onSwipeCompleted(current, SwipeDirection.LEFT)
                    }
                },
                onKeepClick = {
                    val current = uiState.currentPhoto
                    if (current != null && !uiState.isAnimating) {
                        viewModel.onSwipeCompleted(current, SwipeDirection.RIGHT)
                    }
                }
            )

            // Botón sutil para terminar antes
            if (uiState.trashedCount > 0) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.material3.TextButton(onClick = onNavigateToSummary) {
                        Text(
                            text = "Ir al resumen (${uiState.trashedCount} a borrar)",
                            color = PrimaryBlue,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}

