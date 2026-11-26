package com.iptvisor.app.data.model

/**
 * Represents a single episode within a series season.
 */
data class SeriesEpisode(
    val id: String,
    val episodeNum: Int,
    val title: String,
    val containerExtension: String,
    val season: Int
)

/**
 * Represents a season containing its ordered list of episodes.
 */
data class SeriesSeason(
    val seasonNumber: Int,
    val name: String,
    val episodes: List<SeriesEpisode>
)

/**
 * Detailed metadata and season/episode breakdown for an Xtream series.
 */
data class SeriesInfo(
    val title: String,
    val coverUrl: String,
    val plot: String,
    val seasons: List<SeriesSeason>
)
