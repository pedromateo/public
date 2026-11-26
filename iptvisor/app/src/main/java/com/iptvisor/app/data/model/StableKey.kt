package com.iptvisor.app.data.model

import java.security.MessageDigest

/** Generates deterministic keys for streams across playlist refreshes. */
object StableKey {

    fun forXtream(type: ContentType, streamId: String): String =
        "xtream:${type.name}:$streamId"

    fun forM3u(name: String, url: String): String =
        "m3u:" + sha256("$name|$url")

    private fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }
}
