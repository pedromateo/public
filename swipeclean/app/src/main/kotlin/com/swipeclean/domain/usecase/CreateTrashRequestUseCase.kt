package com.swipeclean.domain.usecase

import android.content.IntentSender
import android.net.Uri
import com.swipeclean.data.repository.PhotoRepository

class CreateTrashRequestUseCase(
    private val repository: PhotoRepository
) {
    operator fun invoke(uris: List<Uri>, trash: Boolean = true): IntentSender? {
        return repository.createTrashIntentSender(uris, trash)
    }
}
