class AudioEngine {
    constructor() {
        this.ctx = null;
        this.bpm = 120;
        this.beatsPerBar = 4;
        this.bars = 2;
        
        this.tracks = [];
        this.micStream = null;
        this.micSource = null;
        this.processor = null;
        this.silenceGain = null;
        
        this.metronomeEnabled = true;
        this.isPlaying = false;
        this.isRecording = false;
        this.recordStartScheduled = false;
        
        this.loopDuration = 0;
        this.loopStartTime = 0;
        this.nextBeatTime = 0;
        this.currentBeat = 0;
        
        this.onBeat = null;
        this.onLoopStart = null;
        this.onRecordingStart = null;
        this.onTrackRecorded = null;
        
        this.recordingData = { left: [], right: [] };
        this.recordingLength = 0;
        this.targetSamples = 0;
        this.timerID = null;
    }

    async init(bpm, timeSignature, bars) {
        this.bpm = parseInt(bpm);
        this.beatsPerBar = parseInt(timeSignature);
        this.bars = parseInt(bars);
        
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.loopDuration = (this.bars * this.beatsPerBar * 60) / this.bpm;
        this.targetSamples = Math.ceil(this.loopDuration * this.ctx.sampleRate);
        
        try {
            this.micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            this.micSource = this.ctx.createMediaStreamSource(this.micStream);
            
            // ScriptProcessor for recording
            this.processor = this.ctx.createScriptProcessor(4096, 2, 2);
            this.processor.onaudioprocess = this.onAudioProcess.bind(this);
            this.micSource.connect(this.processor);
            
            // Connect through a zero-gain node so it processes audio without feedback into speakers
            this.silenceGain = this.ctx.createGain();
            this.silenceGain.gain.value = 0;
            this.processor.connect(this.silenceGain);
            this.silenceGain.connect(this.ctx.destination);
            
            this.startClock();
            return true;
        } catch (err) {
            console.error("Mic error:", err);
            return false;
        }
    }

    startClock() {
        this.isPlaying = true;
        this.loopStartTime = this.ctx.currentTime;
        this.nextBeatTime = this.ctx.currentTime;
        this.currentBeat = 0;
        this.scheduler();
    }

    stopClock() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
        this.tracks.forEach(t => {
            if (t.sourceNode) {
                try { t.sourceNode.stop(); } catch(e) {}
            }
        });
        this.tracks = [];
    }

    scheduler() {
        if (!this.isPlaying) return;
        
        // Schedule beats slightly ahead of time
        while (this.nextBeatTime < this.ctx.currentTime + 0.1) {
            this.scheduleBeat(this.currentBeat, this.nextBeatTime);
            this.advanceBeat();
        }
        this.timerID = setTimeout(() => this.scheduler(), 25);
    }

    scheduleBeat(beatNumber, time) {
        if (this.metronomeEnabled) {
            const osc = this.ctx.createOscillator();
            const envelope = this.ctx.createGain();
            
            osc.frequency.value = (beatNumber === 0) ? 1000 : 800;
            envelope.gain.value = 1;
            envelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            
            osc.connect(envelope);
            envelope.connect(this.ctx.destination);
            
            osc.start(time);
            osc.stop(time + 0.1);
        }
        
        const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
        
        if (this.onBeat) {
            setTimeout(() => {
                if (this.onBeat) this.onBeat(beatNumber);
            }, delayMs);
        }
        
        if (beatNumber === 0) {
            setTimeout(() => {
                if (this.onLoopStart) this.onLoopStart();
            }, delayMs);
        }
    }

    advanceBeat() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextBeatTime += secondsPerBeat;
        this.currentBeat++;
        
        const totalBeats = this.bars * this.beatsPerBar;
        if (this.currentBeat >= totalBeats) {
            this.currentBeat = 0;
            this.loopStartTime = this.nextBeatTime;
            
            if (this.recordStartScheduled) {
                this.isRecording = true;
                this.recordStartScheduled = false;
                this.recordingData = { left: [], right: [] };
                this.recordingLength = 0;
                
                const delayMs = Math.max(0, (this.loopStartTime - this.ctx.currentTime) * 1000);
                setTimeout(() => {
                    if (this.onRecordingStart) this.onRecordingStart();
                }, delayMs);
            }
        }
    }

    scheduleRecording() {
        if (!this.isRecording) {
            this.recordStartScheduled = true;
        }
    }

    onAudioProcess(e) {
        if (!this.isRecording) return;
        
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.getChannelData(1);
        
        // Push copies of data
        this.recordingData.left.push(new Float32Array(left));
        this.recordingData.right.push(new Float32Array(right));
        this.recordingLength += left.length;
        
        if (this.recordingLength >= this.targetSamples) {
            this.isRecording = false;
            this.processRecording();
        }
    }

    processRecording() {
        // Create audio buffer exactly the size of loopDuration
        const buffer = this.ctx.createBuffer(2, this.targetSamples, this.ctx.sampleRate);
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);
        
        let offset = 0;
        for (let i = 0; i < this.recordingData.left.length; i++) {
            const l = this.recordingData.left[i];
            const r = this.recordingData.right[i];
            
            for (let j = 0; j < l.length; j++) {
                if (offset < this.targetSamples) {
                    leftChannel[offset] = l[j];
                    rightChannel[offset] = r[j];
                    offset++;
                }
            }
        }
        
        const trackId = Date.now().toString();
        this.addTrackFromBuffer(trackId, buffer);
        if (this.onTrackRecorded) this.onTrackRecorded(trackId);
    }

    addTrackFromBuffer(id, buffer) {
        const gainNode = this.ctx.createGain();
        gainNode.connect(this.ctx.destination);
        
        const sourceNode = this.ctx.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.loop = true;
        sourceNode.connect(gainNode);
        
        // Calculate offset to sync with master loop
        const currentContextTime = this.ctx.currentTime;
        const timeSinceLoopStart = (currentContextTime - this.loopStartTime) % this.loopDuration;
        const adjustedLoopStartTime = currentContextTime - timeSinceLoopStart;
        
        sourceNode.start(adjustedLoopStartTime, timeSinceLoopStart);
        
        this.tracks.push({
            id,
            buffer,
            sourceNode,
            gainNode,
            isMuted: false,
            volume: 1
        });
    }

    setTrackVolume(id, volume) {
        const track = this.tracks.find(t => t.id === id);
        if (track) {
            track.volume = volume;
            if (!track.isMuted) {
                track.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
            }
        }
    }

    toggleTrackMute(id) {
        const track = this.tracks.find(t => t.id === id);
        if (track) {
            track.isMuted = !track.isMuted;
            const targetVol = track.isMuted ? 0 : track.volume;
            track.gainNode.gain.setValueAtTime(targetVol, this.ctx.currentTime);
            return track.isMuted;
        }
        return false;
    }

    deleteTrack(id) {
        const index = this.tracks.findIndex(t => t.id === id);
        if (index !== -1) {
            try { this.tracks[index].sourceNode.stop(); } catch(e) {}
            this.tracks.splice(index, 1);
        }
    }

    async renderOffline() {
        if (this.tracks.length === 0) return null;
        
        const offlineCtx = new OfflineAudioContext(2, this.targetSamples, this.ctx.sampleRate);
        
        this.tracks.forEach(track => {
            if (!track.isMuted && track.volume > 0) {
                const source = offlineCtx.createBufferSource();
                source.buffer = track.buffer;
                
                const gain = offlineCtx.createGain();
                gain.gain.value = track.volume;
                
                source.connect(gain);
                gain.connect(offlineCtx.destination);
                source.start(0);
            }
        });
        
        return await offlineCtx.startRendering();
    }

    audioBufferToWav(buffer) {
        let numOfChan = buffer.numberOfChannels,
            length = buffer.length * numOfChan * 2 + 44,
            bufferArray = new ArrayBuffer(length),
            view = new DataView(bufferArray),
            channels = [], i, sample,
            offset = 0,
            pos = 0;

        function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
        function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

        // write WAV header
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"

        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2); // block-align
        setUint16(16); // 16-bit

        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4); // chunk length

        // write interleaved data
        for (i = 0; i < buffer.numberOfChannels; i++)
            channels.push(buffer.getChannelData(i));

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([bufferArray], {type: "audio/wav"});
    }

    async exportWav() {
        const renderedBuffer = await this.renderOffline();
        if(!renderedBuffer) return null;
        return this.audioBufferToWav(renderedBuffer);
    }

    async exportMp3() {
        const renderedBuffer = await this.renderOffline();
        if(!renderedBuffer) return null;
        
        // Using lamejs
        if (typeof lamejs === 'undefined') {
            console.error("lamejs not loaded");
            return null;
        }

        const channels = renderedBuffer.numberOfChannels;
        const sampleRate = renderedBuffer.sampleRate;
        const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
        const mp3Data = [];
        
        const left = renderedBuffer.getChannelData(0);
        const right = channels > 1 ? renderedBuffer.getChannelData(1) : left;
        
        // Convert Float32 to Int16
        const sampleBlockSize = 1152;
        for (let i = 0; i < renderedBuffer.length; i += sampleBlockSize) {
            const leftChunk = new Int16Array(sampleBlockSize);
            const rightChunk = new Int16Array(sampleBlockSize);
            
            for (let j = 0; j < sampleBlockSize; j++) {
                if (i + j < renderedBuffer.length) {
                    leftChunk[j] = left[i + j] * 32767.5;
                    rightChunk[j] = right[i + j] * 32767.5;
                }
            }
            
            const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            if (mp3buf.length > 0) mp3Data.push(mp3buf);
        }
        
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
        
        return new Blob(mp3Data, {type: 'audio/mp3'});
    }
}

window.AudioEngine = AudioEngine;
