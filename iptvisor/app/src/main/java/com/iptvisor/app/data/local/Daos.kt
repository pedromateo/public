package com.iptvisor.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.iptvisor.app.data.model.ContentType
import kotlinx.coroutines.flow.Flow

/** Projection for preserving category favorite/loaded flags across refreshes. */
data class CategoryFavKey(
    val type: ContentType,
    val categoryId: String,
)

@Dao
interface PlaylistDao {

    @Query("SELECT * FROM playlists ORDER BY id ASC")
    fun observeAll(): Flow<List<PlaylistEntity>>

    @Query("SELECT * FROM playlists WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): PlaylistEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(playlist: PlaylistEntity): Long

    @Update
    suspend fun update(playlist: PlaylistEntity)

    @Query("DELETE FROM playlists WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query(
        "UPDATE playlists SET isFullyIndexed = :indexed, lastUpdated = :updatedAt " +
            "WHERE id = :playlistId",
    )
    suspend fun markFullyIndexed(playlistId: Long, indexed: Boolean, updatedAt: Long)
}

@Dao
interface CategoryDao {

    @Query(
        "SELECT * FROM categories WHERE playlistId = :playlistId AND type = :type " +
            "ORDER BY name ASC",
    )
    fun observeByType(playlistId: Long, type: ContentType): Flow<List<CategoryEntity>>

    @Query(
        "SELECT * FROM categories WHERE playlistId = :playlistId AND isFavorite = 1 " +
            "ORDER BY name ASC",
    )
    fun observeFavorites(playlistId: Long): Flow<List<CategoryEntity>>

    @Query(
        "SELECT type, categoryId FROM categories " +
            "WHERE playlistId = :playlistId AND isFavorite = 1",
    )
    suspend fun getFavoriteKeys(playlistId: Long): List<CategoryFavKey>

    @Query(
        "SELECT type, categoryId FROM categories " +
            "WHERE playlistId = :playlistId AND isLoaded = 1",
    )
    suspend fun getLoadedKeys(playlistId: Long): List<CategoryFavKey>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(categories: List<CategoryEntity>)

    @Query("DELETE FROM categories WHERE playlistId = :playlistId")
    suspend fun deleteByPlaylist(playlistId: Long)

    @Query("UPDATE categories SET isFavorite = :isFavorite WHERE id = :id")
    suspend fun setFavorite(id: Long, isFavorite: Boolean)

    @Query(
        "UPDATE categories SET isLoaded = :isLoaded, lastUpdated = :updatedAt " +
            "WHERE playlistId = :playlistId AND type = :type AND categoryId = :categoryId",
    )
    suspend fun setLoaded(
        playlistId: Long,
        type: ContentType,
        categoryId: String,
        isLoaded: Boolean,
        updatedAt: Long,
    )
}

@Dao
interface StreamDao {

    @Query(
        "SELECT * FROM streams " +
            "WHERE playlistId = :playlistId AND type = :type AND categoryId = :categoryId " +
            "ORDER BY id ASC",
    )
    fun observeByCategory(
        playlistId: Long,
        type: ContentType,
        categoryId: String,
    ): Flow<List<StreamEntity>>

    @Query("SELECT * FROM streams WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): StreamEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(streams: List<StreamEntity>)

    @Query(
        "DELETE FROM streams " +
            "WHERE playlistId = :playlistId AND type = :type AND categoryId = :categoryId",
    )
    suspend fun deleteByCategory(playlistId: Long, type: ContentType, categoryId: String)

    @Query("DELETE FROM streams WHERE playlistId = :playlistId")
    suspend fun deleteByPlaylist(playlistId: Long)

    @Query(
        "SELECT streams.* FROM streams " +
            "JOIN streams_fts ON streams.id = streams_fts.rowid " +
            "WHERE streams.playlistId = :playlistId AND streams_fts MATCH :ftsQuery LIMIT 200",
    )
    fun searchFts(playlistId: Long, ftsQuery: String): Flow<List<StreamEntity>>
}

@Dao
interface FavoriteDao {

    @Query("SELECT * FROM favorite_streams WHERE playlistId = :playlistId ORDER BY name ASC")
    fun observeByPlaylist(playlistId: Long): Flow<List<FavoriteStreamEntity>>

    @Query(
        "SELECT EXISTS(SELECT 1 FROM favorite_streams " +
            "WHERE playlistId = :playlistId AND stableKey = :stableKey)",
    )
    fun isFavorite(playlistId: Long, stableKey: String): Flow<Boolean>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(favorite: FavoriteStreamEntity)

    @Query(
        "DELETE FROM favorite_streams " +
            "WHERE playlistId = :playlistId AND stableKey = :stableKey",
    )
    suspend fun delete(playlistId: Long, stableKey: String)
}
