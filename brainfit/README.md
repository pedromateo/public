# 🧠🍭 Brain-Fit 3000

**Brain-Fit 3000** es una aplicación web interactiva de entrenamiento cerebral y agilidad mental de alto ritmo. Diseñada con una estética brillante estilo *"Candy/Bubblegum 3D"*, la aplicación ofrece una experiencia inmersiva compuesta por 17 minijuegos dinámicos que desafían la memoria, la velocidad de cálculo, la atención selectiva, la lógica visual, la coordinación motora y el procesamiento lingüístico.

---

## 🌟 Características Principales

- **🎮 17 Minijuegos Únicos**: Una gran variedad de desafíos cognitivos y de destreza motora.
- **⚡ Sistema de Bonificación Rápida (x2 Bonus)**: Otorga 10 puntos por respuesta correcta y un superbonus de +20 puntos si el nivel se resuelve en menos del 50% del tiempo disponible.
- **🎚️ 3 Niveles de Dificultad**:
  - **🌱 Fácil**: 20 segundos por nivel | 5s de memorización | Velocidad moderada.
  - **⚡ Medio**: 14 segundos por nivel | 3.5s de memorización | Velocidad estándar.
  - **🔥 Difícil**: 8 segundos por nivel | 2s de memorización | Alta velocidad.
- **📱 Mobile-First y Totalmente Responsivo**: Optimizado con eventos táctiles (`touch-action`, `touchstart`, `touchend`) y soporte para interacción con ratón en escritorio.
- **🚀 Zero Dependencies / Vanilla Architecture**: Proyecto estructurado modularmente (Módulos ES6) sin frameworks de UI pesados.
- **📱 PWA Instalable**: Funciona como una aplicación nativa gracias a su `manifest.json` y Service Worker con caché offline.
- **⚙️ Totalmente Configurable**: Personaliza todos los textos, activa/desactiva minijuegos y ajusta los tiempos desde un único archivo `config.json`.
- **🧪 Testing Integrado**: Suite de tests unitarios utilizando Vitest y JSDOM para garantizar la calidad del motor del juego.


---

## 🧩 Catálogo de Minijuegos (17 Pruebas)

| # | Minijuego | Habilidad Cognitiva / Motora | Descripción |
|---|---|---|---|
| 1 | **Cálculo Rápido (`calc`)** | Agilidad matemática | Sumas rápidas de dos dígitos con 4 opciones. |
| 2 | **Memoria de Secuencia (`mem_seq`)** | Memoria de trabajo visual | Memorizar el orden de 3 emoticonos y reproducirlo tras desaparecer. |
| 3 | **Test de Stroop (`stroop`)** | Inhibición y control atencional | Identificar el color de la tinta o el texto según la consigna aleatoria. |
| 4 | **Ordenación Numérica (`order_diff`)** | Procesamiento numérico y orden | Ordenar 5 números de mayor a menor o de menor a mayor. |
| 5 | **Búsqueda Visual (`odd_grid`)** | Percepción y atención selectiva | Encontrar el elemento diferente en una cuadrícula de 4x4. |
| 6 | **Completar Series (`pattern`)** | Razonamiento lógico inductivo | Descubrir el patrón matemático (creciente, decreciente, alternado o multiplicativo) y seleccionar el siguiente número. |
| 7 | **Anagramas (`anagram`)** | Procesamiento léxico y verbal | Desencriptar la palabra oculta tras letras desordenadas (banco de 100 palabras). |
| 8 | **Conteo Selectivo (`count_target`)** | Atención focalizada | Contar cuántos objetos objetivo aparecen en una rejilla de 5x5 rodeados de distractores. |
| 9 | **Sinónimos y Antónimos (`antonym`)** | Vocabulario y semántica | Identificar el sinónimo o antónimo correcto de la palabra presentada. |
| 10 | **Verificación de Ecuaciones (`equation_val`)** | Verificación rápida | Validar si una igualdad matemática expuesta es verdadera o falsa. |
| 11 | **Parada de Precisión (`precision_stop`)** | Destreza y timing | Detener un cursor móvil exactamente dentro de la zona verde de la barra. |
| 12 | **Clasificación Rápida (`swipe_sort`)** | Categorización rápida | Clasificar elementos (Fruta vs. Animal) mediante deslizamiento (swipe) o botones. |
| 13 | **Atrapar la Burbuja (`catch_target`)** | Coordinación ojo-mano | Atrapar 4 burbujas móviles en pantalla antes de que expire el tiempo. |
| 14 | **Encaje Gummy 2D (`drag_drop`)** | Habilidad visuoespacial y arrastre | Arrastrar 4 figuras de golosina y encajarlas en sus respectivas siluetas. |
| 15 | **Equilibrio (`balance`)** | Control motor sostenido | Mantener una balanza nivelada pulsando para compensar la inclinación constante. |
| 16 | **Sudoku Faltante (`sudoku_missing`)** | Deducción lógica | Encontrar qué número del 1 al 9 falta en un cuadrante de Sudoku 3x3. |
| 17 | **Orden de Dominó (`domino_order`)** | Cálculo de sumas y orden espacial | Ordenar 4 fichas de dominó según la suma total de sus puntos. |

---

## 🏗️ Arquitectura del Código

El proyecto sigue una arquitectura modular en JavaScript puro (ES6 Modules) dividida en archivos de responsabilidad única:

### 1. Sistema de Módulos (ES6)
- **`index.html`**: Punto de entrada minimalista, importa CSS y registra el módulo principal.
- **`js/data.js`**: Exporta los bancos de datos y carga el `config.json` de forma asíncrona.
- **`js/engine.js`**: Estado global (`State`) y ciclo de vida principal (`Engine`).
- **`js/games.js`**: Lógica individual de los 17 minijuegos.
- **`js/main.js`**: Bootstrap de arranque y Service Worker.

### 2. Archivo de Configuración (`config.json`)
El archivo de configuración externo permite modificar el juego sin tocar código:
- Cadenas de texto e idioma de la interfaz.
- Tiempos base y dificultad.
- Activar o desactivar minijuegos individuales (la app ajusta automáticamente el número total de niveles en la partida).

### 3. PWA (Progressive Web App)
- **`manifest.json`** y **`sw.js`** se encargan de almacenar en caché toda la aplicación (incluyendo assets y `config.json`) permitiendo jugar de forma fluida y sin conexión a internet tras la primera carga.

### 4. Tests y CI/CD
- Incorpora **Vitest** en el directorio `/tests` con pruebas que comprueban la integridad del State y el Engine.
- Integrado con GitHub Actions para test y despliegue continuo.

---

## 🛠️ Instalación y Uso

Al tratarse de una **PWA moderna con Módulos ES6 y Service Worker**, los navegadores modernos (Brave, Chrome, Edge, Firefox) requieren que la aplicación se sirva mediante un servidor HTTP/HTTPS (origen seguro) en lugar del protocolo local directo `file://` (que bloquea los módulos, el `manifest` y los Service Workers por políticas de seguridad/CORS).

### Opción 1: Servidor Node.js integrado (Recomendado)
1. Instala las dependencias de desarrollo (solo necesarias para tests):
   ```bash
   npm install
   ```
2. Inicia el servidor local:
   ```bash
   npm start
   ```
3. Abre en tu navegador [http://localhost:3000](http://localhost:3000).

### Opción 2: Con Python
```bash
python3 -m http.server 3000
```
Luego accede a [http://localhost:3000](http://localhost:3000).

### 🧪 Ejecutar Tests
```bash
npm run test
```

---

## 💻 Tecnologías Utilizadas

- **HTML5**: Estructura semántica.
- **CSS3**: Layouts Flexbox y Grid, variables de diseño, transformaciones 3D, animación de partículas y sombras.
- **JavaScript (ES6+)**: Manipulación del DOM, eventos de arrastre (`Touch` y `Pointer events`), motores de física ligera con `requestAnimationFrame`.
- **Google Fonts**: Tipografía *Nunito* (peso 600, 800, 900).

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.
