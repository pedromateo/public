package com.iptvisor.app.data.model

/** Supported playlist source types. */
enum class PlaylistType {
    XTREAM,
    M3U_URL,
    M3U_FILE,
}

/** Supported IPTV content categories. */
enum class ContentType {
    LIVE,
    VOD,
    SERIES,
}
