package com.swipeclean.ui

import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.swipeclean.core.theme.SwipeCleanTheme
import com.swipeclean.domain.model.SwipeDirection
import com.swipeclean.ui.screens.swipe.components.CardOverlay
import com.swipeclean.ui.screens.swipe.components.UndoActionBar
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class UIComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `CardOverlay displays ELIMINAR stamp for LEFT direction`() {
        composeTestRule.setContent {
            SwipeCleanTheme {
                CardOverlay(direction = SwipeDirection.LEFT, alpha = 1.0f)
            }
        }

        composeTestRule.onNodeWithText("ELIMINAR").assertExists()
    }

    @Test
    fun `CardOverlay displays CONSERVAR stamp for RIGHT direction`() {
        composeTestRule.setContent {
            SwipeCleanTheme {
                CardOverlay(direction = SwipeDirection.RIGHT, alpha = 1.0f)
            }
        }

        composeTestRule.onNodeWithText("CONSERVAR").assertExists()
    }

    @Test
    fun `UndoActionBar enables Undo button only when canUndo is true`() {
        var undoClicked = false

        composeTestRule.setContent {
            SwipeCleanTheme {
                UndoActionBar(
                    canUndo = true,
                    onUndoClick = { undoClicked = true },
                    onTrashClick = {},
                    onKeepClick = {}
                )
            }
        }

        val undoNode = composeTestRule.onNodeWithContentDescription("Deshacer")
        undoNode.assertExists()
        undoNode.assertIsEnabled()
        undoNode.performClick()
        assertTrue(undoClicked)
    }

    @Test
    fun `UndoActionBar disables Undo button when canUndo is false`() {
        composeTestRule.setContent {
            SwipeCleanTheme {
                UndoActionBar(
                    canUndo = false,
                    onUndoClick = {},
                    onTrashClick = {},
                    onKeepClick = {}
                )
            }
        }

        val undoNode = composeTestRule.onNodeWithContentDescription("Deshacer")
        undoNode.assertExists()
        undoNode.assertIsNotEnabled()
    }
}
