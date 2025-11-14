window.toneInterop = {

    synth: null,
    audioStarted: false, // browser requires user click before sound can play

    // store audio context 
    audioContext: null,
    generatedBuffer: null,
    audioPlayer: null,
    isPlaying: false,
    startTime: 0,       // track when playback started
    pauseOffset: 0,     // secones into buffer when paused

    init() {
        if (window.Tone) {
            console.log("✅ Tone.js loaded successfully!", Tone.version);
        } else {
            console.error("❌ Tone.js not found!");
        }
    },

    async generateMidiTrack(notes, bpm = 120) {
        if (!this.audioStarted) {
            // Ensure audio context is started on user interaction
            await this.startAudio(); 
        }

        console.log(`🎶 Generating audio track for ${notes.length} notes at ${bpm} BPM...`);
        
        // Find the total duration needed for the offline rendering
        // The last note's end time determines the length of the track
        let totalDurationSeconds = 0;
        notes.forEach(note => {
            const endTime = note.time + note.duration;
            if (endTime > totalDurationSeconds) {
                totalDurationSeconds = endTime;
            }
        });

        // Add a small buffer at the end
        totalDurationSeconds += 0.25; 

        // Use Offline rendering to precompute the audio buffer
        const buffer = await Tone.Offline(({ transport }) => {
            
            // Set the BPM for the offline transport
            transport.bpm.value = bpm;

            const bassSynth = new Tone.MonoSynth({
                oscillator: {
                    type: "sine5", 
                    modulationIndex: 2,
                    harmonicity: 1.5
                },
                filter: {
                    Q: 2,            // adds resonance for more bass “body”
                    type: "lowpass",
                    rolloff: -24
                },
                envelope: {
                    attack: 0.01,    // almost instant pluck
                    decay: 0.3,      // slightly longer decay
                    sustain: 0.5,    // moderate body
                    release: 0.8     // smooth release
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


            // Create a Tone.Part to schedule all the notes
            const part = new Tone.Part((time, value) => {
                // The time is the absolute time in seconds (already calculated in C#)
                // The value is the note data we passed in the array
                const freq = Tone.Midi(value.midi).toFrequency();
                bassSynth.triggerAttackRelease(freq, value.duration, time);
            }, notes).start(0); // Start scheduling from the very beginning

            // Start the transport (playback timeline)
            transport.start(0);

        }, totalDurationSeconds); // Total duration in seconds

        // Store buffer for playback
        this.generatedBuffer = buffer;
        console.log("✅ Audio track buffer generated successfully.");

        // Optional: you can still generate a file if you uncomment the code below
        // const wavBlob = await this._bufferToWaveBlob(buffer);
        // console.log("Generated WAV Blob:", wavBlob);
        
        return "MIDI track and audio buffer generated!";
    },

    startAudio() {

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Must be called on a user gesture
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

        // write WAVE header
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8);
        setUint32(0x45564157); // "WAVE"

        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16);
        setUint16(1);
        setUint16(numOfChan);
        setUint32(sampleRate);
        setUint32(sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2);
        setUint16(16);

        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4);

        // write interleaved data
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

        const offset = this.pauseOffset; // resume from paused position
        source.start(0, offset);

        console.log("Offset: ", offset);

        this.audioPlayer = source;
        this.startTime = context.currentTime - offset;
        this.isPlaying = true;

        source.onended = () => {
            if (this.isPlaying) {
                // playback reached the end naturally
                this.pauseOffset = 0;
                console.log("Playback finished.");
            }
            this.isPlaying = false;
            this.audioPlayer = null;
        };
    },

    pauseAudio() {
        if (!this.isPlaying || !this.audioPlayer) return;
        const context = this.audioContext;

        // calculate how many seconds have already played
        this.pauseOffset = context.currentTime - this.startTime;

        // stop current node
        this.audioPlayer.stop();
        this.isPlaying = false;
        console.log(`⏸️ Playback paused at ${this.pauseOffset.toFixed(2)}s`);
    },

    resumeAudio() {
        if (this.isPlaying) return console.warn("Already playing!");
        if (!this.generatedBuffer) return console.warn("No buffer yet!");
        this.playGeneratedAudio(); // will use pauseOffset to resume
        console.log("▶️ Resuming playback...");
    },

    stopAudio() {
        if (this.audioPlayer) {
            this.audioPlayer.stop();
            this.isPlaying = false;
            this.pauseOffset = 0;
            console.log("⏹️ Playback stopped");
        }
    }






    

};
