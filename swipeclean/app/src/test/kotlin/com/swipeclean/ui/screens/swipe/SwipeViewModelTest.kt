package com.swipeclean.ui.screens.swipe

import com.swipeclean.data.model.DecisionType
import com.swipeclean.data.model.PhotoItem
import com.swipeclean.domain.model.SwipeDirection
import com.swipeclean.domain.usecase.GetPhotosUseCase
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
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SwipeViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private val getPhotosUseCase: GetPhotosUseCase = mockk()
    private lateinit var viewModel: SwipeViewModel

    private val samplePhotos = listOf(
        PhotoItem(
            id = "1",
            uri = "content://media/external/images/media/1",
            name = "photo_1.jpg",
            sizeBytes = 5_000_000L, // 5 MB
            timestamp = 1000L,
            mimeType = "image/jpeg"
        ),
        PhotoItem(
            id = "2",
            uri = "content://media/external/images/media/2",
            name = "photo_2.jpg",
            sizeBytes = 10_000_000L, // 10 MB
            timestamp = 2000L,
            mimeType = "image/jpeg"
        )
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        coEvery { getPhotosUseCase.invoke(any()) } returns samplePhotos
        viewModel = SwipeViewModel(getPhotosUseCase)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state loads photos and undo is disabled`() = runTest {
        viewModel.loadPhotos(bucketId = null)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals(2, state.photos.size)
        assertEquals(0, state.currentIndex)
        assertFalse(state.canUndo)
        assertEquals(0, state.trashedCount)
        assertEquals(0, state.keptCount)
        assertEquals(0L, state.bytesToFree)
    }

    @Test
    fun `swipe left trashes photo and enables undo`() = runTest {
        viewModel.loadPhotos(null)
        advanceUntilIdle()

        val firstPhoto = samplePhotos[0]
        viewModel.onSwipeCompleted(firstPhoto, SwipeDirection.LEFT)

        val state = viewModel.uiState.value
        assertEquals(1, state.currentIndex)
        assertEquals(1, state.trashedCount)
        assertEquals(0, state.keptCount)
        assertEquals(5_000_000L, state.bytesToFree)
        assertTrue(state.canUndo)
        assertEquals(1, state.history.size)
        assertEquals(DecisionType.TRASH, state.history[0].decision)
        assertEquals(SwipeDirection.LEFT, state.history[0].direction)
    }

    @Test
    fun `swipe right keeps photo without increasing bytesToFree`() = runTest {
        viewModel.loadPhotos(null)
        advanceUntilIdle()

        val firstPhoto = samplePhotos[0]
        viewModel.onSwipeCompleted(firstPhoto, SwipeDirection.RIGHT)

        val state = viewModel.uiState.value
        assertEquals(1, state.currentIndex)
        assertEquals(0, state.trashedCount)
        assertEquals(1, state.keptCount)
        assertEquals(0L, state.bytesToFree)
        assertTrue(state.canUndo)
    }

    @Test
    fun `undo reverts last swipe decision and animates spatial return`() = runTest {
        viewModel.loadPhotos(null)
        advanceUntilIdle()

        // 1. Swipe a la izquierda (Papelera)
        viewModel.onSwipeCompleted(samplePhotos[0], SwipeDirection.LEFT)
        assertEquals(1, viewModel.uiState.value.trashedCount)
        assertEquals(5_000_000L, viewModel.uiState.value.bytesToFree)

        // 2. Deshacer
        viewModel.onUndoClicked()

        var state = viewModel.uiState.value
        assertEquals(0, state.currentIndex)
        assertEquals(0, state.trashedCount)
        assertEquals(0L, state.bytesToFree)
        assertTrue(state.isAnimating)
        assertNotNull(state.undoingAction)
        assertEquals("1", state.undoingAction?.photo?.id)
        assertEquals(SwipeDirection.LEFT, state.undoingAction?.direction)

        // 3. Fin de la animación
        viewModel.onUndoAnimationFinished()
        state = viewModel.uiState.value
        assertFalse(state.isAnimating)
        assertNull(state.undoingAction)
        assertFalse(state.canUndo)
    }

    @Test
    fun `consecutive undos exhaust history correctly`() = runTest {
        viewModel.loadPhotos(null)
        advanceUntilIdle()

        // Swipe 1 y Swipe 2
        viewModel.onSwipeCompleted(samplePhotos[0], SwipeDirection.LEFT)
        viewModel.onSwipeCompleted(samplePhotos[1], SwipeDirection.RIGHT)

        assertEquals(2, viewModel.uiState.value.currentIndex)
        assertEquals(1, viewModel.uiState.value.trashedCount)
        assertEquals(1, viewModel.uiState.value.keptCount)

        // Undo 1 (revertir foto 2)
        viewModel.onUndoClicked()
        viewModel.onUndoAnimationFinished()

        var state = viewModel.uiState.value
        assertEquals(1, state.currentIndex)
        assertEquals(0, state.keptCount)
        assertEquals(1, state.trashedCount)
        assertTrue(state.canUndo)

        // Undo 2 (revertir foto 1)
        viewModel.onUndoClicked()
        viewModel.onUndoAnimationFinished()

        state = viewModel.uiState.value
        assertEquals(0, state.currentIndex)
        assertEquals(0, state.trashedCount)
        assertFalse(state.canUndo)
        assertTrue(state.history.isEmpty())
    }
}
