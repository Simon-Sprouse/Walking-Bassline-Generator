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
