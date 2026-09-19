package com.swipeclean.ui.navigation

sealed class Screen(val route: String) {
    data object Permission : Screen("permission")
    data object AlbumPicker : Screen("albums")
    data object Swipe : Screen("swipe?bucketId={bucketId}&bucketName={bucketName}") {
        fun createRoute(bucketId: String? = null, bucketName: String? = null): String {
            val bId = bucketId ?: ""
            val bName = bucketName ?: ""
            return "swipe?bucketId=$bId&bucketName=$bName"
        }
    }
    data object Summary : Screen("summary")
}
