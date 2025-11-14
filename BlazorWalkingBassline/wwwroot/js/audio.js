window.toneInterop = {

    synth: null,
    audioStarted: false,

    audioContext: null,
    generatedBuffer: null,
    audioPlayer: null,
    isPlaying: false,
    startTime: 0,
    pauseOffset: 0,

    dotNetRef: null,    
    timerID: null,      
    allNotes: [],

    init() {
        if (window.Tone) {
            console.log("✅ Tone.js loaded successfully!", Tone.version);
        } else {
            console.error("❌ Tone.js not found!");
        }
    },

    setDotNetReference(dotNetRef) {
        this.dotNetRef = dotNetRef;
        console.log("✅ .NET reference set.");
    },

    async generateMidiTrack(notes, bpm = 120) {
        if (!this.audioStarted) {
            await this.startAudio();
        }

        console.log(`🎶 Generating audio track for ${notes.length} notes at ${bpm} BPM...`);

        this.allNotes = notes;
        
        let totalDurationSeconds = 0;
        notes.forEach(note => {
            const endTime = note.time + note.duration;
            if (endTime > totalDurationSeconds) {
                totalDurationSeconds = endTime;
            }
        });

        totalDurationSeconds += 0.25;

        const buffer = await Tone.Offline(({ transport }) => {

            transport.bpm.value = bpm;

            const bassSynth = new Tone.MonoSynth({
                oscillator: {
                    type: "sine5",
                    modulationIndex: 2,
                    harmonicity: 1.5
                },
                filter: {
                    Q: 2,
                    type: "lowpass",
                    rolloff: -24
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.3,
                    sustain: 0.5,
                    release: 0.8
                },
                filterEnvelope: {
                    attack: 0.01,
                    decay: 0.3,
                    sustain: 0.5,
                    release: 0.8,
                    baseFrequency: 100,
                    octaves: 4
                }
            }).toDestination();

            const part = new Tone.Part((time, value) => {
                const freq = Tone.Midi(value.midi).toFrequency();
                bassSynth.triggerAttackRelease(freq, value.duration, time);
            }, notes).start(0);

            transport.start(0);

        }, totalDurationSeconds);

        this.generatedBuffer = buffer;
        console.log("✅ Audio track buffer generated successfully.");

        return "MIDI track and audio buffer generated!";
    },

    startAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        return Tone.start().then(() => {
            console.log("AudioContext started:", Tone.context.state);
            this.audioStarted = true;

            if (!this.synth) {
                this.synth = new Tone.Synth().toDestination();
            }
        });
    },

    playNote(note = "C2", duration = "4n") {
        if (!this.audioStarted) {
            console.warn("AudioContext not started. Call startAudio() first!");
            return;
        }

        if (!this.synth) {
            console.warn("Synth not initialized.");
            return;
        }

        this.synth.triggerAttackRelease(note, duration);
    },

    _getTimeColumnIndex(currentTime) {
        if (currentTime < 0) return -1;

        for (let i = 0; i < this.allNotes.length; i++) {
            const note = this.allNotes[i];

            if (currentTime >= note.time && currentTime < (note.time + note.duration)) {
                return note.columnIndex; 
            }
        }
        
        return -1; 
    },

    _startPlaybackTimer() {
        if (!this.dotNetRef) return console.error("DotNet reference not set!");
        if (this.timerID) clearInterval(this.timerID);

        const updateIntervalMs = 100;

        this.timerID = setInterval(() => {
            if (!this.isPlaying) {
                clearInterval(this.timerID);
                this.timerID = null;
                return;
            }

            const context = this.audioContext;
            // CRITICAL FIX: The current time calculation now correctly uses startTime
            // startTime is set to (context.currentTime - pauseOffset) when playback starts
            // So elapsed time since start = context.currentTime - startTime
            // And actual position in buffer = elapsed time (no need to add pauseOffset again!)
            const currentTime = context.currentTime - this.startTime;

            const columnIndex = this._getTimeColumnIndex(currentTime);

            this.dotNetRef.invokeMethodAsync('SetHighlightColumn', columnIndex);

        }, updateIntervalMs);
        console.log("Playhead timer started.");
    },

    async _bufferToWaveBlob(audioBuffer) {
        const numOfChan = audioBuffer.numberOfChannels,
            length = audioBuffer.length * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [],
            sampleRate = audioBuffer.sampleRate;

        let offset = 0;
        let pos = 0;

        const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
        const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

        setUint32(0x46464952);
        setUint32(length - 8);
        setUint32(0x45564157);

        setUint32(0x20746d66);
        setUint32(16);
        setUint16(1);
        setUint16(numOfChan);
        setUint32(sampleRate);
        setUint32(sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2);
        setUint16(16);

        setUint32(0x61746164);
        setUint32(length - pos - 4);

        for (let i = 0; i < audioBuffer.numberOfChannels; i++)
            channels.push(audioBuffer.getChannelData(i));

        while (pos < length) {
            for (let i = 0; i < numOfChan; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([buffer], { type: "audio/wav" });
    },

    playGeneratedAudio() {
        if (this.isPlaying) return console.warn("Already playing!");
        if (!this.generatedBuffer) return console.warn("No buffer yet!");
        const context = this.audioContext;

        const numChannels = this.generatedBuffer.numberOfChannels;
        const nativeBuffer = context.createBuffer(
            numChannels,
            this.generatedBuffer.length,
            this.generatedBuffer.sampleRate
        );

        for (let i = 0; i < numChannels; i++) {
            nativeBuffer.copyToChannel(this.generatedBuffer.getChannelData(i), i);
        }

        const source = context.createBufferSource();
        source.buffer = nativeBuffer;
        source.connect(context.destination);

        const offset = this.pauseOffset;
        source.start(0, offset);

        console.log("Starting playback at offset: ", offset);

        this.audioPlayer = source;
        // CRITICAL FIX: Store the "virtual start time" 
        // This represents when the playback "would have started" if we were at position 0
        // So: virtualStartTime = actualStartTime - offsetInBuffer
        this.startTime = context.currentTime - offset;
        this.isPlaying = true;
        this._startPlaybackTimer();

        source.onended = () => {
            if (this.isPlaying) {
                this.pauseOffset = 0;
                console.log("Playback finished.");
                if (this.dotNetRef) {
                    this.dotNetRef.invokeMethodAsync('SetHighlightColumn', -1);
                }
            }
            this.isPlaying = false;
            this.audioPlayer = null;
        };
    },

    pauseAudio() {
        if (!this.isPlaying || !this.audioPlayer) return;
        const context = this.audioContext;

        // CRITICAL FIX: Calculate how far into the buffer we are
        // Since startTime = context.currentTime - offset when we started playing,
        // The current position = context.currentTime - startTime
        this.pauseOffset = context.currentTime - this.startTime;

        this.audioPlayer.stop();
        this.isPlaying = false;
        clearInterval(this.timerID);
        this.timerID = null;

        console.log(`⏸️ Playback paused at ${this.pauseOffset.toFixed(2)}s`);
    },
    
    // New simpler seek function that takes time directly
    seekToTime(timeInSeconds) {
        if (!this.generatedBuffer) return console.warn("No buffer yet!");
        
        // Remember if we were playing before the seek
        const wasPlaying = this.isPlaying;
        
        // Stop current playback if active (this will clear the timer and stop audio)
        if (this.isPlaying) {
            // Manually stop the audio source
            if (this.audioPlayer) {
                this.audioPlayer.stop();
                this.audioPlayer = null;
            }
            // Clear the timer
            if (this.timerID) {
                clearInterval(this.timerID);
                this.timerID = null;
            }
            // Mark as not playing (but don't reset pauseOffset yet)
            this.isPlaying = false;
        }
        
        // Set the new offset (this works whether paused or stopped)
        this.pauseOffset = timeInSeconds;
        
        // Update the visual highlight to match the new position
        if (this.dotNetRef) {
            const columnIndex = this._getTimeColumnIndex(timeInSeconds);
            this.dotNetRef.invokeMethodAsync('SetHighlightColumn', columnIndex);
        }
        
        // Only resume playback if we were playing before the seek
        if (wasPlaying) {
            this.resumeAudio();
        }
        
        console.log(`Seeked to ${timeInSeconds.toFixed(2)}s ${wasPlaying ? '(resuming playback)' : '(staying paused)'}`);
    },

    // Keep the old function for backwards compatibility if needed
    seekGeneratedAudio(columnIndex) {
        if (!this.generatedBuffer) return console.warn("No buffer yet!");
        
        let targetOffset = 0;
        
        const clickedNote = this.allNotes.find(note => note.columnIndex === columnIndex);
        
        if (clickedNote) {
            targetOffset = clickedNote.time;
        } else {
            console.warn(`Could not find note data for column index ${columnIndex}. Seeking to 0.`);
            targetOffset = 0;
        }

        // Just call the new seekToTime function
        this.seekToTime(targetOffset);
    },

    resumeAudio() {
        if (this.isPlaying) return console.warn("Already playing!");
        if (!this.generatedBuffer) return console.warn("No buffer yet!");
        this.playGeneratedAudio();
        console.log("▶️ Resuming playback...");
    },

    stopAudio() {
        if (this.audioPlayer) {
            this.audioPlayer.stop();
            this.isPlaying = false;
            this.pauseOffset = 0;
            clearInterval(this.timerID);
            this.timerID = null;

            // Clear the visual highlight when stopped
            if (this.dotNetRef) {
                this.dotNetRef.invokeMethodAsync('SetHighlightColumn', -1);
            }

            console.log("⏹️ Playback stopped");
        }
    }
};