package com.swipeclean.ui.screens.summary

import android.net.Uri
import androidx.lifecycle.ViewModel
import com.swipeclean.data.model.PhotoItem
import com.swipeclean.domain.usecase.CreateTrashRequestUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class SummaryViewModel(
    private val createTrashRequestUseCase: CreateTrashRequestUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(SummaryUiState())
    val uiState: StateFlow<SummaryUiState> = _uiState.asStateFlow()

    fun initialize(trashedPhotos: List<PhotoItem>, keptCount: Int) {
        _uiState.update {
            it.copy(
                photosToTrash = trashedPhotos,
                totalKeptCount = keptCount,
                deletionCompleted = false,
                isDeleting = false,
                pendingIntentSender = null,
                errorMessage = null
            )
        }
    }

    fun removePhotoFromTrash(photoId: String) {
        _uiState.update { state ->
            state.copy(
                photosToTrash = state.photosToTrash.filter { it.id != photoId }
            )
        }
    }

    fun requestTrashPhotos() {
        val currentPhotos = _uiState.value.photosToTrash
        if (currentPhotos.isEmpty()) return

        val uris = currentPhotos.map { Uri.parse(it.uri) }
        val intentSender = createTrashRequestUseCase(uris, trash = true)

        if (intentSender != null) {
            _uiState.update { it.copy(pendingIntentSender = intentSender) }
        } else {
            // Android 9 o borrado directo completado
            _uiState.update { it.copy(deletionCompleted = true, pendingIntentSender = null) }
        }
    }

    fun onIntentSenderHandled() {
        _uiState.update { it.copy(pendingIntentSender = null) }
    }

    fun onDeletionSuccess() {
        _uiState.update {
            it.copy(
                deletionCompleted = true,
                pendingIntentSender = null,
                isDeleting = false
            )
        }
    }

    fun onDeletionFailed(error: String? = null) {
        _uiState.update {
            it.copy(
                isDeleting = false,
                errorMessage = error ?: "La eliminación fue cancelada o falló"
            )
        }
    }
}
