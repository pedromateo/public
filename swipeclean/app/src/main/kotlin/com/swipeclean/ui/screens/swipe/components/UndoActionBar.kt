package com.swipeclean.ui.screens.swipe.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.unit.dp
import com.swipeclean.core.theme.DarkSurface
import com.swipeclean.core.theme.KeepGreen
import com.swipeclean.core.theme.PrimaryBlue
import com.swipeclean.core.theme.TextPrimary
import com.swipeclean.core.theme.TrashRed

@Composable
fun UndoActionBar(
    canUndo: Boolean,
    onUndoClick: () -> Unit,
    onTrashClick: () -> Unit,
    onKeepClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val undoAlpha by animateFloatAsState(
        targetValue = if (canUndo) 1.0f else 0.35f,
        label = "undoAlpha"
    )

    Surface(
        color = DarkSurface,
        shape = CircleShape,
        shadowElevation = 8.dp,
        modifier = modifier
            .padding(horizontal = 24.dp, vertical = 16.dp)
            .height(72.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            // Botón Descartar (Papelera)
            FilledIconButton(
                onClick = onTrashClick,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = TrashRed.copy(alpha = 0.15f),
                    contentColor = TrashRed
                ),
                modifier = Modifier.size(54.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Descartar",
                    modifier = Modifier.size(26.dp)
                )
            }

            // Botón Deshacer (Centro, con animación de disponibilidad)
            FilledIconButton(
                onClick = {
                    if (canUndo) onUndoClick()
                },
                enabled = canUndo,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = PrimaryBlue.copy(alpha = 0.2f),
                    contentColor = PrimaryBlue,
                    disabledContainerColor = PrimaryBlue.copy(alpha = 0.08f),
                    disabledContentColor = PrimaryBlue.copy(alpha = 0.35f)
                ),
                modifier = Modifier
                    .size(46.dp)
                    .alpha(undoAlpha)
            ) {
                Icon(
                    imageVector = Icons.Default.Undo,
                    contentDescription = "Deshacer",
                    modifier = Modifier.size(24.dp)
                )
            }

            // Botón Conservar (Keep)
            FilledIconButton(
                onClick = onKeepClick,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = KeepGreen.copy(alpha = 0.15f),
                    contentColor = KeepGreen
                ),
                modifier = Modifier.size(54.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Conservar",
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}
