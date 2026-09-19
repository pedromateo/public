package com.swipeclean.data.repository

import android.content.IntentSender
import android.net.Uri
import com.swipeclean.data.model.PhotoBucket
import com.swipeclean.data.model.PhotoItem

interface PhotoRepository {
    suspend fun getPhotos(bucketId: String? = null): List<PhotoItem>
    suspend fun getBuckets(): List<PhotoBucket>
    fun createTrashIntentSender(uris: List<Uri>, trash: Boolean = true): IntentSender?
}
