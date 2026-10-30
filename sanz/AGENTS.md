# Directrices del Proyecto - Pastelería Sanz

## 1. Identidad Visual y Color Corporativo (Regla Estricta)
- **Color corporativo oficial:** `#D8086A` (Rosa frambuesa artesano / Pantone Raspberry Rose).
- Todos los ajustes de color, elementos gráficos, acentos de marca, cabeceras hero, botones, estados hover y filtros de transición del logotipo deben respetar y utilizar este color corporativo `#D8086A` y su paleta armónica:
  - **Color Principal / Acento:** `#D8086A` (RGB: `216, 8, 106`)
  - **Gradiente Cabeceras Hero:** `linear-gradient(135deg, #A80652 0%, #D8086A 52%, #5D022E 100%)`
  - **Vino Profundo (contraste y texto oscuro):** `#630230` / `#5D022E`
  - **Tinte Suave (tarjetas y detalles):** `#fdf2f7`
  - **Acento Artesano Tradicional:** `#c4894d` (dorado / miel)
  - **Tipografía Oficial:** `Montserrat`, sans-serif
- En el header fijado al hacer scroll (`body.affix`), el logotipo blanco debe transicionar al color corporativo `#D8086A` mediante el filtro CSS calibrado:
  `filter: brightness(0) saturate(100%) invert(18%) sepia(89%) saturate(5975%) hue-rotate(323deg) brightness(85%);`

## 2. Fidelidad de Contenido (Regla Estricta)
- **NO inventar ni añadir contenido nuevo** (subtítulos, eslóganes, textos de marketing, tarjetas promocionales o insignias) a menos que el usuario lo solicite de manera expresa.
- Mantener y respetar escrupulosamente los textos, redacción y términos históricos originales al maquetar, estilizar o refactorizar el código HTML/CSS.
- Si una tarea requiere estructura visual, utilizar exclusivamente el contenido preexistente proporcionado o documentado en el sitio web de referencia.

## 3. Compatibilidad y Publicación (GitHub Pages)
- Todas las rutas y recursos deben ser relativos (sin `/` inicial absoluta) para permitir el despliegue tanto en raíz como en subdirectorios de GitHub Pages.
- Mantener el archivo `.nojekyll` en la raíz.
- No incluir contenido mixto (usar siempre HTTPS o recursos 100% locales).

## 4. Calidad y Verificación Continua
- Ejecutar la suite de tests (`npm test`) en cada paso y tras cualquier cambio.
- Mantener siempre todos los tests pasando con 0 fallos.

## 5. Política de Copias de Seguridad
- Ante cambios profundos o a petición del usuario, generar un archivo ZIP completo de la web con timestamp en el directorio `backup/` mediante `npm run backup`.
