package com.swipeclean.ui.screens.albums

import com.swipeclean.data.model.PhotoBucket
import com.swipeclean.domain.usecase.GetBucketsUseCase
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AlbumPickerViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private val getBucketsUseCase: GetBucketsUseCase = mockk()
    private lateinit var viewModel: AlbumPickerViewModel

    private val sampleBuckets = listOf(
        PhotoBucket(
            id = null,
            name = "Todas las fotos",
            photoCount = 150,
            coverUri = "content://media/external/images/media/1",
            totalSizeBytes = 500_000_000L
        ),
        PhotoBucket(
            id = "camera",
            name = "Camera",
            photoCount = 100,
            coverUri = "content://media/external/images/media/2",
            totalSizeBytes = 400_000_000L
        )
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `loadBuckets successfully populates state with albums`() = runTest {
        coEvery { getBucketsUseCase.invoke() } returns sampleBuckets

        viewModel = AlbumPickerViewModel(getBucketsUseCase)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertNull(state.error)
        assertEquals(2, state.buckets.size)
        assertEquals("Todas las fotos", state.buckets[0].name)
        assertEquals(150, state.buckets[0].photoCount)
    }

    @Test
    fun `loadBuckets sets error state when use case throws exception`() = runTest {
        coEvery { getBucketsUseCase.invoke() } throws RuntimeException("Error en base de datos")

        viewModel = AlbumPickerViewModel(getBucketsUseCase)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertTrue(state.buckets.isEmpty())
        assertEquals("Error en base de datos", state.error)
    }
}
