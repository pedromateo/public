document.addEventListener('DOMContentLoaded', () => {
    const audio = new window.AudioEngine();
    
    // UI Elements
    const viewConfig = document.getElementById('view-config');
    const viewLooper = document.getElementById('view-looper');
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const timeSigSelect = document.getElementById('time-signature');
    const barsSelect = document.getElementById('bars-length');
    const startBtn = document.getElementById('start-session-btn');
    const modal = document.getElementById('mic-error-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    const activeBpm = document.getElementById('active-bpm');
    const activeSignature = document.getElementById('active-signature');
    const beatVisualizer = document.getElementById('beat-visualizer');
    const metronomeBtn = document.getElementById('metronome-btn');
    const recordBtn = document.getElementById('record-btn');
    const recordText = document.getElementById('record-text');
    const recordIcon = document.getElementById('record-icon');
    const globalStopBtn = document.getElementById('global-stop-btn');
    const resetSongBtn = document.getElementById('reset-song-btn');
    const tracksContainer = document.getElementById('tracks-container');
    const trackTemplate = document.getElementById('track-template');
    
    const exportWavBtn = document.getElementById('export-wav-btn');
    const exportMp3Btn = document.getElementById('export-mp3-btn');

    let totalBeats = 0;
    
    // Helper to set record button states
    function setRecordButtonState(state) {
        // Clear background colors and borders
        recordBtn.classList.remove(
            'bg-red-600', 'hover:bg-red-500', 'border-red-800', 'shadow-[0_0_20px_rgba(220,38,38,0.5)]',
            'bg-amber-500', 'hover:bg-amber-400', 'border-amber-700', 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
            'bg-emerald-500', 'hover:bg-emerald-400', 'border-emerald-700', 'shadow-[0_0_20px_rgba(16,185,129,0.5)]'
        );

        if (state === 'waiting') {
            recordBtn.classList.add('bg-amber-500', 'hover:bg-amber-400', 'border-amber-700', 'shadow-[0_0_20px_rgba(245,158,11,0.5)]');
            recordIcon.classList.remove('animate-pulse');
            recordText.textContent = "ESPERA";
        } else if (state === 'recording') {
            recordBtn.classList.add('bg-emerald-500', 'hover:bg-emerald-400', 'border-emerald-700', 'shadow-[0_0_20px_rgba(16,185,129,0.5)]');
            recordIcon.classList.add('animate-pulse');
            recordText.textContent = "GRABANDO";
        } else {
            // Idle
            recordBtn.classList.add('bg-red-600', 'hover:bg-red-500', 'border-red-800', 'shadow-[0_0_20px_rgba(220,38,38,0.5)]');
            recordIcon.classList.remove('animate-pulse');
            recordText.textContent = "GRABAR";
        }
    }
    
    // Update config UI
    bpmSlider.addEventListener('input', (e) => {
        bpmDisplay.textContent = e.target.value;
    });

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Start Session
    startBtn.addEventListener('click', async () => {
        const bpm = bpmSlider.value;
        const sig = timeSigSelect.value;
        const bars = barsSelect.value;
        
        const success = await audio.init(bpm, sig, bars);
        
        if (success) {
            viewConfig.classList.add('hidden');
            viewLooper.classList.remove('hidden');
            viewLooper.classList.add('flex');
            
            activeBpm.textContent = bpm;
            activeSignature.textContent = `${sig}/4`;
            
            totalBeats = parseInt(sig) * parseInt(bars);
            initBeatVisualizer(parseInt(bars), parseInt(sig));
        } else {
            modal.classList.remove('hidden');
        }
    });

    function initBeatVisualizer(barsCount, beatsPerBarCount) {
        beatVisualizer.innerHTML = '';
        let dotIndex = 0;
        for (let bar = 0; bar < barsCount; bar++) {
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2';
            for (let beat = 0; beat < beatsPerBarCount; beat++) {
                const dot = document.createElement('div');
                dot.className = 'w-3.5 h-3.5 shrink-0 rounded-full bg-gray-600 transition-colors duration-100';
                dot.id = `beat-dot-${dotIndex++}`;
                row.appendChild(dot);
            }
            beatVisualizer.appendChild(row);
        }
    }

    // Audio Engine Callbacks
    audio.onBeat = (beatNumber) => {
        // Reset all dots
        for(let i=0; i<totalBeats; i++) {
            const d = document.getElementById(`beat-dot-${i}`);
            if(d) {
                d.classList.remove('bg-primary', 'bg-emerald-400', 'bg-amber-400');
                d.classList.add('bg-gray-600');
            }
        }
        
        const currentDot = document.getElementById(`beat-dot-${beatNumber}`);
        if (currentDot) {
            currentDot.classList.remove('bg-gray-600');
            if (audio.isRecording) {
                currentDot.classList.add('bg-emerald-400');
            } else if (audio.recordStartScheduled) {
                currentDot.classList.add('bg-amber-400');
            } else {
                currentDot.classList.add('bg-primary');
            }
        }
    };
    
    audio.onRecordingStart = () => {
        setRecordButtonState('recording');
    };

    audio.onTrackRecorded = (trackId) => {
        setRecordButtonState('idle');
        renderTrack(trackId);
    };

    // UI Actions
    metronomeBtn.addEventListener('click', () => {
        audio.metronomeEnabled = !audio.metronomeEnabled;
        if (audio.metronomeEnabled) {
            metronomeBtn.classList.replace('bg-gray-700', 'bg-primary');
            metronomeBtn.innerHTML = '<span id="metronome-icon"><svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg></span> Metrónomo ON';
        } else {
            metronomeBtn.classList.replace('bg-primary', 'bg-gray-700');
            metronomeBtn.innerHTML = '<span id="metronome-icon"><svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg></span> Metrónomo OFF';
        }
    });

    recordBtn.addEventListener('click', () => {
        if (!audio.isRecording && !audio.recordStartScheduled) {
            audio.scheduleRecording();
            setRecordButtonState('waiting');
        }
    });

    globalStopBtn.addEventListener('click', () => {
        audio.stopClock();
        recordBtn.disabled = true;
        recordBtn.classList.add('opacity-50');
    });

    resetSongBtn.addEventListener('click', () => {
        window.location.reload();
    });
    
    function renderTrack(id) {
        const clone = trackTemplate.content.cloneNode(true);
        const item = clone.querySelector('.track-item');
        item.id = `track-${id}`;
        
        const trackCount = tracksContainer.children.length + 1;
        item.querySelector('.track-name').textContent = `Pista ${trackCount}`;
        
        const muteBtn = item.querySelector('.mute-btn');
        const muteOff = `<svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z m7.414-2l4-4m0 4l-4-4"></path></svg>`;
        const muteOn = `<svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 10c0-1.1.9-2 2-2h2l5-5v18l-5-5H7c-1.1 0-2-.9-2-2v-4z"></path></svg>`;
        
        muteBtn.addEventListener('click', () => {
            const isMuted = audio.toggleTrackMute(id);
            muteBtn.innerHTML = isMuted ? muteOff : muteOn;
            item.classList.toggle('opacity-50', isMuted);
        });
        
        const volSlider = item.querySelector('.vol-slider');
        volSlider.addEventListener('input', (e) => {
            audio.setTrackVolume(id, parseFloat(e.target.value));
        });
        
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            audio.deleteTrack(id);
            const el = document.getElementById(`track-${id}`);
            if (el) el.remove();
            
            // Rename tracks sequentially
            Array.from(tracksContainer.children).forEach((node, index) => {
                node.querySelector('.track-name').textContent = `Pista ${index + 1}`;
            });
        });
        
        tracksContainer.appendChild(clone);
    }
    
    // Export Functions
    function downloadBlob(blob, filename) {
        if(!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    exportWavBtn.addEventListener('click', async () => {
        exportWavBtn.textContent = "Generando...";
        exportWavBtn.disabled = true;
        const blob = await audio.exportWav();
        if (blob) {
            downloadBlob(blob, 'loop-session.wav');
        } else {
            alert("No hay pistas grabadas para exportar.");
        }
        exportWavBtn.textContent = "Exportar WAV";
        exportWavBtn.disabled = false;
    });

    exportMp3Btn.addEventListener('click', async () => {
        exportMp3Btn.textContent = "Generando...";
        exportMp3Btn.disabled = true;
        const blob = await audio.exportMp3();
        if(blob) {
            downloadBlob(blob, 'loop-session.mp3');
        } else {
            alert("Error o no hay pistas grabadas para exportar MP3");
        }
        exportMp3Btn.textContent = "Exportar MP3";
        exportMp3Btn.disabled = false;
    });
});
