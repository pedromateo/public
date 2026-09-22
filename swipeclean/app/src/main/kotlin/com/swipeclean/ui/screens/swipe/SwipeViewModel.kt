package com.swipeclean.ui.screens.swipe

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.swipeclean.data.model.DecisionType
import com.swipeclean.data.model.PhotoItem
import com.swipeclean.domain.model.SwipeAction
import com.swipeclean.domain.model.SwipeDirection
import com.swipeclean.domain.usecase.GetPhotosUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class SwipeViewModel(
    private val getPhotosUseCase: GetPhotosUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(SwipeUiState())
    val uiState: StateFlow<SwipeUiState> = _uiState.asStateFlow()

    private var originalPhotos: List<PhotoItem> = emptyList()

    fun loadPhotos(bucketId: String? = null, startRandom: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val loadedPhotos = getPhotosUseCase(bucketId)
                originalPhotos = loadedPhotos
                val initialPhotos = if (startRandom) loadedPhotos.shuffled() else loadedPhotos
                _uiState.update {
                    it.copy(
                        photos = initialPhotos,
                        currentIndex = 0,
                        history = emptyList(),
                        trashedPhotoIds = emptySet(),
                        keptPhotoIds = emptySet(),
                        isLoading = false,
                        undoingAction = null,
                        isAnimating = false,
                        isRandomOrder = startRandom
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.localizedMessage ?: "Error al cargar fotos"
                    )
                }
            }
        }
    }

    fun toggleRandomOrder() {
        setRandomOrder(!_uiState.value.isRandomOrder)
    }

    fun setRandomOrder(enabled: Boolean) {
        val currentState = _uiState.value
        if (currentState.photos.isEmpty()) {
            _uiState.update { it.copy(isRandomOrder = enabled) }
            return
        }

        val currentIndex = currentState.currentIndex
        val processed = currentState.photos.take(currentIndex)
        val processedIds = processed.map { it.id }.toSet()

        val newRemaining = if (enabled) {
            currentState.photos.drop(currentIndex).shuffled()
        } else {
            originalPhotos.filter { it.id !in processedIds }
        }

        _uiState.update { state ->
            state.copy(
                photos = processed + newRemaining,
                isRandomOrder = enabled
            )
        }
    }

    fun reshuffleRemaining() {
        val currentState = _uiState.value
        if (currentState.photos.isEmpty()) return

        val currentIndex = currentState.currentIndex
        val processed = currentState.photos.take(currentIndex)
        val remaining = currentState.photos.drop(currentIndex).shuffled()

        _uiState.update { state ->
            state.copy(
                photos = processed + remaining,
                isRandomOrder = true
            )
        }
    }

    fun onSwipeCompleted(photo: PhotoItem, direction: SwipeDirection) {
        val decision = when (direction) {
            SwipeDirection.LEFT -> DecisionType.TRASH
            SwipeDirection.RIGHT -> DecisionType.KEEP
        }

        val action = SwipeAction(photo = photo, decision = decision, direction = direction)

        _uiState.update { state ->
            state.copy(
                currentIndex = state.currentIndex + 1,
                history = state.history + action,
                trashedPhotoIds = if (decision == DecisionType.TRASH) state.trashedPhotoIds + photo.id else state.trashedPhotoIds,
                keptPhotoIds = if (decision == DecisionType.KEEP) state.keptPhotoIds + photo.id else state.keptPhotoIds,
                undoingAction = null,
                isAnimating = false
            )
        }
    }

    fun onUndoClicked() {
        val currentState = _uiState.value
        if (!currentState.canUndo) return

        val lastAction = currentState.history.lastOrNull() ?: return
        val remainingHistory = currentState.history.dropLast(1)

        _uiState.update { state ->
            state.copy(
                currentIndex = (state.currentIndex - 1).coerceAtLeast(0),
                history = remainingHistory,
                trashedPhotoIds = state.trashedPhotoIds - lastAction.photo.id,
                keptPhotoIds = state.keptPhotoIds - lastAction.photo.id,
                undoingAction = lastAction,
                isAnimating = true
            )
        }
    }

    fun onUndoAnimationFinished() {
        _uiState.update { state ->
            state.copy(
                undoingAction = null,
                isAnimating = false
            )
        }
    }

    fun setAnimating(animating: Boolean) {
        _uiState.update { it.copy(isAnimating = animating) }
    }
}
