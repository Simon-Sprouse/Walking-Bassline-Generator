window.toneInterop = {

    synth: null,
    audioStarted: false,

    audioContext: null,
    generatedBuffer: null,
    audioPlayer: null,
    isPlaying: false,
    startTime: 0,
    pauseOffset: 0,

    isLooping: false,

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

    toggleLooping(shouldLoop) { 
        this.isLooping = shouldLoop;
        console.log(`🔁 Looping is now ${shouldLoop ? 'ON' : 'OFF'}.`);
    },

    setDotNetReference(dotNetRef) {
        this.dotNetRef = dotNetRef;
        console.log("✅ .NET reference set.");
    },

    async generateMidiTrack(notes, bpm) {
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

        // totalDurationSeconds += 0.25;

        const buffer = await Tone.Offline(({ transport }) => {

            transport.bpm.value = bpm;

            // ==================================================
            // ========== P-BASS SYNTH CHAIN (DROP-IN) ==========
            // ==================================================

            // AMP ENVELOPE — realistic bass envelope
            const bassAmp = new Tone.AmplitudeEnvelope({
                attack: 0.003,
                decay: 0.12,
                sustain: 0.7,
                release: 0.25
            }).toDestination();

            // FILTER — P-Bass warmth & audibility
            const bassFilter = new Tone.Filter({
                type: "lowpass",
                frequency: 750,
                rolloff: -24,
                Q: 0.8
            }).connect(bassAmp);

            // Saturation (pickup simulation)
            const saturator = new Tone.WaveShaper(x => Math.tanh(x * 1.6))
                .connect(bassFilter);

            // Fundamental sine
            const osc1 = new Tone.Oscillator({
                type: "sine"
            }).connect(saturator).start();

            // 2nd harmonic — gives body, not a chord
            const osc2 = new Tone.Oscillator({
                type: "sine",
                volume: -10
            }).connect(saturator).start();

            // Pluck noise — simulates string attack
            const pluck = new Tone.NoiseSynth({
                noise: { type: "white" },
                envelope: {
                    attack: 0.001,
                    decay: 0.015,
                    sustain: 0
                },
                volume: -22
            }).connect(bassFilter);

            // ==================================================
            // =============== NOTE SEQUENCING ==================
            // ==================================================

            const part = new Tone.Part((time, value) => {

                const freq = Tone.Midi(value.midi).toFrequency();

                // Set fundamental + harmonic frequencies
                osc1.frequency.setValueAtTime(freq, time);
                osc2.frequency.setValueAtTime(freq * 2, time);

                // Pluck attack
                pluck.triggerAttackRelease(0.02, time);

                // Body of the note
                bassAmp.triggerAttackRelease(value.duration, time);

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

        // Must create a NEW AudioBufferSourceNode every time you call start()
        const source = context.createBufferSource();
        source.buffer = nativeBuffer;
        source.connect(context.destination);

        const offset = this.pauseOffset;
        source.start(0, offset);

        console.log("Starting playback at offset: ", offset);

        this.audioPlayer = source;
        this.startTime = context.currentTime - offset;
        this.isPlaying = true;
        this._startPlaybackTimer();

        // CRITICAL UPDATE: Handle Looping logic in onended
        const currentSource = source;
        source.onended = () => {
            // Only process onended if this is still the active source
            if (this.audioPlayer === currentSource) {

                if (this.isLooping) {
                    console.log("🔁 Loop end reached, restarting playback.");

                    // Cleanly tear down current playback state
                    this.pauseOffset = 0;
                    this.isPlaying = false;
                    this.audioPlayer = null;

                    // Clear any existing timer so we don't create duplicates
                    if (this.timerID) {
                        clearInterval(this.timerID);
                        this.timerID = null;
                    }

                    // Start playback again from the start (this will create a new source)
                    // Use setTimeout to ensure audio nodes have finished cleaning up
                    setTimeout(() => {
                        this.playGeneratedAudio();
                    }, 10);

                } else {
                    // Non-looping: cleanup and notify .NET to clear highlight
                    this.pauseOffset = 0;
                    this.isPlaying = false;
                    this.audioPlayer = null;

                    if (this.timerID) {
                        clearInterval(this.timerID);
                        this.timerID = null;
                    }

                    console.log("Playback finished (non-looping).");
                    if (this.dotNetRef) {
                        this.dotNetRef.invokeMethodAsync('SetHighlightColumn', -1);
                    }
                }
            }
        };

    },

    pauseAudio() {
        if (!this.isPlaying || !this.audioPlayer) return;
        const context = this.audioContext;

        this.pauseOffset = context.currentTime - this.startTime;

        // Stop the source and clear reference
        // Stopping also triggers onended, but the `if (this.audioPlayer === currentSource && this.isPlaying)` check
        // inside onended will prevent an unwanted loop start if this.isPlaying is set to false first.
        this.audioPlayer.stop(); 
        this.audioPlayer = null; // Clear the reference
        this.isPlaying = false;  // Set state to not playing *before* the stop/onended fires
        
        if (this.timerID) {
            clearInterval(this.timerID);
            this.timerID = null;
        }

        console.log(`⏸️ Playback paused at ${this.pauseOffset.toFixed(2)}s`);
    },

    seekToTime(timeInSeconds) {
        if (!this.generatedBuffer) return console.warn("No buffer yet!");
        
        const wasPlaying = this.isPlaying;
        
        // Stop current playback completely
        if (this.isPlaying || this.audioPlayer) {
            // Clear timer first
            if (this.timerID) {
                clearInterval(this.timerID);
                this.timerID = null;
            }
            
            // Stop and clear audio source
            if (this.audioPlayer) {
                this.audioPlayer.stop();
                this.audioPlayer = null;
            }
            
            // Reset playing state
            this.isPlaying = false;
        }
        
        // Set the new offset
        this.pauseOffset = timeInSeconds;
        
        // Update visual highlight immediately
        if (this.dotNetRef) {
            const columnIndex = this._getTimeColumnIndex(timeInSeconds);
            this.dotNetRef.invokeMethodAsync('SetHighlightColumn', columnIndex);
        }
        
        // Resume if we were playing
        if (wasPlaying) {
            // Small delay to ensure cleanup is complete
            setTimeout(() => {
                this.playGeneratedAudio();
            }, 10);
        }
        
        console.log(`Seeked to ${timeInSeconds.toFixed(2)}s ${wasPlaying ? '(resuming playback)' : '(staying paused)'}`);
    },

    stopAudio() {
        // Clear timer first
        if (this.timerID) {
            clearInterval(this.timerID);
            this.timerID = null;
        }
        
        // Stop and clear audio source
        if (this.audioPlayer) {
            this.audioPlayer.stop();
            this.audioPlayer = null;
        }
        
        // Reset state
        this.isPlaying = false;
        this.pauseOffset = 0;

        // Clear visual highlight
        if (this.dotNetRef) {
            this.dotNetRef.invokeMethodAsync('SetHighlightColumn', -1);
        }

        console.log("⏹️ Playback stopped");
    }
};