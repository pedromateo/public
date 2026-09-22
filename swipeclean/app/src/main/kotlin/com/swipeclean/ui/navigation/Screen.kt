package com.swipeclean.ui.navigation

sealed class Screen(val route: String) {
    data object Permission : Screen("permission")
    data object AlbumPicker : Screen("albums")
    data object Swipe : Screen("swipe?bucketId={bucketId}&bucketName={bucketName}&random={random}") {
        fun createRoute(bucketId: String? = null, bucketName: String? = null, random: Boolean = false): String {
            val bId = bucketId ?: ""
            val bName = bucketName ?: ""
            return if (random) {
                "swipe?bucketId=$bId&bucketName=$bName&random=true"
            } else {
                "swipe?bucketId=$bId&bucketName=$bName"
            }
        }
    }
    data object Summary : Screen("summary")
}
