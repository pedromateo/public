package com.iptvisor.app.data.backup

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.annotation.RequiresApi
import com.google.gson.GsonBuilder
import com.iptvisor.app.data.model.ContentType
import com.iptvisor.app.data.model.PlaylistType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class BackupCategoryFav(
    val type: ContentType,
    val categoryId: String,
)

data class BackupFavoriteStream(
    val stableKey: String,
    val streamId: String,
    val name: String,
    val logoUrl: String = "",
    val streamUrl: String,
    val containerExtension: String = "",
    val type: ContentType,
)

data class BackupPlaylist(
    val name: String,
    val type: PlaylistType,
    val serverUrl: String = "",
    val username: String = "",
    val password: String = "",
    val m3uUri: String = "",
    val userAgent: String = "",
    val favoriteCategories: List<BackupCategoryFav> = emptyList(),
    val favoriteStreams: List<BackupFavoriteStream> = emptyList(),
)

data class BackupPayload(
    val version: Int = 1,
    val exportedAt: Long = System.currentTimeMillis(),
    val playlists: List<BackupPlaylist> = emptyList(),
)

/**
 * Handles JSON serialization and external storage persistence of playlist configurations
 * and favorites so they survive app uninstall/reinstall.
 */
object ConfigBackupManager {

    private const val BACKUP_FILENAME = "iptvisor-backup.json"
    private val gson = GsonBuilder().setPrettyPrinting().create()

    fun serialize(playlists: List<BackupPlaylist>): String =
        gson.toJson(BackupPayload(playlists = playlists))

    fun deserialize(json: String): BackupPayload =
        gson.fromJson(json, BackupPayload::class.java) ?: BackupPayload()

    suspend fun writeToUri(context: Context, uri: Uri, json: String) {
        withContext(Dispatchers.IO) {
            context.contentResolver.openOutputStream(uri)?.use { out ->
                out.write(json.toByteArray(Charsets.UTF_8))
                out.flush()
            } ?: error("No se pudo abrir el archivo de destino.")
        }
    }

    suspend fun readFromUri(context: Context, uri: Uri): String =
        withContext(Dispatchers.IO) {
            context.contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use {
                it.readText()
            } ?: error("No se pudo leer el archivo seleccionado.")
        }

    /**
     * Automatically writes/updates `Downloads/IPTVisor/iptvisor-backup.json` on Android 10+
     * without requiring runtime storage permissions.
     */
    suspend fun autoSaveToDownloads(context: Context, json: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
        autoSaveToDownloadsQ(context, json)
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private suspend fun autoSaveToDownloadsQ(context: Context, json: String) {
        withContext(Dispatchers.IO) {
            runCatching {
                val resolver = context.contentResolver
                val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
                val relativePath = "${Environment.DIRECTORY_DOWNLOADS}/IPTVisor"

                resolver.delete(
                    collection,
                    "${MediaStore.Downloads.DISPLAY_NAME} = ? AND ${MediaStore.Downloads.RELATIVE_PATH} LIKE ?",
                    arrayOf(BACKUP_FILENAME, "%IPTVisor%"),
                )

                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, BACKUP_FILENAME)
                    put(MediaStore.Downloads.MIME_TYPE, "application/json")
                    put(MediaStore.Downloads.RELATIVE_PATH, relativePath)
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }

                val itemUri = resolver.insert(collection, values) ?: return@runCatching
                resolver.openOutputStream(itemUri)?.use { out ->
                    out.write(json.toByteArray(Charsets.UTF_8))
                    out.flush()
                }
                values.clear()
                values.put(MediaStore.Downloads.IS_PENDING, 0)
                resolver.update(itemUri, values, null, null)
            }
        }
    }
}
