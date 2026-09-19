package com.swipeclean.ui.screens.swipe

import com.swipeclean.data.model.PhotoItem
import com.swipeclean.domain.model.SwipeAction

data class SwipeUiState(
    val photos: List<PhotoItem> = emptyList(),
    val currentIndex: Int = 0,
    val history: List<SwipeAction> = emptyList(),
    val trashedPhotoIds: Set<String> = emptySet(),
    val keptPhotoIds: Set<String> = emptySet(),
    val isAnimating: Boolean = false,
    val undoingAction: SwipeAction? = null,
    val isLoading: Boolean = true,
    val error: String? = null
) {
    val currentPhoto: PhotoItem?
        get() = photos.getOrNull(currentIndex)

    val nextPhoto: PhotoItem?
        get() = photos.getOrNull(currentIndex + 1)

    val canUndo: Boolean
        get() = history.isNotEmpty() && !isAnimating

    val trashedCount: Int
        get() = trashedPhotoIds.size

    val keptCount: Int
        get() = keptPhotoIds.size

    val bytesToFree: Long
        get() = photos.filter { it.id in trashedPhotoIds }.sumOf { it.sizeBytes }

    val isFinished: Boolean
        get() = !isLoading && photos.isNotEmpty() && currentIndex >= photos.size
}
