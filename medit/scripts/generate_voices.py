#!/usr/bin/env python3
import asyncio
import os
import edge_tts

VOICE = "es-ES-ElviraNeural"
RATE = "-12%"
PITCH = "+0Hz"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio", "voice")

CLIPS = {
    "zen_inicio.mp3": "Acomoda tu postura y permite que tu respiración encuentre su ritmo natural.",
    "zen_cierre.mp3": "Aprecia este momento que te has dedicado. Lleva esta serenidad a tu siguiente tarea.",
    "resp_inhala.mp3": "Inhala suavemente por la nariz.",
    "resp_inhala_extra.mp3": "Inhala un poco más, llenando el diafragma.",
    "resp_sosten.mp3": "Sostén el aire con calma, hombros relajados.",
    "resp_exhala.mp3": "Exhala largo y suelta todo el aire.",
    "resp_vacio.mp3": "Pausa en vacío, descansando sin aire.",
    "stop_s.mp3": "Stop. Detén lo que estás haciendo por un instante.",
    "stop_t.mp3": "Take a breath. Toma una respiración profunda y siente el aire.",
    "stop_o.mp3": "Observe. Observa tus sensaciones corporales y tu mente sin juzgar.",
    "stop_p.mp3": "Proceed. Continúa tu día con calma y presencia clara.",
    "zen_fase1.mp3": "Aterriza en tu cuerpo. Deja caer hombros, párpados y mandíbula.",
    "zen_fase2.mp3": "Lleva la atención al roce del aire en la nariz. Nota su frescor y su tibieza.",
    "zen_fase3.mp3": "Si notas distracciones, reconócelas con amabilidad y regresa con suavidad al aire.",
    "zen_fase4.mp3": "Descansa en la quietud lúcida que hay entre cada respiración.",
}

async def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generando {len(CLIPS)} archivos de locución en {OUTPUT_DIR}...")
    for filename, text in CLIPS.items():
        out_path = os.path.join(OUTPUT_DIR, filename)
        comm = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
        await comm.save(out_path)
        size_kb = os.path.getsize(out_path) / 1024
        print(f" -> {filename} ({size_kb:.1f} KB)")
    print("¡Todas las locuciones fueron generadas con éxito!")

if __name__ == "__main__":
    asyncio.run(generate())
