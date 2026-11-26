package com.iptvisor.app.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Fts4
import androidx.room.Index
import androidx.room.PrimaryKey
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.PlaylistType

/** Saved playlist configuration (Xtream Codes or M3U). */
@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val type: PlaylistType,
    val serverUrl: String = "",
    val username: String = "",
    val password: String = "",
    val m3uUri: String = "",
    val userAgent: String = "",
    val lastUpdated: Long = 0L,
    val isFullyIndexed: Boolean = false,
)

/** Category belonging to a playlist and content type. */
@Entity(
    tableName = "categories",
    foreignKeys = [
        ForeignKey(
            entity = PlaylistEntity::class,
            parentColumns = ["id"],
            childColumns = ["playlistId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [
        Index(value = ["playlistId", "type", "categoryId"], unique = true),
        Index(value = ["playlistId", "isFavorite"]),
    ],
)
data class CategoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val playlistId: Long,
    val categoryId: String,
    val name: String,
    val type: ContentType,
    val isFavorite: Boolean = false,
    val isLoaded: Boolean = false,
    val lastUpdated: Long = 0L,
)

/** Indexed stream item belonging to a playlist and category. */
@Entity(
    tableName = "streams",
    foreignKeys = [
        ForeignKey(
            entity = PlaylistEntity::class,
            parentColumns = ["id"],
            childColumns = ["playlistId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [
        Index(value = ["playlistId", "type", "categoryId"]),
        Index(value = ["playlistId", "stableKey"]),
    ],
)
data class StreamEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val playlistId: Long,
    val categoryId: String,
    val streamId: String,
    val stableKey: String,
    val name: String,
    val streamUrl: String,
    val logoUrl: String = "",
    val containerExtension: String = "",
    val type: ContentType,
)

/** Full-text search virtual table backed by [StreamEntity]. */
@Fts4(contentEntity = StreamEntity::class)
@Entity(tableName = "streams_fts")
data class StreamFtsEntity(
    val name: String,
)

/** User-favorited stream keyed by playlist and deterministic [stableKey]. */
@Entity(
    tableName = "favorite_streams",
    primaryKeys = ["playlistId", "stableKey"],
    foreignKeys = [
        ForeignKey(
            entity = PlaylistEntity::class,
            parentColumns = ["id"],
            childColumns = ["playlistId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class FavoriteStreamEntity(
    val playlistId: Long,
    val stableKey: String,
    val streamId: String,
    val name: String,
    val logoUrl: String = "",
    val streamUrl: String,
    val containerExtension: String = "",
    val type: ContentType,
)
