# Pastelería y Confitería Artesana Sanz

> 🌐 **Referencia actual en producción:** [https://pasteleriasanz.weebly.com/](https://pasteleriasanz.weebly.com/)

Sitio web estático y archivo digital de la **Pastelería y Confitería Artesana Sanz** (Puerto Lumbreras, Región de Murcia).

El proyecto contiene la exportación completa del sitio web histórico de la confitería (anteriormente gestionado en Weebly bajo el tema *Birdseye*), preservando la historia familiar de más de siete generaciones de maestros confiteros (desde inicios del siglo XX), su catálogo artesanal y su archivo fotográfico.

---

## 📂 Estructura del Proyecto

```text
sanz/
├── index.html                               # Página principal (inicio, historia, catálogo y contacto)
├── jquery-1.11.2.min.js                     # Librería jQuery local para compatibilidad
├── la-historia-del-bisabuelo-indalecio-sanz.html # Monográfico: historia del bisabuelo Indalecio y el "Postrechino"
├── test.html                                # Página de plantilla / pruebas generada por el CMS
├── apps/
│   └── audioPlayer2.swf                     # Reproductor de audio en Flash (componente heredado)
├── files/
│   ├── main_style.css                       # Hoja de estilos principal del sitio web
│   ├── templateArtifacts.js                 # Script auxiliar de plantilla
│   ├── theme/                               # Tema visual (Birdseye: custom.js, plugins.js, fuentes e imágenes)
│   └── vendor/                              # Dependencias base localizadas (sites.css, fancybox, social-icons, fonts, runtime)
└── uploads/1/0/8/6/10868401/               # Galería multimedia de la confitería
    ├── 1410608938.png                       # Logotipo oficial de la confitería
    ├── background-images/                   # Fondos y banners del sitio (incluye subcarpeta thumbs/)
    ├── editor/, edited/, published/         # Versiones preparadas de imágenes y composiciones
    └── *.jpg, *.jpeg, *.png                 # Fotografías históricas, del obrador y productos artesanos
```

---

## 🎨 Identidad Visual y Color Corporativo

El sitio web cuenta con un sistema visual homogéneo centrado en el color corporativo oficial:

- **Color Corporativo Oficial:** `#D8086A` (Rosa frambuesa artesano / Pantone Raspberry Rose).
- **Valores RGB:** `rgb(216, 8, 106)`.
- **Paleta de apoyo y armonía:**
  - **Gradiente de cabeceras Hero:** `linear-gradient(135deg, #A80652 0%, #D8086A 52%, #5D022E 100%)`.
  - **Vino profundo (contraste y tipografía sobre blanco):** `#630230` / `#5D022E`.
  - **Tinte suave (fondos de tarjetas y detalles):** `#fdf2f7`.
  - **Acento artesano tradicional:** `#c4894d` (dorado / miel).
- **Tipografía Oficial:** `Montserrat`, sans-serif (para títulos y destacados).
- **Comportamiento del logotipo en scroll:**
  - En la cabecera superior se muestra en su color blanco original sobre el degradado rosa.
  - Al hacer scroll (`body.affix`), el logotipo transiciona suavemente al color corporativo `#D8086A` mediante el filtro CSS calibrado:
    ```css
    filter: brightness(0) saturate(100%) invert(18%) sepia(89%) saturate(5975%) hue-rotate(323deg) brightness(85%) !important;
    ```
- **Directriz futura obligatoria:** Cualquier nuevo desarrollo, banner, botón o elemento de interfaz debe utilizar de forma estricta `#D8086A` como color principal de marca.

---

1. **[index.html](file:///home/pit/dev/public/sanz/index.html)**:
   - **Historia y tradición:** Presentación de la familia Sanz, su arraigo a la repostería artesana en Puerto Lumbreras y el legado de Ezequiel y María («la confitera»).
   - **Especialidades:** Panadería, confitería tradicional, merengues, nata, moka, trufa, bombones y tartas de celebración (bodas, comuniones, eventos).
   - **Secciones ancla:** `#historia`, `#dulces`, `#encargos` y `#donde`.

2. **[la-historia-del-bisabuelo-indalecio-sanz.html](file:///home/pit/dev/public/sanz/la-historia-del-bisabuelo-indalecio-sanz.html)**:
   - Publicación especial que reivindica el obrador artesanal frente a la producción industrial masiva.
   - Detalla la rutina del obrador en la Calle Mayor y la receta del emblemático dulce **«Postrechino»**.

3. **[test.html](file:///home/pit/dev/public/sanz/test.html)**:
   - Página de plantilla o borrador generada durante el diseño en la plataforma.

5. **[uploads/](file:///home/pit/dev/public/sanz/uploads/)**:
   - Más de 70 imágenes que documentan la historia centenaria del obrador, el bisabuelo Indalecio, cuadros y utensilios tradicionales, elaboraciones y productos.

---

## 🚀 Cómo Visualizar el Sitio Localmente

Al tratarse de un sitio web estático (HTML, CSS y JS), se puede abrir directamente cualquier archivo `.html` en el navegador o iniciar un servidor local:

### Con Python:
```bash
# Desde este directorio
python3 -m http.server 8080
```
Abrir `http://localhost:8080` en el navegador.

### Con Node.js:
```bash
npx serve .
# O bien:
npm start
```

---

## 🧪 Tests de Contenido y Navegación

El proyecto incluye una suite automatizada de pruebas ejecutada con el runner nativo de Node.js (`node:test`, sin dependencias externas pesadas) para garantizar que la web se mantiene funcional, íntegra y sin enlaces ni recursos rotos tras cualquier modificación.

### Ejecutar todos los tests:
```bash
npm test
```

### Crear copia de seguridad completa (.zip con timestamp):
```bash
npm run backup
# Genera un archivo en backup/backup_YYYY-MM-DD_HH-mm-ss.zip excluyendo temporales
```

### Ejecutar suites por separado:
```bash
# Solo tests de contenido (estructura, textos históricos, imágenes y dependencias locales)
npm run test:content

# Solo tests de navegación (menú, anclas, rutas relativas, teléfono y mapas)
npm run test:navigation
```

### ¿Qué validan estos tests? (28 tests en 8 suites)
- **Contenido (`tests/content.test.js`)**:
  - Estructura HTML básica (`<!DOCTYPE html>`, `UTF-8`, `viewport`, etiquetas `<title>`).
  - Textos de identidad corporativa y memoria histórica (7 generaciones, Indalecio Sanz, Ezequiel, María «la confitera», *Postrechino*).
  - Información de contacto obligatoria (teléfono `968 40 20 10`, dirección en Puerto Lumbreras).
  - Cero 404s en recursos locales: presencia y no vacuidad del logotipo, todas las imágenes `<img src="...">`, fuentes tipográficas de `main_style.css` y scripts de soporte.
- **Limpieza e Independencia (`tests/content.test.js`)**:
  - Cero publicidad comercial de Weebly en el pie de página.
  - Firma oficial de autoría (`© Pastelería y Confitería Artesana Sanz`).
  - Cero trackers o scripts externos de telemetría (StatCounter).
  - Cero dependencias externas en CDN de `editmysite.com`.
  - Integridad de dependencias vendor localizadas (`files/vendor/`).
- **Compatibilidad con GitHub Pages (`tests/content.test.js`)**:
  - Presencia del archivo [.nojekyll](file:///home/pit/dev/public/sanz/.nojekyll).
  - Cero rutas con barras absolutas (`/...`) para garantizar funcionamiento en subdirectorios.
  - Cero recursos activos inseguros por `http://` (prevención de *Mixed Content* en HTTPS).
- **Vídeos de YouTube (`tests/content.test.js`)**:
  - Integración de los 6 vídeos con endpoint oEmbed estándar sobre HTTPS.
  - Prevención del Error 153 mediante `<meta name="referrer" content="strict-origin-when-cross-origin">` y atributo `referrerpolicy`.
  - Descarga de miniaturas locales (`uploads/videos/`) y fallback visual automático para ejecuciones directas con protocolo `file://`.
  - Atributos obligatorios de permisos (`allow`, `title`, `allowfullscreen`) y cero parámetros obsoletos (`wmode=opaque`).
- **Navegación (`tests/navigation.test.js`)**:
  - Presencia del menú de navegación completo y botón hamburguesa responsive.
  - Resolución de anclas internas (`#historia`, `#dulces`, `#encargos`, `#donde`).
  - Enlaces relativos `.html` sin enlaces rotos.
  - Enlaces de acción: teléfono directo (`tel:968402010`), mapas de Google y enlaces a redes sociales (`target="_blank"`).

---

## 🌐 Publicación en GitHub Pages (Directrices Obligatorias)

Este proyecto está destinado a publicarse en **GitHub Pages** (habitualmente bajo un subdirectorio del repositorio o dominio personalizado).

Para asegurar que cualquier cambio o futura optimización mantenga la compatibilidad con GitHub Pages, deben respetarse las siguientes reglas:

1. **Rutas estrictamente relativas (Cero barras iniciales `/`):**
   - No usar rutas absolutas que comiencen por `/` (como `/files/...` o `/uploads/...`), ya que en GitHub Pages resolverían contra la raíz del dominio principal (`https://usuario.github.io/files/...`) en lugar del subdirectorio del proyecto (`https://usuario.github.io/repo/sanz/files/...`).
   - Usar siempre rutas relativas: `files/...`, `uploads/...`, o `./`.
2. **Archivo `.nojekyll` en la raíz:**
   - Se incluye el archivo [.nojekyll](file:///home/pit/dev/public/sanz/.nojekyll) para evitar que el generador Jekyll de GitHub Pages ignore u omita carpetas con nombres especiales o recursos estáticos.
3. **Seguridad HTTPS (Cero *Mixed Content*):**
   - Todos los recursos son 100% locales o usan `https://`. No se admiten recursos activos (scripts o CSS) vía `http://` para no ser bloqueados por los navegadores.
4. **Sensibilidad a mayúsculas y minúsculas (*Case Sensitivity*):**
   - El entorno de producción en GitHub Pages corre sobre Linux. Los nombres de ficheros en el código deben coincidir exactamente con el sistema de archivos (ej. `.jpg` vs `.JPG`, `.png`, etc.).
5. **Verificación continua con `npm test`:**
   - La suite de tests automatizados comprueba de forma obligatoria estas directrices antes de cualquier despliegue.

---

## 📌 Notas Técnicas y Consideraciones

- **Independencia 100% de Weebly / EditMySite:** El sitio ha sido desvinculado de los CDNs externos de Weebly. Todos los estilos base (`sites.css`, `fancybox.css`, `social-icons.css`), tipografías (*Montserrat* y *wSocial*) y scripts (`main.js`, `stl.js`) se encuentran localizados en `files/vendor/`, permitiendo que la web sea 100% autónoma, privada y compatible con HTTPS sin avisos de *mixed content*.
- **Sin publicidad ni rastreadores:** Se eliminaron los banners promocionales de Weebly en el pie de página, los scripts de login/tienda obsoletos y el tracker de StatCounter.
- **Reproductor Flash (`audioPlayer2.swf`):** Es un componente multimedia Flash heredado (no compatible de forma nativa con navegadores web modernos).
