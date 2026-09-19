package com.swipeclean

import org.junit.Assert.assertNotNull
import org.junit.Test

class SwipeCleanAppTest {

    @Test
    fun `SwipeCleanApp can be instantiated cleanly`() {
        val app = SwipeCleanApp()
        assertNotNull("SwipeCleanApp instance should not be null", app)
    }
}
