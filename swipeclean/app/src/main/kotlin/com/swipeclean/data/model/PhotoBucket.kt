package com.swipeclean.data.model

data class PhotoBucket(
    val id: String?,
    val name: String,
    val photoCount: Int,
    val coverUri: String?,
    val totalSizeBytes: Long
)
