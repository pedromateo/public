package com.swipeclean

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], application = SwipeCleanApp::class)
class SwipeCleanAppStartTest {

    @Test
    fun `app starts up and initializes SwipeCleanApp properly`() {
        val scenario = ActivityScenario.launch(MainActivity::class.java)

        scenario.onActivity { activity ->
            assertNotNull(activity)
            val app = activity.application as? SwipeCleanApp
            assertNotNull("SwipeCleanApp must be properly initialized", app)
        }

        assertEquals(Lifecycle.State.RESUMED, scenario.state)
        scenario.close()
    }
}
