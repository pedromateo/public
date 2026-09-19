package com.swipeclean.data.repository

import android.content.IntentSender
import android.net.Uri
import com.swipeclean.data.datasource.MediaStoreDataSource
import com.swipeclean.data.model.PhotoBucket
import com.swipeclean.data.model.PhotoItem

class PhotoRepositoryImpl(
    private val dataSource: MediaStoreDataSource
) : PhotoRepository {

    override suspend fun getPhotos(bucketId: String?): List<PhotoItem> {
        return dataSource.getPhotos(bucketId)
    }

    override suspend fun getBuckets(): List<PhotoBucket> {
        return dataSource.getBuckets()
    }

    override fun createTrashIntentSender(uris: List<Uri>, trash: Boolean): IntentSender? {
        return dataSource.createTrashIntentSender(uris, trash)
    }
}
