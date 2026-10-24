// Datasets for Protocols, Habits, Science Guides & Presets

window.MEDIT_DATA = {
  PRESETS: [
    {
      seconds: 60,
      label: '1 min',
      badge: 'Cero Fricción',
      desc: 'Tiny Habit: 1 minuto ya consolida tu racha de hoy.'
    },
    {
      seconds: 120,
      label: '2 min',
      badge: 'Dosis Base',
      desc: 'Regla de 2 Minutos (James Clear): activación parasimpática rápida.'
    },
    {
      seconds: 180,
      label: '3 min',
      badge: 'Pausa Zen',
      desc: 'Corte de inercia y presencia consciente entre tareas.'
    },
    {
      seconds: 300,
      label: '5 min',
      badge: 'Recarga Mental',
      desc: 'Desaceleración del flujo de pensamientos y foco renovado.'
    },
    {
      seconds: 600,
      label: '10 min',
      badge: 'Reset Profundo',
      desc: 'Entrenamiento de atención dual: foco en respiración + monitoreo abierto.'
    },
    {
      seconds: 720,
      label: '12 min',
      badge: 'Umbral Amishi Jha',
      desc: 'El umbral neuroprotector mínimo para blindar la memoria de trabajo contra el burnout (Peak Mind).'
    },
    {
      seconds: 900,
      label: '15 min',
      badge: 'NSDR / Calma Total',
      desc: 'Non-Sleep Deep Rest (Stanford / Huberman): restauración de reservas de dopamina y claridad ejecutiva.'
    }
  ],

  // Guía de preparación y sensaciones para sesiones acompañadas
  SESSION_GUIDANCE: {
    prepSteps: [
      {
        num: '1',
        title: 'Postura digna y sin rigidez',
        desc: 'Espalda erguida sin apoyar con fuerza, hombros abajo y manos sobre las piernas. Ojos cerrados o mirada baja desenfocada.'
      },
      {
        num: '2',
        title: 'Aterrizaje somático',
        desc: 'Toma una inhalación profunda y exhala con un suspiro audible soltando la mandíbula y el entrecejo.'
      },
      {
        num: '3',
        title: 'Juicio cero con los pensamientos',
        desc: 'No intentes vaciar la mente. Cada vez que notes una distracción, sonríe: acabas de fortalecer tu atención.'
      }
    ],
    sensationsToFind: [
      {
        badge: 'Táctil / Térmica',
        name: 'El roce del aire',
        desc: 'Siente el aire fresco entrando por el borde de las fosas nasales o labio superior, y la tibieza más suave al salir.'
      },
      {
        badge: 'Propiocepción',
        name: 'El peso de la gravedad',
        desc: 'Nota el contacto firme de tus pies en el suelo, el peso de tus caderas en la silla y la distensión en el cuello.'
      },
      {
        badge: 'Ondulación',
        name: 'El vaivén diafragmático',
        desc: 'Percibe cómo el ombligo se expande suavemente hacia afuera al inhalar y desciende por sí solo al exhalar sin esfuerzo.'
      }
    ],
    phasePrompts: [
      {
        minPercent: 0,
        maxPercent: 20,
        stage: 'Fase 1 · Aterrizaje Somático',
        prompt: 'Aterriza en tu cuerpo. Deja caer hombros, párpados y mandíbula. Siente el soporte estable donde estás sentado.'
      },
      {
        minPercent: 20,
        maxPercent: 45,
        stage: 'Fase 2 · Contacto con el Anclaje',
        prompt: 'Lleva la atención al roce del aire en la nariz. Nota el contraste de temperatura: frescor al inhalar, tibieza al exhalar.'
      },
      {
        minPercent: 45,
        maxPercent: 70,
        stage: 'Fase 3 · El Retorno Amable',
        prompt: 'Si surge un pensamiento sobre trabajo o pendientes, nótalo con curiosidad ("pensando") y regresa suavemente al aire.'
      },
      {
        minPercent: 70,
        maxPercent: 88,
        stage: 'Fase 4 · Descanso en Presencia',
        prompt: 'Permite que la respiración respire por sí sola. Descansa en la breve quietud lúcida que hay entre cada respiración.'
      },
      {
        minPercent: 88,
        maxPercent: 100,
        stage: 'Fase 5 · Integración y Calma',
        prompt: 'Aprecia la serenidad que acabas de cultivar. Mantén esta presencia clara y tranquila al volver a tus actividades.'
      }
    ]
  },

  BREATH_PROTOCOLS: [
    {
      id: 'cyclic-sighing',
      name: 'Suspiro Fisiológico (Cíclico)',
      badge: 'Stanford Science',
      tagline: 'El protocolo más rápido para cortar el estrés agudo',
      science: 'Estudio clínico en Stanford Medicine (Cell Reports Medicine, 2023). Dos inhalaciones nasales y una exhalación bucal prolongada reducen de inmediato el ritmo respiratorio y la activación simpática.',
      idealFor: 'Picos de ansiedad, estrés agudo entre reuniones o sobrecarga mental.',
      defaultCycles: 5,
      steps: [
        { action: 'inhale', label: 'Inhala profundo', duration: 2.5, tip: 'Por la nariz inflando el diafragma' },
        { action: 'topInhale', label: 'Inhala un poco más', duration: 1.5, tip: 'Segunda inhalación corta sin soltar el aire' },
        { action: 'exhale', label: 'Exhala largo y suave', duration: 6.0, tip: 'Suelta todo el aire por la boca lentamente' }
      ]
    },
    {
      id: 'box-breathing',
      name: 'Respiración Cuadrada (Box)',
      badge: 'Foco & Calma',
      tagline: 'Regulación del sistema nervioso bajo presión',
      science: 'Utilizada por Navy SEALs y cirujanos para estabilizar el sistema autonómico antes de situaciones de alta demanda.',
      idealFor: 'Antes de presentaciones clave, toma de decisiones o dispersión mental.',
      defaultCycles: 4,
      steps: [
        { action: 'inhale', label: 'Inhala', duration: 4.0, tip: 'Por la nariz en 4 segundos' },
        { action: 'hold', label: 'Sostén con aire', duration: 4.0, tip: 'Pulmones llenos y cuerpo relajado' },
        { action: 'exhale', label: 'Exhala', duration: 4.0, tip: 'Suelta el aire de manera uniforme' },
        { action: 'hold', label: 'Sostén en vacío', duration: 4.0, tip: 'Descansa sin aire 4 segundos' }
      ]
    },
    {
      id: 'relaxing-478',
      name: 'Respiración 4-7-8',
      badge: 'Sueño & Desaceleración',
      tagline: 'Tranquilizante natural para el ritmo cardíaco',
      science: 'Desarrollada por el Dr. Andrew Weil (Harvard). La exhalación de 8s activa intensamente el tono vagal liberando acetilcolina.',
      idealFor: 'Desconexión nocturna, insomnio por pensamientos en bucle.',
      defaultCycles: 4,
      steps: [
        { action: 'inhale', label: 'Inhala silencioso', duration: 4.0, tip: 'Por la nariz 4 segundos' },
        { action: 'hold', label: 'Sostén con calma', duration: 7.0, tip: 'Rostro y hombros relajados' },
        { action: 'exhale', label: 'Exhala largo con sonido', duration: 8.0, tip: 'Por la boca con sonido de alivio en 8s' }
      ]
    },
    {
      id: 'coherent-hrv',
      name: 'Respiración Coherente (5.5s)',
      badge: 'Coherencia Cardíaca',
      tagline: 'Sincronización del ritmo cardíaco y variabilidad (HRV)',
      science: 'El ritmo biológico de 5.5 respiraciones por minuto maximiza la variabilidad de la frecuencia cardíaca (VFC).',
      idealFor: 'Equilibrio emocional diario, práctica de fondo.',
      defaultCycles: 6,
      steps: [
        { action: 'inhale', label: 'Inhala continuo', duration: 5.5, tip: 'Inhalación constante en 5.5s' },
        { action: 'exhale', label: 'Exhala suave', duration: 5.5, tip: 'Exhalación pausada en 5.5s sin cortes' }
      ]
    }
  ],

  HABIT_ANCHORS: [
    {
      id: 'laptop-close',
      title: 'Cierre del Portátil / Fin de Jornada',
      cue: 'Al terminar la jornada laboral y bajar la pantalla del ordenador',
      action: 'Hacer 60 segundos de respiración consciente o pausa S.T.O.P. antes de levantarte.',
      seconds: 60,
      icon: '💻'
    },
    {
      id: 'morning-coffee',
      title: 'El Café / Té de la Mañana',
      cue: 'Mientras la cafetera calienta o durante los primeros sorbos',
      action: 'Sentir los pies en el suelo, la calidez de la taza y 2 minutos de atención a la respiración.',
      seconds: 120,
      icon: '☕'
    },
    {
      id: 'pre-meeting-stop',
      title: 'Transición entre Reuniones',
      cue: '2 minutos antes de unirse a una reunión importante',
      action: 'Aplicar la técnica S.T.O.P. para no arrastrar la frustración de la tarea anterior.',
      seconds: 60,
      icon: '📅'
    },
    {
      id: 'doorway-threshold',
      title: 'El Umbral de la Puerta',
      cue: 'Al llegar a casa y tocar el pomo de la puerta',
      action: 'Pausar 30 segundos, dejar caer los hombros y soltar dos suspiros largos.',
      seconds: 60,
      icon: '🚪'
    },
    {
      id: 'night-unplug',
      title: 'Desconexión Nocturna',
      cue: 'Al conectar el cargador del móvil en la mesita de noche',
      action: 'Hacer 3 minutos de respiración 4-7-8 o micro-meditación en la cama.',
      seconds: 180,
      icon: '🌙'
    },
    {
      id: 'midday-reset',
      title: 'Reset Post-Almuerzo (12-15 min)',
      cue: 'A las 15:00 antes de iniciar el bloque de la tarde',
      action: 'Sesión de 12-15 min para proteger la memoria de trabajo y renovar energía.',
      seconds: 720,
      icon: '⚡'
    }
  ],

  // Guía ordenada de iniciación a la meditación: de lo más básico a lo más complejo
  SCIENCE_ARTICLES: [
    {
      id: 'level-1-what-is-meditation',
      level: 1,
      levelLabel: 'Nivel 1 · Iniciación Fundamental',
      title: 'Qué es (y qué NO es) la Meditación: El mito de la mente en blanco',
      readTime: '1.5 min',
      badge: 'Paso 1: Fundamentos',
      hook: '¿Crees que no puedes meditar porque no paras de pensar en tareas pendientes? Tu cerebro funciona exactamente como debe.',
      coreInsight: 'Meditar NUNCA ha consistido en poner la mente en blanco. Meditar es el entrenamiento sistemático de la atención: cada vez que notas que tu mente se ha distraído y vuelves con amabilidad, acabas de hacer una flexión en tu corteza prefrontal.',
      content: [
        {
          subtitle: 'La Red Neuronal por Defecto (DMN)',
          text: 'Cuando estás inactivo, el cerebro enciende la Red por Defecto (responsable de rumiar el pasado y planificar el futuro). Forzar su apagado es biológicamente imposible. La meditación no busca apagarla, sino notar cuándo se activa para no dejarte arrastrar por ella.'
        },
        {
          subtitle: 'La regla del juicio cero',
          text: 'Si en 2 minutos te distraes 20 veces y te das cuenta 20 veces, no has fallado 20 veces: has realizado 20 repeticiones de fortalecimiento neuroplástico. El éxito reside en el acto de darte cuenta, no en la ausencia de pensamientos.'
        }
      ],
      actionable: 'Cuando notes un pensamiento de trabajo, sonríe mentalmente, etiquétalo como "pensando", y vuelve suavemente a sentir el aire en tu nariz.',
      reference: 'Brewer, J. A., et al. (2011). Meditation experience is associated with differences in default mode network activity. PNAS, 108(50), 20254-20259.'
    },
    {
      id: 'level-2-posture-somatic',
      level: 2,
      levelLabel: 'Nivel 2 · El Cuerpo y la Postura',
      title: 'La Postura Física: Cómo sentarse sin dolor y alerta sin tensión',
      readTime: '1.5 min',
      badge: 'Paso 2: Postura y Cuerpo',
      hook: 'No necesitas cruzar las piernas en el suelo ni sentarte como un monje. Tu silla habitual es perfecta.',
      coreInsight: 'La postura ideal es "alerta pero relajada". El cuerpo envía retroalimentación constante al cerebro a través del nervio vago: si colapsas la espalda, el cerebro asume cansancio; si te tensas rígido, asume peligro.',
      content: [
        {
          subtitle: 'La tríada física en silla',
          text: '1. Pies planos: Siente la planta de ambos pies firmes contra el suelo, sin cruzar piernas.\n2. Columna neutra: Imagina un hilo suave tirando de la coronilla hacia el techo, despegando ligeramente la espalda del respaldo.\n3. Los 3 puntos de distensión: Deja caer los hombros hacia atrás y abajo, separa los dientes de la mandíbula y apoya la lengua relajada en el paladar.'
        },
        {
          subtitle: '¿Ojos abiertos o cerrados?',
          text: 'Cerrar los ojos reduce el 80% de los estímulos visuales facilitando el recogimiento. Si sientes sueño, déjalos entreabiertos con la mirada desenfocada hacia el suelo a un metro.'
        }
      ],
      actionable: 'Haz una pausa ahora: rueda los hombros una vez hacia atrás, suelta la mandíbula y toma aire por la nariz sintiendo los pies en el suelo.',
      reference: 'Kabat-Zinn, J. (1990). Full Catastrophe Living. Bantam Books.'
    },
    {
      id: 'level-3-anchoring-focus',
      level: 3,
      levelLabel: 'Nivel 3 · El Objeto de Foco',
      title: 'El Anclaje Atencional: Dónde posar tu atención y cómo volver',
      readTime: '2 min',
      badge: 'Paso 3: Mecánica Atencional',
      hook: 'Tu mente es como un cachorro inquieto que corretea: necesitas una correa suave llamada "anclaje".',
      coreInsight: 'Un anclaje es cualquier sensación física del momento presente a la que decides regresar cuando la atención se fuga. La respiración es el anclaje universal porque siempre está contigo y cambia en tiempo real.',
      content: [
        {
          subtitle: 'Elige tu punto de anclaje preferido',
          text: '• Opción A (Narinas): El roce fresco del aire en la punta de la nariz o el labio superior (ideal si buscas agudeza mental y foco).\n• Opción B (Diafragma): La expansión y contracción del abdomen al respirar (ideal si sientes ansiedad en el pecho).\n• Opción C (Manos): La calidez y peso de las manos descansando sobre tus muslos.'
        },
        {
          subtitle: 'El ciclo de 4 pasos de la atención',
          text: '1. Posas la atención en el anclaje → 2. Te distraes (inevitable) → 3. Te das cuenta (momento mágico de lucidez) → 4. Vuelves con amabilidad sin regañarte.'
        }
      ],
      actionable: 'Prueba durante 3 respiraciones: siente únicamente el frescor del aire en la punta de tu nariz.',
      reference: 'Goleman, D., & Davidson, R. J. (2017). Altered Traits: Science Reveals How Meditation Changes Your Mind, Brain, and Body.'
    },
    {
      id: 'level-4-subtle-sensations',
      level: 4,
      levelLabel: 'Nivel 4 · Mapa Sensorial',
      title: 'Sensaciones Sutiles: Qué sensaciones buscar exactamente en el cuerpo',
      readTime: '2 min',
      badge: 'Paso 4: Propiocepción',
      hook: '¿Qué se siente exactamente al meditar? No esperes fuegos artificiales ni trance místico; busca micro-sensaciones somáticas.',
      coreInsight: 'El entrenamiento de interocepción conecta la corteza insular del cerebro con los órganos internos. Aprender a detectar sensaciones sutiles apaga la rumiación cognitiva de golpe porque no puedes pensar en abstracto y sentir en concreto al mismo tiempo.',
      content: [
        {
          subtitle: 'El trío de micro-sensaciones',
          text: '1. El gradiente térmico: En la inhalación el aire entra a ~20°C y al salir está a ~35°C humedecido. Notar ese contraste térmico ancla la mente como un imán.\n2. La micro-pausa: Al terminar de exhalar y antes de que nazca la siguiente inhalación, existe un instante de quietud absoluta de 1 segundo. Disfruta de ese espacio.\n3. La descarga de peso: Con cada exhalación, percibe cómo la gravedad asienta tu cuerpo y los trapecios bajan 2 milímetros.'
        },
        {
          subtitle: 'La paradoja de hiperactivación',
          text: 'Si al parar sientes el corazón acelerado o inquietud, la meditación no ha creado ese estrés: solo ha desenmascarado la inercia acumulada. Respira suave y déjalo estar.'
        }
      ],
      actionable: 'En tu próxima sesión con el Temporizador, pon tu atención en la pequeña pausa que ocurre justo al terminar de exhalar.',
      reference: 'Critchley, H. D., et al. (2004). Neural systems supporting interoceptive awareness. Nature Neuroscience, 7(2), 189-195.'
    },
    {
      id: 'level-5-stop-and-habits',
      level: 5,
      levelLabel: 'Nivel 5 · Integración en el Trabajo',
      title: 'Micro-Pausas y Técnica S.T.O.P.: Llevar la calma a tus tareas diarias',
      readTime: '1.5 min',
      badge: 'Paso 5: Práctica en Acción',
      hook: 'La meditación no sirve de nada si solo tienes calma en un cojín y luego gritas al recibir un correo.',
      coreInsight: 'La adherencia no se construye dedicando 30 minutos al día, sino eliminando la fricción. La fórmula de Tiny Habits (B.J. Fogg, Stanford) demuestra que 60 segundos vinculados a un hábito preexistente superan x3 la tasa de éxito.',
      content: [
        {
          subtitle: 'El Protocolo S.T.O.P. de 60 segundos',
          text: '• S (Stop / Para): Detén las manos en el teclado y suelta el ratón.\n• T (Take a breath / Respira): Toma una respiración profunda sintiendo el diafragma.\n• O (Observe / Observa): Escanea hombros, mandíbula y emociones sin juzgarlas.\n• P (Proceed / Continúa): Elige tu siguiente paso consciente con claridad mental.'
        },
        {
          subtitle: 'Habit Stacking (Anclajes diarios)',
          text: 'Vincula tu micro-pausa a acciones que ya haces todos los días: al bajar la pantalla del portátil, mientras se calienta el café de la mañana o 2 minutos antes de una reunión clave.'
        }
      ],
      actionable: 'Usa el botón "Pausa S.T.O.P. 60s" de la portada al terminar tu próximo bloque de trabajo.',
      reference: 'Fogg, B. J. (2019). Tiny Habits; Goldstein, E. (2015). Uncovering Happiness.'
    },
    {
      id: 'level-6-amishi-jha-nsdr',
      level: 6,
      levelLabel: 'Nivel 6 · Neuroprotección Avanzada',
      title: 'El Umbral de los 12-15 Minutos: Blindaje Atencional (Dra. Amishi Jha & NSDR)',
      readTime: '2 min',
      badge: 'Paso 6: Ciencia Avanzada',
      hook: '¿Por qué 12 a 15 minutos es la cifra mágica que la neurociencia recomienda a personas con alta carga mental?',
      coreInsight: 'Mientras que 1 a 3 minutos regulan el sistema nervioso parasimpático de inmediato, las investigaciones clínicas de la Dra. Amishi Jha (Peak Mind) demostraron que 12 minutos diarios es el umbral biológico exacto que inmuniza la memoria de trabajo contra el deterioro provocado por el estrés crónico y el multitasking.',
      content: [
        {
          subtitle: 'La metodología en 3 fases (Guiada por campanas)',
          text: 'En una sesión de 12 o 15 minutos, tu mente pasa por tres fases naturales:\n\n1. Fase Linterna (0 a 5 min): Atención focalizada como un haz estrecho en la respiración nasal.\n2. Fase Foco Amplio (5 a 10 min): Abres el foco a las sensaciones de todo el cuerpo y los sonidos del entorno.\n3. Fase de Presencia e Integración (10 a 12-15 min): Descanso en quietud lúcida, fijando serenidad antes de retomar tus tareas.'
        },
        {
          subtitle: 'El Protocolo NSDR (Non-Sleep Deep Rest) de Stanford',
          text: 'El neurobiólogo Dr. Andrew Huberman (Stanford Medicine) comprobó que sesiones de 10-15 minutos de descanso consciente restauran las reservas de dopamina en el cuerpo estriado cerebral, renovando la agilidad mental como una siesta de 90 minutos pero sin aturdimiento.'
        }
      ],
      actionable: 'Cuando tengas un hueco tras el almuerzo o antes de una tarde intensa, programa 12 o 15 minutos en el Temporizador Zen y sigue las campanas intermedias.',
      reference: 'Jha, A. P., et al. (2020). Cognition and Emotion, 34(6), 1188-1202; Huberman, A. D., et al. (2023). Cell Reports Medicine.'
    }
  ],

  FAQS: [
    {
      q: '¿Qué hago si me pica la cara o me entran ganas de moverme?',
      a: 'Obsérvalo durante 3 segundos sin reaccionar de inmediato (suele disiparse solo). Si persiste, ráscate o muévete con calma y conciencia, y vuelve a la respiración.'
    },
    {
      q: '¿Por qué 12 minutos y no 10 o 20?',
      a: 'Las investigaciones de la Dra. Amishi Jha en la Universidad de Miami con personal de alta exigencia demostraron que 12 minutos es el umbral donde se produce la inflexión neuroprotectora en la capacidad atencional y memoria de trabajo.'
    },
    {
      q: '¿Puedo meditar en mi silla de trabajo con los ojos abiertos?',
      a: 'Absolutamente. Planta los pies en el suelo, suelta los hombros y desenfoca la mirada en el suelo o la mesa a un metro de distancia.'
    },
    {
      q: '¿Qué hago si me viene una idea crucial de trabajo en mitad de la sesión?',
      a: 'Ten una libreta o papel al lado. Anótala en dos palabras en 5 segundos, cierra la libreta y vuelve a la respiración.'
    }
  ]
};
