package com.swipeclean

import com.swipeclean.ui.navigation.Screen
import org.junit.Assert.assertEquals
import org.junit.Test

class AppNavigationTest {

    @Test
    fun `permission route is properly configured`() {
        assertEquals("permission", Screen.Permission.route)
    }

    @Test
    fun `album picker route is properly configured`() {
        assertEquals("albums", Screen.AlbumPicker.route)
    }

    @Test
    fun `swipe route generates parameterized path with bucket id and name`() {
        val route = Screen.Swipe.createRoute(bucketId = "camera_123", bucketName = "Cámara")
        assertEquals("swipe?bucketId=camera_123&bucketName=Cámara", route)
    }

    @Test
    fun `swipe route handles null bucket values gracefully`() {
        val route = Screen.Swipe.createRoute(bucketId = null, bucketName = null)
        assertEquals("swipe?bucketId=&bucketName=", route)
    }

    @Test
    fun `summary route is properly configured`() {
        assertEquals("summary", Screen.Summary.route)
    }
}
