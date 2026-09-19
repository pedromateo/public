package com.swipeclean.domain.model

import com.swipeclean.data.model.DecisionType
import com.swipeclean.data.model.PhotoItem

/**
 * Representa una acción histórica de deslizamiento (LIFO).
 * Registra la foto, la decisión y la dirección física para permitir
 * revertir contadores y reproducir la animación espacial inversa en la UI.
 */
data class SwipeAction(
    val photo: PhotoItem,
    val decision: DecisionType,
    val direction: SwipeDirection,
    val timestamp: Long = System.currentTimeMillis()
)
