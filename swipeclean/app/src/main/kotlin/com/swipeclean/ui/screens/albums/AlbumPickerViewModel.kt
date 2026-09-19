package com.swipeclean.ui.screens.albums

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.swipeclean.data.model.PhotoBucket
import com.swipeclean.domain.usecase.GetBucketsUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AlbumPickerUiState(
    val isLoading: Boolean = true,
    val buckets: List<PhotoBucket> = emptyList(),
    val error: String? = null
)

class AlbumPickerViewModel(
    private val getBucketsUseCase: GetBucketsUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(AlbumPickerUiState())
    val uiState: StateFlow<AlbumPickerUiState> = _uiState.asStateFlow()

    init {
        loadBuckets()
    }

    fun loadBuckets() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val buckets = getBucketsUseCase()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    buckets = buckets
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.localizedMessage ?: "Error al cargar los álbumes"
                )
            }
        }
    }
}
