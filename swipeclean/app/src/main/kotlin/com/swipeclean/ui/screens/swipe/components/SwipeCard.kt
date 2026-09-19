package com.swipeclean.ui.screens.swipe.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.swipeclean.core.theme.DarkSurface
import com.swipeclean.core.theme.TextPrimary
import com.swipeclean.core.theme.TextSecondary
import com.swipeclean.core.utils.FileSizeFormatter
import com.swipeclean.data.model.PhotoItem
import com.swipeclean.domain.model.SwipeDirection

@Composable
fun SwipeCard(
    photo: PhotoItem,
    modifier: Modifier = Modifier,
    swipeProgress: Float = 0f // -1f (left/trash) a +1f (right/keep)
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        modifier = modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(24.dp))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = photo.uri,
                contentDescription = photo.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Gradiente inferior para legibilidad del texto
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

            // Metadatos de la foto
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

            // Sellos de feedback visual según arrastre
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
