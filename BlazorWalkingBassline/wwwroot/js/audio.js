window.toneInterop = {
    synth: null,
    audioStarted: false,

    init() {
        if (window.Tone) {
            console.log("✅ Tone.js loaded successfully!", Tone.version);
        } else {
            console.error("❌ Tone.js not found!");
        }
    },

    startAudio() {
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

    async generateAudioFile() {
        if (!this.audioStarted) {
            await this.startAudio();
        }

        console.log("🎶 Generating simple 4-note audio file...");

        const synth = new Tone.Synth().toDestination();

        // Create a simple 4-note sequence
        const notes = ["C2", "E2", "G2", "B2"];
        const duration = "4n";

        // Use Offline rendering to precompute the audio buffer
        const buffer = await Tone.Offline(({ transport }) => {
            const s = new Tone.Synth().toDestination();
            let time = 0;
            notes.forEach(note => {
                s.triggerAttackRelease(note, duration, time);
                time += 0.5; // half second between notes
            });
            transport.start(0);
        }, 2.5); // total duration in seconds

        // Store buffer for playback
        this.generatedBuffer = buffer;

        // Convert to WAV file and make downloadable
        const wavBlob = await this._bufferToWaveBlob(buffer);
        const url = URL.createObjectURL(wavBlob);

        console.log("✅ Generated WAV Blob:", wavBlob);

        // Optional: trigger download
        // const a = document.createElement("a");
        // a.href = url;
        // a.download = "simple_bassline.wav";
        // a.click();

        return "Audio file generated successfully!";
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

    async playGeneratedAudio() {
        if (!this.generatedBuffer) {
            console.warn("⚠️ No generated audio buffer found. Please generate first!");
            return;
        }

        const context = new (window.AudioContext || window.webkitAudioContext)();

        // Convert Tone.js AudioBuffer to native Web Audio buffer
        const numChannels = this.generatedBuffer.numberOfChannels;
        const length = this.generatedBuffer.length;
        const sampleRate = this.generatedBuffer.sampleRate;

        const nativeBuffer = context.createBuffer(numChannels, length, sampleRate);

        for (let i = 0; i < numChannels; i++) {
            nativeBuffer.copyToChannel(this.generatedBuffer.getChannelData(i), i);
        }

        const source = context.createBufferSource();
        source.buffer = nativeBuffer;
        source.connect(context.destination);
        source.start(0);

        this.audioPlayer = source;
        console.log("▶️ Playing generated audio...");
    }


};
