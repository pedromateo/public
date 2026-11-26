package com.iptvisor.app.ui.playlists

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iptvisor.app.IPTVisorApp
import com.iptvisor.app.data.local.PlaylistEntity
import com.iptvisor.app.data.model.PlaylistType
import java.text.DateFormat
import java.util.Date

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlaylistSelectorScreen(
    onPlaylistSelected: (Long) -> Unit
) {
    val context = LocalContext.current
    val container = (context.applicationContext as IPTVisorApp).container
    val viewModel: PlaylistSelectorViewModel = viewModel(
        factory = PlaylistSelectorViewModel.factory(container.repository)
    )

    val uiState by viewModel.uiState.collectAsState()
    val refreshingId by viewModel.refreshingId.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showEditorDialog by remember { mutableStateOf(false) }
    var editingPlaylist by remember { mutableStateOf<PlaylistEntity?>(null) }
    var playlistPendingDelete by remember { mutableStateOf<PlaylistEntity?>(null) }

    LaunchedEffect(uiState.errorMessage) {
        val error = uiState.errorMessage
        if (error != null) {
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("IPTVisor") }
            )
        },
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = {
                    editingPlaylist = null
                    showEditorDialog = true
                },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("+ Añadir lista") }
            )
        }
    ) { innerPadding ->
        if (uiState.playlists.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.List,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "No hay listas guardadas. Pulsa + para añadir una lista M3U o Xtream.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(
                    items = uiState.playlists,
                    key = { it.id }
                ) { playlist ->
                    PlaylistCard(
                        playlist = playlist,
                        isRefreshing = refreshingId == playlist.id,
                        onClick = { onPlaylistSelected(playlist.id) },
                        onEdit = {
                            editingPlaylist = playlist
                            showEditorDialog = true
                        },
                        onRefresh = { viewModel.refreshPlaylist(playlist.id) },
                        onDelete = { playlistPendingDelete = playlist }
                    )
                }
            }
        }
    }

    if (showEditorDialog) {
        PlaylistEditorDialog(
            initialPlaylist = editingPlaylist,
            isSaving = uiState.isSaving,
            onDismiss = {
                if (!uiState.isSaving) {
                    showEditorDialog = false
                    editingPlaylist = null
                }
            },
            onSave = { name, type, serverUrl, username, password, m3uUri, userAgent ->
                viewModel.savePlaylist(
                    existingId = editingPlaylist?.id ?: 0L,
                    name = name,
                    type = type,
                    serverUrl = serverUrl,
                    username = username,
                    password = password,
                    m3uUri = m3uUri,
                    userAgent = userAgent,
                    onSuccess = {
                        showEditorDialog = false
                        editingPlaylist = null
                    }
                )
            }
        )
    }

    playlistPendingDelete?.let { target ->
        AlertDialog(
            onDismissRequest = { playlistPendingDelete = null },
            title = { Text("Eliminar lista") },
            text = { Text("¿Seguro que quieres eliminar \"${target.name}\"?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deletePlaylist(target.id)
                        playlistPendingDelete = null
                    }
                ) {
                    Text("Eliminar", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { playlistPendingDelete = null }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
private fun PlaylistCard(
    playlist: PlaylistEntity,
    isRefreshing: Boolean,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onRefresh: () -> Unit,
    onDelete: () -> Unit
) {
    val typeBadgeLabel = when (playlist.type) {
        PlaylistType.XTREAM -> "XTREAM"
        PlaylistType.M3U_URL, PlaylistType.M3U_FILE -> "M3U"
    }
    val formattedDate = remember(playlist.lastUpdated) {
        if (playlist.lastUpdated <= 0L) {
            "Sin actualizar"
        } else {
            DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)
                .format(Date(playlist.lastUpdated))
        }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = playlist.name,
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Badge(
                        containerColor = if (playlist.type == PlaylistType.XTREAM) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.secondaryContainer
                        }
                    ) {
                        Text(
                            text = typeBadgeLabel,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Actualizada: $formattedDate",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (isRefreshing) {
                CircularProgressIndicator(
                    modifier = Modifier
                        .padding(horizontal = 8.dp)
                        .size(24.dp),
                    strokeWidth = 2.dp
                )
            } else {
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                }
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, contentDescription = "Editar")
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = "Eliminar")
            }
        }
    }
}

@Composable
private fun PlaylistEditorDialog(
    initialPlaylist: PlaylistEntity?,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onSave: (
        name: String,
        type: PlaylistType,
        serverUrl: String,
        username: String,
        password: String,
        m3uUri: String,
        userAgent: String
    ) -> Unit
) {
    val context = LocalContext.current

    var selectedType by remember(initialPlaylist) {
        mutableStateOf(initialPlaylist?.type ?: PlaylistType.XTREAM)
    }
    var name by remember(initialPlaylist) { mutableStateOf(initialPlaylist?.name ?: "") }
    var serverUrl by remember(initialPlaylist) { mutableStateOf(initialPlaylist?.serverUrl ?: "") }
    var username by remember(initialPlaylist) { mutableStateOf(initialPlaylist?.username ?: "") }
    var password by remember(initialPlaylist) { mutableStateOf(initialPlaylist?.password ?: "") }
    var m3uUri by remember(initialPlaylist) { mutableStateOf(initialPlaylist?.m3uUri ?: "") }
    var userAgent by remember(initialPlaylist) { mutableStateOf(initialPlaylist?.userAgent ?: "") }

    val openDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            try {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            } catch (_: SecurityException) {
                // Document provider may not grant persistable permission; keep URI anyway.
            }
            m3uUri = uri.toString()
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(if (initialPlaylist == null) "Añadir lista" else "Editar lista")
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    FilterChip(
                        selected = selectedType == PlaylistType.XTREAM,
                        onClick = { selectedType = PlaylistType.XTREAM },
                        label = { Text("Xtream Codes") },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChip(
                        selected = selectedType == PlaylistType.M3U_URL,
                        onClick = { selectedType = PlaylistType.M3U_URL },
                        label = { Text("URL M3U") },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChip(
                        selected = selectedType == PlaylistType.M3U_FILE,
                        onClick = { selectedType = PlaylistType.M3U_FILE },
                        label = { Text("Archivo .m3u") },
                        modifier = Modifier.weight(1f)
                    )
                }

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nombre") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                when (selectedType) {
                    PlaylistType.XTREAM -> {
                        OutlinedTextField(
                            value = serverUrl,
                            onValueChange = { serverUrl = it },
                            label = { Text("URL del servidor (http://...)") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = username,
                            onValueChange = { username = it },
                            label = { Text("Usuario") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            label = { Text("Contraseña") },
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    PlaylistType.M3U_URL -> {
                        OutlinedTextField(
                            value = m3uUri,
                            onValueChange = { m3uUri = it },
                            label = { Text("URL de la lista M3U") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    PlaylistType.M3U_FILE -> {
                        OutlinedButton(
                            onClick = { openDocumentLauncher.launch(arrayOf("*/*")) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Seleccionar archivo .m3u local")
                        }
                        if (m3uUri.isNotBlank()) {
                            Text(
                                text = m3uUri,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = userAgent,
                    onValueChange = { userAgent = it },
                    label = { Text("User-Agent (opcional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(name, selectedType, serverUrl, username, password, m3uUri, userAgent)
                },
                enabled = !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text("Guardar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSaving) {
                Text("Cancelar")
            }
        }
    )
}
