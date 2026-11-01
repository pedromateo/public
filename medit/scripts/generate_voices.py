#!/usr/bin/env python3
import asyncio
import os
import edge_tts

# Voz de mujer seleccionada en la API con tono suave, calmado y dulce
VOICE = "es-ES-ElviraNeural"
RATE = "-10%"
PITCH = "+2Hz"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio", "voice")

CLIPS = {
    # Inicio y cierre
    "zen_inicio.mp3": "Acomoda tu postura y permite que tu respiración encuentre su ritmo natural.",
    "zen_cierre.mp3": "Aprecia este momento que te has dedicado. Lleva esta serenidad a tu siguiente tarea.",

    # Respiración
    "resp_inhala.mp3": "Inhala suavemente por la nariz.",
    "resp_inhala_extra.mp3": "Inhala un poco más, llenando el diafragma.",
    "resp_sosten.mp3": "Sostén el aire con calma, hombros relajados.",
    "resp_exhala.mp3": "Exhala largo y suelta todo el aire.",
    "resp_vacio.mp3": "Pausa en vacío, descansando sin aire.",

    # Protocolo S.T.O.P.
    "stop_s.mp3": "Stop. Detén lo que estás haciendo por un instante.",
    "stop_t.mp3": "Take a breath. Toma una respiración profunda y siente el aire.",
    "stop_o.mp3": "Observe. Observa tus sensaciones corporales y tu mente sin juzgar.",
    "stop_p.mp3": "Proceed. Continúa tu día con calma y presencia clara.",

    # Nivel más permisivo (Guía Completa / Equilibrada): lee todo el texto debajo del temporizador
    "zen_fase1_full.mp3": "Aterriza en tu cuerpo. Deja caer hombros, párpados y mandíbula. Siente el soporte estable donde estás sentado.",
    "zen_fase2_full.mp3": "Lleva la atención al roce del aire en la nariz. Nota el contraste de temperatura: frescor al inhalar, tibieza al exhalar.",
    "zen_fase3_full.mp3": "Si surge un pensamiento sobre trabajo o pendientes, nótalo con curiosidad y regresa suavemente al aire.",
    "zen_fase4_full.mp3": "Permite que la respiración respire por sí sola. Descansa en la breve quietud lúcida que hay entre cada respiración.",
    "zen_fase5_full.mp3": "Aprecia la serenidad que acabas de cultivar. Mantén esta presencia clara y tranquila al volver a tus actividades.",

    # Nivel más restrictivo (Guía Mínima): lee el nombre de la fase junto a un resumen breve de ese texto
    "zen_fase1_short.mp3": "Fase uno: Aterrizaje somático. Suelta hombros y mandíbula, y siente tu cuerpo.",
    "zen_fase2_short.mp3": "Fase dos: Contacto con el anclaje. Atiende al roce del aire en tu nariz.",
    "zen_fase3_short.mp3": "Fase tres: El retorno amable. Si te distraes, regresa al aire con suavidad.",
    "zen_fase4_short.mp3": "Fase cuatro: Descanso en presencia. Descansa en la quietud entre cada respiración.",
    "zen_fase5_short.mp3": "Fase cinco: Integración y calma. Mantén esta presencia clara y tranquila.",

    # Alias / compatibilidad estándar
    "zen_fase1.mp3": "Aterriza en tu cuerpo. Deja caer hombros, párpados y mandíbula. Siente el soporte estable donde estás sentado.",
    "zen_fase2.mp3": "Lleva la atención al roce del aire en la nariz. Nota el contraste de temperatura: frescor al inhalar, tibieza al exhalar.",
    "zen_fase3.mp3": "Si surge un pensamiento sobre trabajo o pendientes, nótalo con curiosidad y regresa suavemente al aire.",
    "zen_fase4.mp3": "Permite que la respiración respire por sí sola. Descansa en la breve quietud lúcida que hay entre cada respiración.",
    "zen_fase5.mp3": "Aprecia la serenidad que acabas de cultivar. Mantén esta presencia clara y tranquila al volver a tus actividades.",
}

async def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generando {len(CLIPS)} archivos de locución con voz femenina suave y dulce ({VOICE})...")
    for filename, text in CLIPS.items():
        out_path = os.path.join(OUTPUT_DIR, filename)
        comm = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
        await comm.save(out_path)
        size_kb = os.path.getsize(out_path) / 1024
        print(f" -> {filename} ({size_kb:.1f} KB)")
    print("¡Todas las locuciones fueron generadas con éxito!")

if __name__ == "__main__":
    asyncio.run(generate())
