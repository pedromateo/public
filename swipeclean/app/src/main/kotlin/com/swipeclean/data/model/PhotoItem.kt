package com.swipeclean.data.model

data class PhotoItem(
    val id: String,
    val uri: String,
    val name: String,
    val sizeBytes: Long,
    val timestamp: Long,
    val mimeType: String,
    val bucketId: String? = null,
    val bucketName: String? = null
)
