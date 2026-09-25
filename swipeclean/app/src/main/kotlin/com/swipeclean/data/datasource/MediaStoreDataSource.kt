package com.swipeclean.data.datasource

import android.app.RecoverableSecurityException
import android.content.ContentUris
import android.content.Context
import android.content.IntentSender
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.swipeclean.data.model.PhotoBucket
import com.swipeclean.data.model.PhotoItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MediaStoreDataSource(
    private val context: Context
) {

    suspend fun getPhotos(bucketId: String? = null): List<PhotoItem> = withContext(Dispatchers.IO) {
        val photos = mutableListOf<PhotoItem>()
        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.MIME_TYPE,
            MediaStore.Images.Media.BUCKET_ID,
            MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT,
            MediaStore.Images.Media.ORIENTATION
        )

        val selection = bucketId?.let { "${MediaStore.Images.Media.BUCKET_ID} = ?" }
        val selectionArgs = bucketId?.let { arrayOf(it) }
        val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} DESC"

        val queryUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI

        context.contentResolver.query(
            queryUri,
            projection,
            selection,
            selectionArgs,
            sortOrder
        )?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
            val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
            val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
            val dateColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
            val mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
            val bIdColumn = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_ID)
            val bNameColumn = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_DISPLAY_NAME)
            val widthColumn = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH)
            val heightColumn = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT)
            val orientationColumn = cursor.getColumnIndex(MediaStore.Images.Media.ORIENTATION)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val contentUri = ContentUris.withAppendedId(queryUri, id)
                val size = cursor.getLong(sizeColumn)
                val date = cursor.getLong(dateColumn)
                val name = cursor.getString(nameColumn) ?: "IMG_$id"
                val mime = cursor.getString(mimeColumn) ?: "image/jpeg"
                val bId = if (bIdColumn != -1 && !cursor.isNull(bIdColumn)) cursor.getString(bIdColumn) else null
                val bName = if (bNameColumn != -1 && !cursor.isNull(bNameColumn)) cursor.getString(bNameColumn) else null

                val rawW = if (widthColumn != -1 && !cursor.isNull(widthColumn)) cursor.getInt(widthColumn) else 0
                val rawH = if (heightColumn != -1 && !cursor.isNull(heightColumn)) cursor.getInt(heightColumn) else 0
                val orientation = if (orientationColumn != -1 && !cursor.isNull(orientationColumn)) cursor.getInt(orientationColumn) else 0

                val finalW = if (orientation == 90 || orientation == 270) rawH else rawW
                val finalH = if (orientation == 90 || orientation == 270) rawW else rawH

                photos.add(
                    PhotoItem(
                        id = id.toString(),
                        uri = contentUri.toString(),
                        name = name,
                        sizeBytes = size,
                        timestamp = date,
                        mimeType = mime,
                        bucketId = bId,
                        bucketName = bName,
                        width = finalW,
                        height = finalH
                    )
                )
            }
        }
        photos
    }

    suspend fun getBuckets(): List<PhotoBucket> = withContext(Dispatchers.IO) {
        val allPhotos = getPhotos()
        if (allPhotos.isEmpty()) return@withContext emptyList()

        val totalBytes = allPhotos.sumOf { it.sizeBytes }
        val allBucket = PhotoBucket(
            id = null,
            name = "Todas las fotos",
            photoCount = allPhotos.size,
            coverUri = allPhotos.firstOrNull()?.uri,
            totalSizeBytes = totalBytes
        )

        val grouped = allPhotos.groupBy { it.bucketId }
            .mapNotNull { (bucketId, photos) ->
                if (bucketId == null) null
                else {
                    val bucketName = photos.firstOrNull()?.bucketName ?: "Carpeta"
                    PhotoBucket(
                        id = bucketId,
                        name = bucketName,
                        photoCount = photos.size,
                        coverUri = photos.firstOrNull()?.uri,
                        totalSizeBytes = photos.sumOf { it.sizeBytes }
                    )
                }
            }
            .sortedByDescending { it.photoCount }

        listOf(allBucket) + grouped
    }

    /**
     * Genera el IntentSender del sistema para mover fotos a la papelera (Android 11+ / API 30+)
     * o solicitar permiso de borrado.
     */
    fun createTrashIntentSender(uris: List<Uri>, trash: Boolean = true): IntentSender? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            MediaStore.createTrashRequest(context.contentResolver, uris, trash).intentSender
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10 fallback
            try {
                if (uris.isNotEmpty()) {
                    context.contentResolver.delete(uris.first(), null, null)
                }
                null
            } catch (securityException: SecurityException) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                    securityException is RecoverableSecurityException
                ) {
                    securityException.userAction.actionIntent.intentSender
                } else {
                    null
                }
            }
        } else {
            // Android 9 y anteriores: borrado directo
            uris.forEach { uri ->
                context.contentResolver.delete(uri, null, null)
            }
            null
        }
    }
}
