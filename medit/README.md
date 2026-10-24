# Medit — PWA de Micro-Mindfulness & Neuro-Reset para Personas Ocupadas

> **Aplicación Progresiva (PWA) de meditación, respiración activa y entrenamiento de atención plena basada en neurociencia y ciencia del comportamiento (Stanford Medicine, Dra. Amishi Jha, Dr. B.J. Fogg, James Clear y Jon Kabat-Zinn).**  
> 100% Offline-First, síntesis acústica con Web Audio API, racha "Cero Culpas" desde 60 segundos y protocolo de 12-15 minutos para la protección de la memoria de trabajo contra el burnout.

[![PWA Ready](https://img.shields.io/badge/PWA-Ready%20%26%20Offline-059669?style=flat-square&logo=pwa)](./index.html)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](../LICENSE)
[![Audio: Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API%20(Pure%20Synthesis)-6366f1?style=flat-square)](./js/audio.js)
[![Science: Evidence Based](https://img.shields.io/badge/Ciencia-Stanford%20%7C%20Jha%20%7C%20Fogg-0ea5e9?style=flat-square)](#1-fundamentos-metodológicos-y-neurociencia-aplicada)

---

## 📖 Tabla de Contenidos
1. [Fundamentos Metodológicos y Neurociencia Aplicada](#1-fundamentos-metodológicos-y-neurociencia-aplicada)
   * 1.1. Por qué Fracasan las Personas Ocupadas (La Paradoja de Hiperactivación)
   * 1.2. Dosis Mínima Efectiva y Racha "Cero Culpas" (B.J. Fogg & James Clear)
   * 1.3. Regulación Fisiológica Directa: El Suspiro Cíclico de Stanford (*Cell Reports Medicine, 2023*)
   * 1.4. El Umbral de los 12-15 Minutos y la Metodología Linterna-Foco Amplio (Dra. Amishi Jha, *Peak Mind*)
   * 1.5. Protocolo NSDR (Non-Sleep Deep Rest) y Restauración Dopaminérgica (Dr. Andrew Huberman)
   * 1.6. Habit Stacking: Anclajes Contextuales en la Vida Diaria
2. [Estructura de la Aplicación y Módulos](#2-estructura-de-la-aplicación-y-módulos)
3. [Motor Acústico Web Audio (0 Dependencias Externas)](#3-motor-acústico-web-audio-0-dependencias-externas)
4. [Instalación PWA y Uso sin Conexión](#4-instalación-pwa-y-uso-sin-conexión)

---

## 1. Fundamentos Metodológicos y Neurociencia Aplicada

### 1.1. Por qué Fracasan las Personas Ocupadas (La Paradoja de Hiperactivación)
Los profesionales y estudiantes con agendas apretadas suelen abandonar la meditación a los pocos días debido a tres factores cognitivos clave:
1. **La falacia del todo o nada (*Time-Scarcity Fallacy*)**: Creer que si no tienen 20 o 30 minutos ininterrumpidos en silencio absoluto, no vale la pena meditar.
2. **La Paradoja de Hiperactivación (*Arousal Paradox*)**: Al ir a 120 km/h durante la jornada laboral y sentarse de golpe en silencio pasivo, la inercia del cortisol y la sobreexcitación del sistema simpático provocan inquietud física y rumiación acelerada. El principiante asume erróneamente que *"meditar le estresa más"*.
3. **El sesgo de rendimiento**: Pensar que la mente debe quedarse "en blanco" y que cada distracción representa un fracaso personal.

### 1.2. Dosis Mínima Efectiva y Racha "Cero Culpas" (B.J. Fogg & James Clear)
Siguiendo el modelo conductual de Stanford ($B = M \cdot A \cdot P$ de B.J. Fogg) y la regla de los 2 minutos de James Clear:
* La meta fundamental en las primeras semanas no es acumular tiempo, sino **consolidar la identidad neuroplástica de una persona que se regala un momento de pausa a diario**.
* En **Medit**, cualquier micro-pausa de **60 o 120 segundos mantiene activa la racha diaria al 100%**. Reducir la fricción de entrada por debajo del nivel de fuerza de voluntad del peor día asegura la supervivencia del hábito.

### 1.3. Regulación Fisiológica Directa: El Suspiro Cíclico de Stanford (*Cell Reports Medicine, 2023*)
Para evitar la incomodidad de la parada brusca, la app incorpora protocolos de respiración activa antes o como alternativa a la quietud.  
El ensayo clínico aleatorizado dirigido por el Dr. David Spiegel y el Dr. Andrew Huberman en Stanford demostró que **5 minutos diarios de suspiro fisiológico cíclico** (dos inhalaciones nasales consecutivas y una exhalación bucal prolongada y lenta):
* Reduce el ritmo respiratorio basal de forma más acusada que la meditación pasiva.
* Produce una disminución inmediata del tono simpático mediante activación barorrefleja del nervio vago.
* Eleva significativamente el afecto positivo y el bienestar subjetivo.

### 1.4. El Umbral de los 12-15 Minutos y la Metodología Linterna-Foco Amplio (Dra. Amishi Jha, *Peak Mind*)
Las investigaciones neurocientíficas de la **Dra. Amishi Jha** (Universidad de Miami) con colectivos de alta demanda (militares en despliegue, médicos de urgencias y ejecutivos) demostraron que:
* Mientras que 1-3 minutos regulan el estrés agudo, **12 minutos al día es el umbral biológico exacto para proteger y fortalecer la memoria de trabajo y la estabilidad atencional** contra el deterioro provocado por semanas de multitarea y sobrecarga.
* **Metodología de 3 Fases Guiadas por Campanadas**:
  1. **Fase 1 (0 a 5 min) — Modo Linterna (Foco Estrecho)**: Concentración exclusiva en el ancla respiratoria. Notar la distracción y volver entrena el "bíceps mental" de la corteza prefrontal.
  2. **Fase 2 (5 a 10 min) — Modo Foco Amplio (Monitoreo Abierto / Vipassana)**: Conciencia expandida a las sensaciones corporales globales, sonidos del entorno y pensamientos pasajeros sin engancharse.
  3. **Fase 3 (10 a 12-15 min) — Presencia Lúcida e Integración**: Descanso consciente en la quietud antes de retomar la jornada.

### 1.5. Protocolo NSDR (Non-Sleep Deep Rest) y Restauración Dopaminérgica (Dr. Andrew Huberman)
En sesiones de 15 minutos, el descanso profundo consciente en posición sentada o reclinada permite desacelerar las ondas cerebrales hacia ritmos alfa y theta sin entrar en sueño profundo, reiniciando los depósitos de dopamina en el cuerpo estriado y devolviendo la agilidad cognitiva sin la inercia del despertar.

### 1.6. Habit Stacking: Anclajes Contextuales en la Vida Diaria
La app permite vincular la sesión diaria a hábitos ya automáticos mediante la fórmula de anclaje:
* *Al cerrar la tapa del portátil al final de la jornada laboral.*
* *Durante la preparación del café o té matutino.*
* *En los 60 segundos previos a unirse a una reunión importante (Pausa S.T.O.P.).*
* *Al tocar el pomo de la puerta al llegar a casa.*
* *Al conectar el cargador del móvil antes de dormir.*

---

## 2. Estructura de la Aplicación y Módulos

```
medit/
├── index.html            # Cuadro de mando responsive zen con Tailwind CDN y PWA meta tags
├── manifest.json         # Manifiesto PWA para instalación standalone
├── sw.js                 # Service Worker con estrategia Cache-First y offline completo
├── icons/                # Iconos PNG de alta resolución (192x192, 512x512) y favicon SVG
├── css/
│   └── style.css         # Animaciones concéntricas de respiración y soporte safe-area
└── js/
    ├── audio.js          # Motor Web Audio API (Cuenco Tibetano, Zen, Gong, Ruido Marrón, Lluvia)
    ├── storage.js        # Almacenamiento local privado, racha sin culpas y exportación/importación JSON
    ├── data.js           # Protocolos de respiración, anclajes y micro-guías científicas (< 2 min)
    └── app.js            # Controlador central interactivo, modales y temporizador con fases Jha
```

---

## 3. Motor Acústico Web Audio (0 Dependencias Externas)

Toda la ambientación acústica se sintetiza en tiempo real mediante el oscilador del navegador:
* **Cuenco Tibetano (216 Hz)**: Cuatro parciales armónicos no lineales (594 Hz, 872 Hz, 1406 Hz) con desfase de 3 Hz para generar el batido acústico característico de los cuencos de siete metales.
* **Campana Zen (880 Hz)**: Chime cristalino puro con decaimiento exponencial suave.
* **Gong de Templo (110 Hz)**: Frecuencia baja con envolvente de ataque de 40 ms y resonancia profunda de 5.5 segundos.
* **Ruido Marrón y Lluvia Algorítmica**: Filtrado de integración con densidad espectral $1/f^2$ continuo y cálido para aislar distracciones de la oficina o casa.

---

## 4. Instalación PWA y Uso sin Conexión

1. Abre la aplicación en cualquier navegador moderno:
   ```bash
   # En local
   cd medit
   python3 -m http.server 8080
   # Abrir http://localhost:8080
   ```
2. Pulsa en el aviso **«Instalar PWA»** o añade a la pantalla de inicio desde el menú de Chrome o Safari en iOS (*«Compartir» → «Añadir a pantalla de inicio»*).
3. La aplicación funciona con persistencia total de datos y reproducción de audio incluso en Modo Avión sin conexión a internet.
