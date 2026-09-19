package com.swipeclean.domain.usecase

import com.swipeclean.data.model.PhotoItem
import com.swipeclean.data.repository.PhotoRepository

class GetPhotosUseCase(
    private val repository: PhotoRepository
) {
    suspend operator fun invoke(bucketId: String? = null): List<PhotoItem> {
        return repository.getPhotos(bucketId)
    }
}
