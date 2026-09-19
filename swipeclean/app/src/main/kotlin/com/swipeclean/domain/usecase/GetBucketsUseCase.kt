package com.swipeclean.domain.usecase

import com.swipeclean.data.model.PhotoBucket
import com.swipeclean.data.repository.PhotoRepository

class GetBucketsUseCase(
    private val repository: PhotoRepository
) {
    suspend operator fun invoke(): List<PhotoBucket> {
        return repository.getBuckets()
    }
}
