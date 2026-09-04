# Changelog

Todos los cambios notables en este proyecto están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/), y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.0] - 2026-09-04

### ✨ Agregado

- **PWA completamente funcional** con capacidad de instalación en dispositivos móviles (Android e iOS).
- **Integración con AEMET OpenData**: Conexión a la API oficial para obtener predicción horaria del municipio de Murcia (código 30030).
- **Service Worker**: Estrategia de caché inteligente para funcionamiento offline completo.
- **Información meteorológica completa**:
  - Temperatura real, sensación térmica, mínima y máxima del día.
  - Velocidad y rachas de viento en km/h.
  - Precipitaciones acumuladas en mm.
  - Iconos de estado del cielo diurnos y nocturnos.
- **Información de Orto y Ocaso**: Visualización de hora exacta de salida y puesta del sol.
- **Badges condicionales inteligentes**: Avisos visuales automáticos configurables por umbrales:
  - Calor (≥ 30°C)
  - Frío (≤ 9°C)
  - Lluvia (≥ 0.1 mm)
  - Viento (≥ 15 km/h)
- **Gesto táctil Pull-to-Refresh**: Deslizar hacia abajo para actualizar datos.
- **Botón nativo de compartir**: Integración con menú del sistema operativo (WhatsApp, Telegram, Email, etc.).
- **Modo Mock**: Simulación de datos meteorológicos para desarrollo y testing sin conexión.
- **Seguridad de API Key**: Gestión mediante variables de entorno (.env) sin exposición en el navegador.
- **Interfaz responsive**: Diseño mobile-first adaptable a cualquier tamaño de pantalla.
- **Configuración flexible** mediante `config.json`: Personalizar umbrales, localización e interfaz sin modificar código.
- **Pruebas unitarias automatizadas** para garantizar calidad del código.
- **Documentación completa**: README con instrucciones detalladas de instalación, configuración y despliegue.

### 🔧 Técnico

- Servidor Node.js con soporte de variables de entorno (.env).
- Endpoint seguro `/api/forecast` para consulta de predicción.
- Iconos multi-resolución oficiales para Android e iOS.
- Manifiesto PWA (manifest.json) con tema, nombre y configuración visual.
- Estilos modernos con CSS responsive.

### 🔐 Seguridad

- API Key no se expone en el navegador ni en repositorios públicos.
- Gestión segura mediante variables de entorno del servidor.
- Soporte para GitHub Secrets en CI/CD.

---

## [Próximas mejoras planificadas]

- Soporte multiidioma (es, en, fr, de).
- Histórico de predicciones.
- Gráficos de tendencias meteorológicas.
- Notificaciones push para alertas meteorológicas críticas.
- Exportación de datos en CSV.
- Tema oscuro/claro (Dark Mode).

---

## Notas de Versión

Para detalles de cómo contribuir, consulta la sección de contribuciones en el [README.md](README.md).
