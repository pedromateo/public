package com.iptvisor.app.data.repository

import android.content.Context
import android.net.Uri
import androidx.room.withTransaction
import com.iptvisor.app.data.backup.BackupCategoryFav
import com.iptvisor.app.data.backup.BackupFavoriteStream
import com.iptvisor.app.data.backup.BackupPlaylist
import com.iptvisor.app.data.backup.ConfigBackupManager
import com.iptvisor.app.data.local.AppDatabase
import com.iptvisor.app.data.local.CategoryEntity
import com.iptvisor.app.data.local.CategoryFavKey
import com.iptvisor.app.data.local.FavoriteStreamEntity
import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.local.StreamEntity
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.PlaylistType
import com.iptvisor.app.data.model.SeriesInfo
import com.iptvisor.app.data.remote.M3uStreamingParser
import com.iptvisor.app.data.remote.XtreamStreamingClient
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf

/**
 * Single source of truth coordinating Room persistence, M3U streaming import,
 * and Xtream Codes API loading/indexing.
 */
class PlaylistRepository(
    private val context: Context,
    private val database: AppDatabase,
    private val m3uParser: M3uStreamingParser,
    private val xtreamClient: XtreamStreamingClient,
) {

    private val playlistDao = database.playlistDao()
    private val categoryDao = database.categoryDao()
    private val streamDao = database.streamDao()
    private val favoriteDao = database.favoriteDao()

    fun observePlaylists(): Flow<List<PlaylistEntity>> = playlistDao.observeAll()

    suspend fun getPlaylist(id: Long): PlaylistEntity? = playlistDao.getById(id)

    /**
     * Inserts or updates [playlist]. If it is new or its connection details changed,
     * initial categories (Xtream) or full stream indexing (M3U) is performed.
     */
    suspend fun savePlaylist(playlist: PlaylistEntity): Long {
        if (playlist.id == 0L) {
            val id = playlistDao.insert(playlist)
            refreshPlaylist(id)
            autoBackup()
            return id
        }

        val existing = playlistDao.getById(playlist.id)
        playlistDao.update(playlist)

        val connectionChanged = existing == null ||
            existing.type != playlist.type ||
            existing.serverUrl != playlist.serverUrl ||
            existing.username != playlist.username ||
            existing.password != playlist.password ||
            existing.m3uUri != playlist.m3uUri

        if (connectionChanged) {
            refreshPlaylist(playlist.id)
        }
        autoBackup()
        return playlist.id
    }

    suspend fun deletePlaylist(playlistId: Long) {
        playlistDao.deleteById(playlistId)
        autoBackup()
    }

    /**
     * Reloads categories/streams for [playlistId] while preserving favorite category flags
     * and leaving [FavoriteStreamEntity] entries untouched.
     */
    suspend fun refreshPlaylist(playlistId: Long) {
        val playlist = playlistDao.getById(playlistId) ?: return
        val favoriteKeys = categoryDao.getFavoriteKeys(playlistId).toSet()
        val now = System.currentTimeMillis()

        when (playlist.type) {
            PlaylistType.XTREAM -> {
                val allCategories = ArrayList<CategoryEntity>()
                for (type in ContentType.entries) {
                    val fetched = xtreamClient.fetchCategories(playlist, type)
                    fetched.mapTo(allCategories) { cat ->
                        val key = CategoryFavKey(cat.type, cat.categoryId)
                        if (key in favoriteKeys) cat.copy(isFavorite = true) else cat
                    }
                }
                database.withTransaction {
                    streamDao.deleteByPlaylist(playlistId)
                    categoryDao.deleteByPlaylist(playlistId)
                    if (allCategories.isNotEmpty()) {
                        categoryDao.upsertAll(allCategories)
                    }
                    playlistDao.markFullyIndexed(playlistId, indexed = false, updatedAt = now)
                }
            }
            PlaylistType.M3U_URL, PlaylistType.M3U_FILE -> {
                database.withTransaction {
                    streamDao.deleteByPlaylist(playlistId)
                    categoryDao.deleteByPlaylist(playlistId)
                }

                val onBatch: suspend (List<CategoryEntity>, List<StreamEntity>) -> Unit =
                    { categories, streams ->
                        database.withTransaction {
                            if (categories.isNotEmpty()) {
                                val restored = categories.map { cat ->
                                    val key = CategoryFavKey(cat.type, cat.categoryId)
                                    if (key in favoriteKeys) cat.copy(isFavorite = true) else cat
                                }
                                categoryDao.upsertAll(restored)
                            }
                            if (streams.isNotEmpty()) {
                                streamDao.insertAll(streams)
                            }
                        }
                    }

                if (playlist.type == PlaylistType.M3U_URL) {
                    m3uParser.parseFromUrl(
                        url = playlist.m3uUri,
                        userAgent = playlist.userAgent,
                        playlistId = playlistId,
                        onBatch = onBatch,
                    )
                } else {
                    m3uParser.parseFromContentUri(
                        context = context,
                        uri = Uri.parse(playlist.m3uUri),
                        playlistId = playlistId,
                        onBatch = onBatch,
                    )
                }

                playlistDao.markFullyIndexed(
                    playlistId = playlistId,
                    indexed = true,
                    updatedAt = System.currentTimeMillis(),
                )
            }
        }
    }

    fun observeCategories(playlistId: Long, type: ContentType): Flow<List<CategoryEntity>> =
        categoryDao.observeByType(playlistId, type)

    fun observeFavoriteCategories(playlistId: Long): Flow<List<CategoryEntity>> =
        categoryDao.observeFavorites(playlistId)

    suspend fun toggleCategoryFavorite(categoryId: Long, isFavorite: Boolean) {
        categoryDao.setFavorite(categoryId, isFavorite)
        autoBackup()
    }

    fun observeStreams(
        playlistId: Long,
        type: ContentType,
        categoryId: String,
    ): Flow<List<StreamEntity>> = streamDao.observeByCategory(playlistId, type, categoryId)

    /**
     * Ensures streams for [categoryId] are cached in Room for Xtream playlists.
     * No-op for M3U playlists or already-loaded categories unless [forceRefresh] is true.
     */
    suspend fun ensureCategoryLoaded(
        playlistId: Long,
        type: ContentType,
        categoryId: String,
        forceRefresh: Boolean = false,
    ) {
        val playlist = playlistDao.getById(playlistId) ?: return
        if (playlist.type != PlaylistType.XTREAM) return

        if (!forceRefresh) {
            val loadedKeys = categoryDao.getLoadedKeys(playlistId)
            if (CategoryFavKey(type, categoryId) in loadedKeys) return
        }

        var cleared = false
        xtreamClient.streamStreams(playlist, type, categoryId) { batch ->
            database.withTransaction {
                if (!cleared) {
                    streamDao.deleteByCategory(playlistId, type, categoryId)
                    cleared = true
                }
                streamDao.insertAll(batch)
            }
        }

        database.withTransaction {
            if (!cleared) {
                streamDao.deleteByCategory(playlistId, type, categoryId)
            }
            categoryDao.setLoaded(
                playlistId = playlistId,
                type = type,
                categoryId = categoryId,
                isLoaded = true,
                updatedAt = System.currentTimeMillis(),
            )
        }
    }

    /**
     * Streams all LIVE, VOD, and SERIES items for an Xtream playlist into Room + FTS4
     * in batches of 1000, marking all categories loaded and the playlist fully indexed.
     */
    suspend fun indexAllXtreamStreams(
        playlistId: Long,
        onProgress: (Int) -> Unit = {},
    ) {
        val playlist = playlistDao.getById(playlistId) ?: return
        if (playlist.type != PlaylistType.XTREAM) return

        streamDao.deleteByPlaylist(playlistId)

        var totalIndexed = 0
        for (type in ContentType.entries) {
            xtreamClient.streamStreams(playlist, type, categoryId = null) { batch ->
                database.withTransaction {
                    streamDao.insertAll(batch)
                }
                totalIndexed += batch.size
                onProgress(totalIndexed)
            }
        }

        val now = System.currentTimeMillis()
        database.withTransaction {
            for (type in ContentType.entries) {
                val categories = categoryDao.observeByType(playlistId, type).first()
                if (categories.isNotEmpty()) {
                    categoryDao.upsertAll(
                        categories.map { it.copy(isLoaded = true, lastUpdated = now) },
                    )
                }
            }
            playlistDao.markFullyIndexed(playlistId, indexed = true, updatedAt = now)
        }
    }

    /**
     * Searches cached streams for [playlistId] using a sanitized FTS4 prefix query.
     */
    fun searchStreams(playlistId: Long, query: String): Flow<List<StreamEntity>> {
        val ftsQuery = buildSafeFtsQuery(query) ?: return flowOf(emptyList())
        return streamDao.searchFts(playlistId, ftsQuery)
    }

    fun observeFavorites(playlistId: Long): Flow<List<FavoriteStreamEntity>> =
        favoriteDao.observeByPlaylist(playlistId)

    fun isFavorite(playlistId: Long, stableKey: String): Flow<Boolean> =
        favoriteDao.isFavorite(playlistId, stableKey)

    suspend fun toggleFavorite(stream: StreamEntity) {
        val currentlyFav = favoriteDao.isFavorite(stream.playlistId, stream.stableKey).first()
        if (currentlyFav) {
            favoriteDao.delete(stream.playlistId, stream.stableKey)
        } else {
            favoriteDao.upsert(
                FavoriteStreamEntity(
                    playlistId = stream.playlistId,
                    stableKey = stream.stableKey,
                    streamId = stream.streamId,
                    name = stream.name,
                    logoUrl = stream.logoUrl,
                    streamUrl = stream.streamUrl,
                    containerExtension = stream.containerExtension,
                    type = stream.type,
                ),
            )
        }
        autoBackup()
    }

    suspend fun removeFavorite(playlistId: Long, stableKey: String) {
        favoriteDao.delete(playlistId, stableKey)
        autoBackup()
    }

    suspend fun getFavorite(playlistId: Long, stableKey: String): FavoriteStreamEntity? =
        favoriteDao.observeByPlaylist(playlistId).first().firstOrNull { it.stableKey == stableKey }

    suspend fun exportBackupToUri(uri: Uri) {
        val json = buildBackupJson()
        ConfigBackupManager.writeToUri(context, uri, json)
    }

    suspend fun importBackupFromUri(uri: Uri): Int {
        val json = ConfigBackupManager.readFromUri(context, uri)
        val payload = ConfigBackupManager.deserialize(json)
        val existing = playlistDao.observeAll().first()
        var importedCount = 0

        for (backup in payload.playlists) {
            val alreadyExists = existing.any {
                it.name == backup.name &&
                    it.type == backup.type &&
                    it.serverUrl == backup.serverUrl &&
                    it.username == backup.username &&
                    it.m3uUri == backup.m3uUri
            }
            if (alreadyExists) continue

            val newId = playlistDao.insert(
                PlaylistEntity(
                    name = backup.name,
                    type = backup.type,
                    serverUrl = backup.serverUrl,
                    username = backup.username,
                    password = backup.password,
                    m3uUri = backup.m3uUri,
                    userAgent = backup.userAgent,
                ),
            )

            for (fav in backup.favoriteStreams) {
                favoriteDao.upsert(
                    FavoriteStreamEntity(
                        playlistId = newId,
                        stableKey = fav.stableKey,
                        streamId = fav.streamId,
                        name = fav.name,
                        logoUrl = fav.logoUrl,
                        streamUrl = fav.streamUrl,
                        containerExtension = fav.containerExtension,
                        type = fav.type,
                    ),
                )
            }

            runCatching { refreshPlaylist(newId) }

            if (backup.favoriteCategories.isNotEmpty()) {
                val favKeys = backup.favoriteCategories.map { CategoryFavKey(it.type, it.categoryId) }.toSet()
                for (type in ContentType.entries) {
                    val cats = categoryDao.observeByType(newId, type).first()
                    val toUpdate = cats.filter { CategoryFavKey(it.type, it.categoryId) in favKeys }
                    if (toUpdate.isNotEmpty()) {
                        categoryDao.upsertAll(toUpdate.map { it.copy(isFavorite = true) })
                    }
                }
            }
            importedCount++
        }

        autoBackup()
        return importedCount
    }

    private suspend fun buildBackupJson(): String {
        val playlists = playlistDao.observeAll().first()
        val backupPlaylists = playlists.map { pl ->
            val favCats = categoryDao.getFavoriteKeys(pl.id).map {
                BackupCategoryFav(type = it.type, categoryId = it.categoryId)
            }
            val favStreams = favoriteDao.observeByPlaylist(pl.id).first().map {
                BackupFavoriteStream(
                    stableKey = it.stableKey,
                    streamId = it.streamId,
                    name = it.name,
                    logoUrl = it.logoUrl,
                    streamUrl = it.streamUrl,
                    containerExtension = it.containerExtension,
                    type = it.type,
                )
            }
            BackupPlaylist(
                name = pl.name,
                type = pl.type,
                serverUrl = pl.serverUrl,
                username = pl.username,
                password = pl.password,
                m3uUri = pl.m3uUri,
                userAgent = pl.userAgent,
                favoriteCategories = favCats,
                favoriteStreams = favStreams,
            )
        }
        return ConfigBackupManager.serialize(backupPlaylists)
    }

    private suspend fun autoBackup() {
        runCatching {
            val json = buildBackupJson()
            ConfigBackupManager.autoSaveToDownloads(context, json)
        }
    }

    suspend fun getSeriesInfo(playlistId: Long, seriesId: String): SeriesInfo {
        val playlist = playlistDao.getById(playlistId)
            ?: throw IllegalArgumentException("Playlist not found: $playlistId")
        return xtreamClient.fetchSeriesInfo(playlist, seriesId)
    }

    suspend fun getStreamById(streamId: Long): StreamEntity? = streamDao.getById(streamId)

    private fun buildSafeFtsQuery(rawQuery: String): String? {
        val tokens = FTS_TOKEN_REGEX.findAll(rawQuery)
            .map { it.value }
            .filter { it.isNotEmpty() }
            .toList()
        if (tokens.isEmpty()) return null
        return tokens.joinToString(" ") { "$it*" }
    }

    private companion object {
        val FTS_TOKEN_REGEX = Regex("[\\p{L}\\p{N}]+")
    }
}
