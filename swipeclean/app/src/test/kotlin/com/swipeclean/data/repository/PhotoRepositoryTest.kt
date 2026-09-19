package com.swipeclean.data.repository

import android.net.Uri
import com.swipeclean.data.datasource.MediaStoreDataSource
import com.swipeclean.data.model.PhotoBucket
import com.swipeclean.data.model.PhotoItem
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class PhotoRepositoryTest {

    private val dataSource: MediaStoreDataSource = mockk()
    private lateinit var repository: PhotoRepository

    @Before
    fun setUp() {
        repository = PhotoRepositoryImpl(dataSource)
    }

    @Test
    fun `getPhotos delegates to dataSource`() = runTest {
        val fakePhotos = listOf(
            PhotoItem(
                id = "1",
                uri = "content://photo/1",
                name = "test.jpg",
                sizeBytes = 1000L,
                timestamp = 100L,
                mimeType = "image/jpeg"
            )
        )
        coEvery { dataSource.getPhotos("camera") } returns fakePhotos

        val result = repository.getPhotos("camera")
        assertEquals(fakePhotos, result)
        coVerify(exactly = 1) { dataSource.getPhotos("camera") }
    }

    @Test
    fun `getBuckets delegates to dataSource`() = runTest {
        val fakeBuckets = listOf(
            PhotoBucket(
                id = "camera",
                name = "Camera",
                photoCount = 20,
                coverUri = null,
                totalSizeBytes = 50000L
            )
        )
        coEvery { dataSource.getBuckets() } returns fakeBuckets

        val result = repository.getBuckets()
        assertEquals(fakeBuckets, result)
        coVerify(exactly = 1) { dataSource.getBuckets() }
    }

    @Test
    fun `createTrashIntentSender delegates to dataSource`() {
        val mockUri: Uri = mockk()
        val uris = listOf(mockUri)
        every { dataSource.createTrashIntentSender(uris, true) } returns null

        val result = repository.createTrashIntentSender(uris, true)
        assertEquals(null, result)
        verify(exactly = 1) { dataSource.createTrashIntentSender(uris, true) }
    }
}
