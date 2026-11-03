# 🍽️ MenuM — Menú Familiar Saludable & Decisor de Recetas (PWA)

**MenuM** es una Progressive Web App (PWA) móvil-primero (*mobile-first*) diseñada para planificar comidas familiares saludables, equilibradas y aptas para ser compartidas por toda la familia: tanto adultos como niños pequeños (incluso menores de 4 años).

Permite decidir qué cocinar en cuestión de segundos según lo que tengas en la despensa, ofrece guías rápidas de preparación paso a paso con consejos de seguridad infantil y enlaces a fuentes gastronómicas contrastadas, e incorpora una ruleta aleatoria para resolver la eterna duda: *«¿Qué cocinamos hoy?»*.

Optimizada ergonómicamente para su uso diario con una mano en **Google Pixel 8a** (pantalla Actua 6.1", 412×915 px).

---

## ✨ Características Principales

### 1. 👨‍👩‍👧‍👦 Filosofía de Cocina Familiar Sana & Niños Pequeños (<4 Años)
* **Cocina 100% real, sana y equilibrada:** Prioridad en cocciones saludables (vapor, hervidos ligeros, horno, plancha y guisados tradicionales sin grasas saturadas ni ultraprocesados).
* **Texturas y seguridad infantil:** Indicaciones explícitas de preparación (verduras bien tiernas para masticar o aplastar con tenedor, pescados limpios y desespinados, carnes picadas o troceadas en cortes suaves).
* **Consejos familiares (`familyNote`):** Cada receta relevante incluye un tip práctico de adaptación para peques.

### 2. 📖 Modal de Preparación Rápida con Fuentes Web Reales
* Al pulsar sobre cualquier plato del catálogo (o desde el banner del sorteo), se abre un modal deslizante (*bottom-sheet*) con:
  * Ingredientes principales necesarios.
  * **Paso a paso express (3-4 pasos numerados y directos)** para seguir cómodamente mientras cocinas.
  * **Enlaces directos a recetas reales en internet** contrastadas con medios de referencia (*Pequerecetas*, *Directo al Paladar*, *Cocina Abierta / Karlos Arguiñano*, *RTVE Cocina*).

### 3. 🔍 Sistema de Filtros de Despensa (Bottom-Sheet)
* **Por Categoría:** Ensaladas, guisos y cremas, huevos y tortillas, carnes y aves, pescados y mariscos, pastas y arroces, salteados.
* **Que lleve... (Obligatorios):** Filtra platos que contengan **todos** los ingredientes seleccionados.
* **Evitar... (Exclusiones):** Descarta platos que incluyan ingredientes no deseados, alérgenos o que no tengas en casa.
* **Buscador predictivo en tiempo real** dentro del selector.

### 4. 🎲 Sorteo Aleatorio (Ruleta Háptica)
* Algoritmo de selección aleatoria con animación de ruleta que evita repetir consecutivamente el mismo plato.
* Despliega un **banner destacado (*spotlight*)** con el plato sugerido y botón directo para ver su preparación.
* Respuesta háptica (`navigator.vibrate`) optimizada para el motor de vibración del Pixel 8a.

### 5. 📱 PWA Offline & Estrategia Network-First
* **Actualización Inmediata:** Gracias a la estrategia **Network-First**, cualquier cambio o nueva receta añadida en GitHub se descarga de inmediato al abrir la app con red.
* **Soporte Offline Completo:** Si no hay cobertura en la cocina o el supermercado, el Service Worker sirve automáticamente la versión en caché local.
* **Instalable:** Manifiesto PWA completo, iconos en alta definición e integración nativa en Android/Chrome.

### 6. 🎨 Paleta Gastronómica Cálida & Modo Oscuro Dinámico
* Tonos cálidos gastronómicos (naranja `#EA580C`, terracota `#C2410C` y ámbar `#F59E0B`) sobre fondos carbón (`#121214`) y crema suave (`#FDFBF7`).
* Alternancia claro/oscuro con sincronización dinámica del `<meta name="theme-color">` para mimetizar la barra de estado de Android.

---

## 🏗️ Arquitectura Modular

La aplicación sigue una arquitectura desacoplada y escalable:

```
menum/
├── index.html                 # Marcado semántico, cabecera y modales
├── manifest.json              # Manifiesto PWA
├── sw.js                      # Service Worker (Estrategia Network-First con fallback offline)
├── README.md                  # Este documento
├── package.json               # Dependencias de tests Playwright y scripts
├── playwright.config.js       # Configuración de tests (Desktop Chromium + Pixel 8a)
├── data/
│   └── recipes.json           # Base de datos JSON de recetas, categorías, pasos y fuentes
├── css/
│   └── style.css              # Animaciones, safe-areas, modales y transiciones
├── js/
│   ├── data.js                # Cargador asíncrono del JSON e índices de ingredientes
│   ├── theme.js               # Gestor de modo oscuro/claro y dynamic theme-color
│   ├── filters.js             # Estado de filtros combinados y bottom-sheet selector
│   ├── modal-recipe.js        # Gestor del modal de preparación y fuentes web
│   ├── roulette.js            # Algoritmo de ruleta aleatoria y banner spotlight
│   └── app.js                 # Coordinador principal, renderizado del feed y registro SW
├── icons/
│   ├── favicon.svg            # Favicon gastronómico
│   ├── icon-192.svg / .png    # Iconos PWA 192x192
│   └── icon-512.svg / .png    # Iconos PWA 512x512
└── tests/
    └── e2e/
        └── menum.spec.js      # Batería de 16 tests automatizados E2E
```

---

## 📝 Cómo Añadir o Modificar Recetas sin Tocar Código

Todas las recetas residen en [`data/recipes.json`](file:///home/pit/dev/public/menum/data/recipes.json). Para agregar una nueva receta familiar, simplemente añade un objeto al array `recipes`:

```json
{
  "id": 24,
  "name": "Nombre del plato",
  "category": "Pastas, pizzas y arroces",
  "familyNote": "Consejo de textura o seguridad para los más pequeños.",
  "ingredients": ["ingrediente1", "ingrediente2"],
  "steps": [
    "Paso 1 conciso y claro.",
    "Paso 2 de cocción.",
    "Paso 3 de presentación familiar."
  ],
  "sources": [
    { "name": "Directo al Paladar", "url": "https://..." },
    { "name": "Pequerecetas", "url": "https://..." }
  ]
}
```

*Los ingredientes y categorías se indexan automáticamente en los filtros y el buscador.*

---

## 🧪 Batería de Tests Automatizados (Playwright)

MenuM incluye una suite completa de pruebas E2E que validan la aplicación tanto en escritorio como bajo emulación móvil estricta del **Google Pixel 8a** (412×915 px):

```bash
# Instalar dependencias
npm install

# Instalar navegadores de Playwright (si es la primera vez)
npx playwright install --with-deps chromium

# Ejecutar la suite completa de tests
npm test
```

### Qué verifican los tests:
1. **PWA Shell & Metadatos:** Carga inicial, manifest, favicon, theme-color y registro de Service Worker.
2. **Carga JSON Asíncrona:** Renderizado íntegro de las recetas desde `data/recipes.json`.
3. **Modal de Preparación Rápida:** Apertura al clic, pasos numerados, notas familiares y enlaces externos con `target="_blank"`.
4. **Filtros Combinados:** Categoría, inclusión estricta ("Que lleve"), exclusión ("Evitar"), buscador predictivo y botón de reseteo.
5. **Sorteo Aleatorio (Ruleta):** Animación, selección sin repetición, resalte ganador y apertura de receta desde el banner.
6. **Tema Oscuro / Claro:** Alternancia y persistencia en `localStorage`.
7. **Ergonomía Pixel 8a:** Ausencia de desbordamiento horizontal y áreas táctiles mínimas de 44-48dp.

---

## 🚀 Despliegue en GitHub Pages

La aplicación está integrada en el monorepo de proyectos públicos de Pedro Mateo. Al hacer `git push` en la rama principal, el workflow `.github/workflows/deploy-menum.yml` ejecuta los tests y publica automáticamente la versión más reciente en:

**URL de Producción:** [https://pedromateo.github.io/public/menum/](https://pedromateo.github.io/public/menum/)
