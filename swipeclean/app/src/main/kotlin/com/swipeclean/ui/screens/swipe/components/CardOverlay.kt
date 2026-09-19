package com.swipeclean.ui.screens.swipe.components

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.swipeclean.core.theme.KeepGreen
import com.swipeclean.core.theme.TrashRed
import com.swipeclean.domain.model.SwipeDirection

@Composable
fun CardOverlay(
    direction: SwipeDirection,
    alpha: Float,
    modifier: Modifier = Modifier
) {
    if (alpha <= 0.05f) return

    val isTrash = direction == SwipeDirection.LEFT
    val color = if (isTrash) TrashRed else KeepGreen
    val text = if (isTrash) "ELIMINAR" else "CONSERVAR"
    val icon = if (isTrash) Icons.Default.Delete else Icons.Default.Check
    val rotation = if (isTrash) -15f else 15f

    Box(
        modifier = modifier
            .alpha(alpha)
            .rotate(rotation)
            .border(3.dp, color, RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = text,
                color = color,
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.2.sp
            )
        }
    }
}
