package com.iptvisor.app

import android.app.Application
import android.content.Context
import com.iptvisor.app.data.local.AppDatabase
import com.iptvisor.app.data.remote.HttpClientFactory
import com.iptvisor.app.data.remote.M3uStreamingParser
import com.iptvisor.app.data.remote.XtreamStreamingClient
import com.iptvisor.app.data.repository.PlaylistRepository
import com.iptvisor.app.player.PlaybackManager

/**
 * Manual dependency injection container holding application-scoped singletons.
 */
class AppContainer(context: Context) {
    private val appContext: Context = context.applicationContext

    val database: AppDatabase by lazy {
        AppDatabase.create(appContext)
    }

    val httpClientFactory: HttpClientFactory by lazy {
        HttpClientFactory()
    }

    val repository: PlaylistRepository by lazy {
        PlaylistRepository(
            context = appContext,
            database = database,
            m3uParser = M3uStreamingParser(httpClientFactory),
            xtreamClient = XtreamStreamingClient(httpClientFactory),
        )
    }

    val playbackManager: PlaybackManager by lazy {
        PlaybackManager(appContext)
    }
}

/**
 * Application entry point initializing the [AppContainer].
 */
class IPTVisorApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
