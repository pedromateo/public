package com.swipeclean.ui.screens.summary

import android.content.IntentSender
import com.swipeclean.data.model.PhotoItem
import com.swipeclean.domain.usecase.CreateTrashRequestUseCase
import io.mockk.every
import io.mockk.mockk
import android.net.Uri
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SummaryViewModelTest {

    private val createTrashRequestUseCase: CreateTrashRequestUseCase = mockk()
    private lateinit var viewModel: SummaryViewModel

    private val samplePhotos = listOf(
        PhotoItem(
            id = "1",
            uri = "content://media/external/images/media/1",
            name = "borrar_1.jpg",
            sizeBytes = 4_000_000L,
            timestamp = 1000L,
            mimeType = "image/jpeg"
        ),
        PhotoItem(
            id = "2",
            uri = "content://media/external/images/media/2",
            name = "borrar_2.jpg",
            sizeBytes = 6_000_000L,
            timestamp = 2000L,
            mimeType = "image/jpeg"
        )
    )

    @Before
    fun setUp() {
        mockkStatic(Uri::class)
        val mockUri: Uri = mockk()
        every { Uri.parse(any()) } returns mockUri
        viewModel = SummaryViewModel(createTrashRequestUseCase)
    }

    @After
    fun tearDown() {
        unmockkStatic(Uri::class)
    }

    @Test
    fun `initialize configures photos and calculates metrics`() {
        viewModel.initialize(samplePhotos, keptCount = 5)

        val state = viewModel.uiState.value
        assertEquals(2, state.trashedCount)
        assertEquals(5, state.totalKeptCount)
        assertEquals(10_000_000L, state.bytesToFree)
        assertFalse(state.deletionCompleted)
    }

    @Test
    fun `removePhotoFromTrash unmarks photo and updates space to free`() {
        viewModel.initialize(samplePhotos, keptCount = 5)
        viewModel.removePhotoFromTrash(photoId = "1")

        val state = viewModel.uiState.value
        assertEquals(1, state.trashedCount)
        assertEquals(6_000_000L, state.bytesToFree)
        assertEquals("2", state.photosToTrash[0].id)
    }

    @Test
    fun `requestTrashPhotos populates pendingIntentSender when API returns intent`() {
        val fakeIntentSender: IntentSender = mockk()
        every { createTrashRequestUseCase.invoke(any(), trash = true) } returns fakeIntentSender

        viewModel.initialize(samplePhotos, keptCount = 5)
        viewModel.requestTrashPhotos()

        val state = viewModel.uiState.value
        assertNotNull(state.pendingIntentSender)
        assertEquals(fakeIntentSender, state.pendingIntentSender)

        viewModel.onIntentSenderHandled()
        assertNull(viewModel.uiState.value.pendingIntentSender)
    }

    @Test
    fun `onDeletionSuccess marks operation completed`() {
        viewModel.initialize(samplePhotos, keptCount = 5)
        viewModel.onDeletionSuccess()

        val state = viewModel.uiState.value
        assertTrue(state.deletionCompleted)
        assertFalse(state.isDeleting)
        assertNull(state.pendingIntentSender)
    }
}
