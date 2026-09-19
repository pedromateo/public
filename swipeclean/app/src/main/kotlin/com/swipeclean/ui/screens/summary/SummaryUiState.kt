package com.swipeclean.ui.screens.summary

import android.content.IntentSender
import com.swipeclean.data.model.PhotoItem

data class SummaryUiState(
    val photosToTrash: List<PhotoItem> = emptyList(),
    val totalKeptCount: Int = 0,
    val isDeleting: Boolean = false,
    val deletionCompleted: Boolean = false,
    val pendingIntentSender: IntentSender? = null,
    val errorMessage: String? = null
) {
    val trashedCount: Int
        get() = photosToTrash.size

    val bytesToFree: Long
        get() = photosToTrash.sumOf { it.sizeBytes }
}
