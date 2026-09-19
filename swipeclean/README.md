# SwipeClean 🧹📱

**SwipeClean** es una aplicación nativa para Android diseñada para clasificar y limpiar la galería fotográfica de manera ágil mediante interacción por tarjetas (*swipe cards*), con soporte completo para deshacer (Undo) espacial, métricas en tiempo real y borrado seguro mediante la papelera nativa de Android.

---

## ✨ Características Principales

- **Bucle de Swipe Intuitivo**: Desliza a la izquierda para descartar (papelera) y a la derecha para conservar.
- **Deshacer (Undo) Espacial**: Pila LIFO que restaura la foto a la cima de la baraja reingresando suavemente por el mismo lateral por donde salió.
- **Métricas Reactivas en Vivo**: Cálculo dinámico del espacio a liberar y fotos procesadas sin desfases de sincronización.
- **Agrupación por Álbumes y Carpetas**: Limpia por categorías (Cámara, WhatsApp, Descargas, Capturas de pantalla) o toda la galería.
- **Borrado Seguro Diferido**: Ninguna foto se elimina en tiempo real durante el swipe. La acción final invoca la API nativa de Android (`MediaStore.createTrashRequest`) para mover las fotos a la papelera del sistema durante 30 días, permitiendo su recuperación en caso de arrepentimiento.
- **100% Nativo en Jetpack Compose & Material 3**.

---

## 🏗️ Arquitectura

- **Patrón**: MVI / MVVM con Unidirectional Data Flow (UDF) y Clean Architecture ligera.
- **Imágenes**: Coil para Compose con downsampling y precarga en memoria.
- **Almacenamiento**: `MediaStore` respetando Scoped Storage (Android 13+ con `READ_MEDIA_IMAGES` y soporte para Android 10-12).

---

## 🚀 Integración Continua (CI/CD) en GitHub Actions

La aplicación está configurada con un flujo de trabajo automatizado en `.github/workflows/build-swipeclean-apk.yml`:

1. Cada `push` a la rama `main` que afecte a `swipeclean/` activa la compilación en una máquina virtual Ubuntu en los servidores de GitHub.
2. Se ejecutan automáticamente las pruebas unitarias de ViewModel (`./gradlew testDebugUnitTest`).
3. Se compila el paquete `app-debug.apk` (`./gradlew assembleDebug`).
4. **Descarga Directa**:
   - **GitHub Releases**: Se publica/actualiza automáticamente la versión en el apartado **Releases** (`tag: latest-apk`), permitiendo descargar el archivo `.apk` directamente desde el navegador de tu móvil e instalarlo con un toque.
   - **Artifacts**: También disponible como artefacto dentro del historial de ejecuciones de GitHub Actions.
