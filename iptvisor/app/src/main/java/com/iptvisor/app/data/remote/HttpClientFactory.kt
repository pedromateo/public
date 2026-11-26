package com.iptvisor.app.data.remote

import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * Factory providing a shared [OkHttpClient] instance and per-User-Agent derived clients.
 */
class HttpClientFactory {

    val baseClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    /**
     * Returns an [OkHttpClient] that overrides the `User-Agent` header when [userAgent] is non-blank,
     * sharing the underlying connection pool and dispatcher of [baseClient].
     */
    fun clientWithUserAgent(userAgent: String): OkHttpClient {
        if (userAgent.isBlank()) return baseClient
        return baseClient.newBuilder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("User-Agent", userAgent)
                    .build()
                chain.proceed(request)
            }
            .build()
    }
}
