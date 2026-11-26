package com.iptvisor.app.ui.playlists

import android.net.Uri
import androidx.lifecycle.ViewModel
import android.net.Uri
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.model.PlaylistType
import com.iptvisor.app.data.repository.PlaylistRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class PlaylistSelectorUiState(
    val playlists: List<PlaylistEntity> = emptyList(),
    val isSaving: Boolean = false,
    val errorMessage: String? = null
)

class PlaylistSelectorViewModel(
    private val repository: PlaylistRepository
) : ViewModel() {

    private val isSavingFlow = MutableStateFlow(false)
    private val errorMessageFlow = MutableStateFlow<String?>(null)
    private val _refreshingId = MutableStateFlow<Long?>(null)
    val refreshingId: StateFlow<Long?> = _refreshingId.asStateFlow()

    val uiState: StateFlow<PlaylistSelectorUiState> = combine(
        repository.observePlaylists(),
        isSavingFlow,
        errorMessageFlow
    ) { playlists, isSaving, errorMessage ->
        PlaylistSelectorUiState(
            playlists = playlists,
            isSaving = isSaving,
            errorMessage = errorMessage
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = PlaylistSelectorUiState()
    )

    fun savePlaylist(
        existingId: Long = 0L,
        name: String,
        type: PlaylistType,
        serverUrl: String = "",
        username: String = "",
        password: String = "",
        m3uUri: String = "",
        userAgent: String = "",
        onSuccess: () -> Unit = {}
    ) {
        val trimmedName = name.trim()
        if (trimmedName.isEmpty()) {
            errorMessageFlow.value = "El nombre de la lista no puede estar vacío."
            return
        }

        val trimmedServer = serverUrl.trim().trimEnd('/')
        val trimmedUser = username.trim()
        val trimmedM3u = m3uUri.trim()

        when (type) {
            PlaylistType.XTREAM -> {
                if (trimmedServer.isEmpty() || trimmedUser.isEmpty() || password.isBlank()) {
                    errorMessageFlow.value = "Completa servidor, usuario y contraseña de Xtream."
                    return
                }
            }
            PlaylistType.M3U_URL -> {
                if (trimmedM3u.isEmpty()) {
                    errorMessageFlow.value = "Introduce una URL M3U válida."
                    return
                }
            }
            PlaylistType.M3U_FILE -> {
                if (trimmedM3u.isEmpty()) {
                    errorMessageFlow.value = "Selecciona un archivo .m3u local."
                    return
                }
            }
        }

        viewModelScope.launch {
            isSavingFlow.value = true
            errorMessageFlow.value = null
            try {
                val entity = PlaylistEntity(
                    id = existingId,
                    name = trimmedName,
                    type = type,
                    serverUrl = if (type == PlaylistType.XTREAM) trimmedServer else "",
                    username = if (type == PlaylistType.XTREAM) trimmedUser else "",
                    password = if (type == PlaylistType.XTREAM) password else "",
                    m3uUri = if (type != PlaylistType.XTREAM) trimmedM3u else "",
                    userAgent = userAgent.trim()
                )
                repository.savePlaylist(entity)
                onSuccess()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMessageFlow.value = e.message ?: "Error al guardar la lista."
            } finally {
                isSavingFlow.value = false
            }
        }
    }

    fun deletePlaylist(id: Long) {
        viewModelScope.launch {
            errorMessageFlow.value = null
            try {
                repository.deletePlaylist(id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMessageFlow.value = e.message ?: "Error al eliminar la lista."
            }
        }
    }

    fun refreshPlaylist(id: Long) {
        viewModelScope.launch {
            _refreshingId.value = id
            errorMessageFlow.value = null
            try {
                repository.refreshPlaylist(id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMessageFlow.value = e.message ?: "Error al actualizar la lista."
            } finally {
                _refreshingId.value = null
            }
        }
    }

    fun clearError() {
        errorMessageFlow.value = null
    }

    fun exportBackup(uri: Uri) {
        viewModelScope.launch {
            isSavingFlow.value = true
            errorMessageFlow.value = null
            try {
                repository.exportBackupToUri(uri)
                errorMessageFlow.value = "Copia de configuración guardada."
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMessageFlow.value = e.message ?: "Error al exportar la copia."
            } finally {
                isSavingFlow.value = false
            }
        }
    }

    fun importBackup(uri: Uri) {
        viewModelScope.launch {
            isSavingFlow.value = true
            errorMessageFlow.value = null
            try {
                val count = repository.importBackupFromUri(uri)
                errorMessageFlow.value = if (count > 0) {
                    "Restauradas $count listas correctamente."
                } else {
                    "No había listas nuevas para restaurar."
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                errorMessageFlow.value = e.message ?: "Error al restaurar la copia."
            } finally {
                isSavingFlow.value = false
            }
        }
    }

    companion object {
        fun factory(repository: PlaylistRepository): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    return PlaylistSelectorViewModel(repository) as T
                }
            }
    }
}
