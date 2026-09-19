package com.swipeclean

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.navigation.compose.rememberNavController
import com.swipeclean.core.theme.SwipeCleanTheme
import com.swipeclean.ui.navigation.SwipeCleanNavGraph

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SwipeCleanTheme {
                val navController = rememberNavController()
                SwipeCleanNavGraph(navController = navController)
            }
        }
    }
}
