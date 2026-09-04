# Changelog

Todos los cambios notables en este proyecto están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/), y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.0] - 2026-09-05

### ✨ Agregado

- **Motor de Audio con Web Audio API:**
  - Planificador lookahead con bucle a 25 ms y ventana preventiva a 100 ms acoplado a `audioContext.currentTime`.
  - Soporte de compases 4/4 configurables (1, 2 y 4 compases) y ajuste dinámico de BPM.
- **Grabación Cuantizada y Ciclo Visual:**
  - Detección precisa de compás para inicio y fin de grabación.
  - Estados dinámicos del botón de grabación:
    - Estado de espera (**ESPERA**, naranja `bg-amber-500`) al pulsar en mitad de ciclo.
    - Estado de grabación activa (**GRABANDO**, verde `bg-emerald-500`) al iniciar compás 0.
    - Estado en reposo (**GRABAR**, rojo `bg-red-600`) al finalizar y renderizar la pista.
- **Visualizador de Compases Multilínea:**
  - Representación de los pulsos en una fila horizontal independiente por cada compás seleccionado.
  - Asegura que todos los puntos (hasta 16 puntos en 4 compases) permanezcan visibles sin solaparse con controles laterales.
- **Mezclador Multipista:**
  - Controles individuales de volumen por pista.
  - Botón de silenciar (**Mute**) con retroalimentación de opacidad.
  - Botón de eliminar (**Delete**) con renumeración dinámica de pistas.
- **Metrónomo:**
  - Pulsos sonoros generados sintéticamente con `OscillatorNode` y envolvente exponencial.
  - Diferenciación tonal entre primer pulso (1000 Hz) y secundarios (800 Hz).
  - Botón de conmutación ON/OFF.
- **Exportación Dual en Cliente:**
  - Exportación en formato WAV estéreo a 16-bit PCM mediante `DataView`.
  - Exportación en formato MP3 mediante la librería `lamejs` vía CDN.
  - Exclusión automática del metrónomo de la mezcla final.
- **Soporte PWA y Modo Offline:**
  - Manifiesto (`manifest.json`) y Service Worker (`sw.js`) con estrategia Cache First.
  - Iconos SVG vectoriales (`icon-192.svg` e `icon-512.svg`).
  - Rutas relativas (`./`) compatibles con subdirectorios de GitHub Pages.
- **Suite de Pruebas E2E (Playwright):**
  - Pruebas automatizadas de flujo completo, compases, metrónomo, estados de grabación y controles de pista.
- **CI/CD con GitHub Actions:**
  - Integración en los workflows del repositorio principal (`deploy.yml` y `test.yml`) para despliegue continuo en `/loopp/`.
