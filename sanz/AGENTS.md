# Directrices del Proyecto - Pastelería Sanz

## 1. Fidelidad de Contenido (Regla Estricta)
- **NO inventar ni añadir contenido nuevo** (subtítulos, eslóganes, textos de marketing, tarjetas promocionales o insignias) a menos que el usuario lo solicite de manera expresa.
- Mantener y respetar escrupulosamente los textos, redacción y términos históricos originales al maquetar, estilizar o refactorizar el código HTML/CSS.
- Si una tarea requiere estructura visual, utilizar exclusivamente el contenido preexistente proporcionado o documentado en el sitio web de referencia.

## 2. Compatibilidad y Publicación (GitHub Pages)
- Todas las rutas y recursos deben ser relativos (sin `/` inicial absoluta) para permitir el despliegue tanto en raíz como en subdirectorios de GitHub Pages.
- Mantener el archivo `.nojekyll` en la raíz.
- No incluir contenido mixto (usar siempre HTTPS o recursos 100% locales).

## 3. Calidad y Verificación Continua
- Ejecutar la suite de tests (`npm test`) en cada paso y tras cualquier cambio.
- Mantener siempre todos los tests pasando con 0 fallos.

## 4. Política de Copias de Seguridad
- Ante cambios profundos o a petición del usuario, generar un archivo ZIP completo de la web con timestamp en el directorio `backup/` mediante `npm run backup`.
