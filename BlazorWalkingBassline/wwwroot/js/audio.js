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
    }
};
