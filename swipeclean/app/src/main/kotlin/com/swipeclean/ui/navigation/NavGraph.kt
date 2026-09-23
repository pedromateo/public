package com.swipeclean.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.swipeclean.core.utils.PermissionUtils
import com.swipeclean.data.datasource.MediaStoreDataSource
import com.swipeclean.data.repository.PhotoRepositoryImpl
import com.swipeclean.domain.usecase.CreateTrashRequestUseCase
import com.swipeclean.domain.usecase.GetBucketsUseCase
import com.swipeclean.domain.usecase.GetPhotosUseCase
import com.swipeclean.ui.screens.albums.AlbumPickerScreen
import com.swipeclean.ui.screens.albums.AlbumPickerViewModel
import com.swipeclean.ui.screens.permission.PermissionScreen
import com.swipeclean.ui.screens.summary.SummaryScreen
import com.swipeclean.ui.screens.summary.SummaryViewModel
import com.swipeclean.ui.screens.swipe.SwipeScreen
import com.swipeclean.ui.screens.swipe.SwipeViewModel

@Composable
fun SwipeCleanNavGraph(
    navController: NavHostController
) {
    val context = LocalContext.current

    // Dependencias básicas con ciclo de vida retenido
    val dataSource = androidx.compose.runtime.remember { MediaStoreDataSource(context) }
    val repository = androidx.compose.runtime.remember { PhotoRepositoryImpl(dataSource) }
    val getPhotosUseCase = androidx.compose.runtime.remember { GetPhotosUseCase(repository) }
    val getBucketsUseCase = androidx.compose.runtime.remember { GetBucketsUseCase(repository) }
    val createTrashRequestUseCase = androidx.compose.runtime.remember { CreateTrashRequestUseCase(repository) }

    val albumViewModel = androidx.compose.runtime.remember { AlbumPickerViewModel(getBucketsUseCase) }
    val swipeViewModel = androidx.compose.runtime.remember { SwipeViewModel(getPhotosUseCase) }
    val summaryViewModel = androidx.compose.runtime.remember { SummaryViewModel(createTrashRequestUseCase) }

    val startDestination = if (PermissionUtils.hasStoragePermission(context)) {
        Screen.AlbumPicker.route
    } else {
        Screen.Permission.route
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Permission.route) {
            PermissionScreen(
                onPermissionGranted = {
                    albumViewModel.loadBuckets()
                    navController.navigate(Screen.AlbumPicker.route) {
                        popUpTo(Screen.Permission.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.AlbumPicker.route) {
            AlbumPickerScreen(
                viewModel = albumViewModel,
                onAlbumSelected = { bucketId, bucketName, random ->
                    navController.navigate(Screen.Swipe.createRoute(bucketId, bucketName, random = random))
                }
            )
        }

        composable(
            route = Screen.Swipe.route,
            arguments = listOf(
                navArgument("bucketId") {
                    type = NavType.StringType
                    defaultValue = ""
                },
                navArgument("bucketName") {
                    type = NavType.StringType
                    defaultValue = ""
                },
                navArgument("random") {
                    type = NavType.BoolType
                    defaultValue = false
                }
            )
        ) { backStackEntry ->
            val bucketIdArg = backStackEntry.arguments?.getString("bucketId")
            val bucketNameArg = backStackEntry.arguments?.getString("bucketName")
            val randomArg = backStackEntry.arguments?.getBoolean("random") ?: false
            val effectiveBucketId = if (bucketIdArg.isNullOrEmpty()) null else bucketIdArg
            val effectiveBucketName = if (bucketNameArg.isNullOrEmpty()) "Todas las fotos" else bucketNameArg

            val swipeState by swipeViewModel.uiState.collectAsState()

            SwipeScreen(
                bucketId = effectiveBucketId,
                bucketName = effectiveBucketName,
                startRandom = randomArg,
                viewModel = swipeViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToSummary = {
                    val trashed = swipeState.photos.filter { it.id in swipeState.trashedPhotoIds }
                    summaryViewModel.initialize(trashed, swipeState.keptCount)
                    navController.navigate(Screen.Summary.route)
                }
            )
        }

        composable(Screen.Summary.route) {
            SummaryScreen(
                viewModel = summaryViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onFinishAndGoHome = {
                    albumViewModel.loadBuckets()
                    navController.navigate(Screen.AlbumPicker.route) {
                        popUpTo(Screen.AlbumPicker.route) { inclusive = true }
                    }
                }
            )
        }
    }
}
