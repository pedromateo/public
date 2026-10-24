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

  SCIENCE_ARTICLES: [
    {
      id: 'amishi-jha-12min',
      title: 'El umbral de los 12-15 minutos: Cómo blindar tu memoria de trabajo (Dra. Amishi Jha)',
      readTime: '2 min',
      badge: 'Neuroprotección Ejecutiva',
      hook: '¿Por qué 12 a 15 minutos es la cifra mágica que la neurociencia recomienda a personas con alta carga mental?',
      coreInsight: 'Mientras que 1-3 minutos calman el sistema nervioso autónomo de inmediato, las investigaciones de la Dra. Amishi Jha (Universidad de Miami, libro Peak Mind) demostraron que 12 minutos diarios es el umbral mínimo exacto que inmuniza la memoria de trabajo y la concentración contra el deterioro provocado por el estrés crónico y el multitasking.',
      content: [
        {
          subtitle: 'La metodología en 3 fases: De la Linterna al Foco Amplio',
          text: 'En una sesión de 12 o 15 minutos, tu mente pasa por tres fases naturales guiadas por las campanadas:\n\n1. Fase Linterna (0 a 5 min): Diriges la atención como un haz estrecho a la respiración en la punta de la nariz o el diafragma. Cada vez que notas que te has distraído con un correo o una preocupación y vuelves, haces una repetición que fortalece la corteza prefrontal.\n\n2. Fase Foco Amplio (5 a 10 min): Abres el haz de luz. Ahora no solo notas la respiración: observas las sensaciones del cuerpo entero, los sonidos lejanos y los pensamientos pasar como nubes sin juzgar ni reaccionar.\n\n3. Fase de Presencia e Integración (10 a 12-15 min): Descanso en la quietud lúcida, anclando serenidad y claridad antes de retomar tus tareas.'
        },
        {
          subtitle: 'El Protocolo NSDR (Non-Sleep Deep Rest) de Stanford',
          text: 'El neurobiólogo Dr. Andrew Huberman (Stanford) demostró que sesiones de 10-15 minutos de descanso consciente provocan un reinicio de las reservas de dopamina en el cuerpo estriado (los ganglios basales), recuperando la agilidad mental equivalente a una siesta de 90 minutos pero sin la pesadez del despertar.'
        }
      ],
      actionable: 'Cuando tengas un hueco de 12 o 15 minutos tras el almuerzo o antes de una tarde intensa, selecciona 12 min en el Temporizador y déjate guiar por las campanadas intermedias.',
      reference: 'Jha, A. P., et al. (2020). Comparing mindfulness training and positive psychology interventions in high-demand military cohorts. Cognition and Emotion, 34(6), 1188-1202; Jha, A. (2021). Peak Mind. HarperCollins.'
    },
    {
      id: 'mind-wandering-myth',
      title: 'El mito de "dejar la mente en blanco" (y el bíceps mental)',
      readTime: '2 min',
      badge: 'Neurociencia Clave',
      hook: '¿Crees que no puedes meditar porque no paras de pensar en tareas pendientes? Tu cerebro funciona exactamente como debe.',
      coreInsight: 'Meditar no es silenciar tus pensamientos por arte de magia. Meditar es entrenar el músculo de la atención: cada vez que notas que te has distraído y regresas, acabas de hacer una flexión mental.',
      content: [
        {
          subtitle: 'La Red Neuronal por Defecto (DMN)',
          text: 'Cuando no estás concentrado en una tarea activa, tu cerebro activa la DMN, encargada de la rumiación y de planificar el futuro. Querer apagarla por la fuerza es biológicamente imposible.'
        },
        {
          subtitle: 'La regla del juicio cero',
          text: 'Si en 3 minutos te distraes 15 veces y te das cuenta 15 veces, no has fallado 15 veces: has hecho 15 repeticiones de entrenamiento neuroplástico.'
        }
      ],
      actionable: 'Cuando notes un pensamiento sobre trabajo, sonríe mentalmente, di "pensando", y vuelve suavemente a sentir el aire.',
      reference: 'Brewer, J. A., et al. (2011). Meditation experience is associated with differences in default mode network activity. PNAS, 108(50), 20254-20259.'
    },
    {
      id: 'arousal-paradox',
      title: 'La paradoja de hiperactivación: Por qué al parar parece que estás más estresado',
      readTime: '2 min',
      badge: 'Fisiología del Estrés',
      hook: '¿Te has sentado a meditar y has sentido taquicardia o inquietud inmediata?',
      coreInsight: 'Cuando vas a 120 km/h y frenas en seco, la inercia te empuja. La quietud no crea el estrés: desenmascara el estrés que ya acumulabas en el cuerpo.',
      content: [
        {
          subtitle: 'El puente fisiológico activo',
          text: 'Por eso para personas ocupadas es un error sentarse en silencio directo. Es imprescindible usar un "puente": 60 segundos de respiración guiada (como el Suspiro Fisiológico) para que el cuerpo baje de revoluciones antes de calmar la mente.'
        }
      ],
      actionable: 'Haz primero 3 suspiros fisiológicos en la pestaña "Respirar" antes de una sesión de silencio.',
      reference: 'Spiegel, D., Huberman, A. D., et al. (2023). Cell Reports Medicine, 4(1), 100895.'
    },
    {
      id: 'tiny-habits-dose',
      title: 'Dosis Mínima Efectiva: La ciencia de las micro-sesiones',
      readTime: '1.5 min',
      badge: 'Ciencia de Hábitos',
      hook: '¿Por qué la gente ocupada abandona a las 2 semanas? Porque intenta hacer 20 o 30 minutos al día.',
      coreInsight: 'Un hábito solo se consolida si la fricción inicial es inferior a tu fuerza de voluntad en tu peor día. Un minuto diario supera a 30 minutos una vez por semana.',
      content: [
        {
          subtitle: 'Fórmula de B.J. Fogg (Stanford)',
          text: 'Comportamiento = Motivación · Habilidad · Disparador. Cuando la motivación baja por el cansancio del trabajo, la habilidad requerida debe ser minúscula (1 minuto) para que el hábito se mantenga vivo sin excusas.'
        }
      ],
      actionable: 'Proponte como meta inamovible 1 o 2 minutos al día. Todo minuto adicional es un regalo para ti.',
      reference: 'Fogg, B. J. (2019). Tiny Habits. Houghton Mifflin Harcourt.'
    },
    {
      id: 'stop-technique-guide',
      title: 'La técnica S.T.O.P.: Tu botón de reinicio en 60 segundos',
      readTime: '1 min',
      badge: 'Protocolo de Emergencia',
      hook: '¿Tienes 60 segundos entre reunión y reunión? Este es el protocolo de Jon Kabat-Zinn para desactivar el piloto automático.',
      coreInsight: 'S (Stop / Para), T (Take a breath / Respira), O (Observe / Observa tu cuerpo y mente sin juzgar), P (Proceed / Continúa con intención clara).',
      content: [
        {
          subtitle: 'Cómo usarla en tu día',
          text: 'Pulsa el botón de Reset 60s en la portada cada vez que sientas que la bandeja de entrada te abruma.'
        }
      ],
      actionable: 'Ponlo a prueba ahora mismo con el botón "Reset 60s" de la portada.',
      reference: 'Goldstein, E. (2015). Uncovering Happiness. Atria Books.'
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
