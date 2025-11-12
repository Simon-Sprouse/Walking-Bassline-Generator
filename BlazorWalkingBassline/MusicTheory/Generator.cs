namespace BlazorWalkingBassline.MusicTheory;

using System;
using System.Collections.Generic;
using BlazorWalkingBassline.Models;

public class Generator
{
    private Progression progression;
    private int[] formula = { 1, 3, 5, 3 }; // TODO make this dynamic and add to constructor

    private readonly string[] Notes =
            { "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" };

    private static readonly Dictionary<ScaleDegree, int> DegreeSemitoneOffsets = new()
    {
        { ScaleDegree.One, 0 },
        { ScaleDegree.FlatTwo, 1 },
        { ScaleDegree.Two, 2 },
        { ScaleDegree.FlatThree, 3 },
        { ScaleDegree.Three, 4 },
        { ScaleDegree.Four, 5 },
        { ScaleDegree.FlatFive, 6 },
        { ScaleDegree.Five, 7 },
        { ScaleDegree.SharpFive, 8 },
        { ScaleDegree.Six, 9 },
        { ScaleDegree.FlatSeven, 10 },
        { ScaleDegree.Seven, 11 }
    };

    // Each key is ScaleDegree, value is the 7-note scale in semitones relative to root of the key
    private static readonly Dictionary<ScaleDegree, int[]> DegreeToModeIntervals = new()
    {
        { ScaleDegree.One,       new [] {0, 2, 4, 5, 7, 9, 11} }, // Ionian (major)
        { ScaleDegree.Two,       new [] {0, 2, 3, 5, 7, 9, 10} }, // Dorian
        { ScaleDegree.Three,     new [] {0, 1, 3, 5, 7, 8, 10} }, // Phrygian
        { ScaleDegree.Four,      new [] {0, 2, 4, 6, 7, 9, 11} }, // Lydian
        { ScaleDegree.Five,      new [] {0, 2, 4, 5, 7, 9, 10} }, // Mixolydian
        { ScaleDegree.Six,       new [] {0, 2, 3, 5, 7, 8, 10} }, // Aeolian (minor)
        { ScaleDegree.Seven,     new [] {0, 1, 3, 5, 6, 8, 10} }, // Locrian
    };






    // constructor
    public Generator(Progression _progression)
    {
        progression = _progression;
    }






    // Given a key and scale degree, return the string note name for that degree
    private string GetRootNoteFromDegree(string key, ScaleDegree degree)
    {
        int keyIndex = Array.IndexOf(Notes, key);
        if (keyIndex == -1)
            throw new Exception($"Key '{key}' not found in chromatic notes.");

        if (!DegreeSemitoneOffsets.TryGetValue(degree, out int semitoneOffset))
            throw new Exception($"ScaleDegree '{degree}' not found in semitone offset table.");

        int resultIndex = (keyIndex + semitoneOffset) % Notes.Length;
        return Notes[resultIndex];
    }




    // Take a note name ("C", "C#", etc.) and return the lowest possible MIDI number >= 28
    private int LowestMidiFromNote(string note)
    {
        int noteIndex = Array.IndexOf(Notes, note);
        if (noteIndex == -1)
            throw new Exception($"Note '{note}' not found.");

        int midi = noteIndex; // start at C0 = 0 semitones

        // Raise by octaves until >= 28 (E1)
        while (midi < 28)
            midi += 12;

        return midi;
    }


    // Helper to pick modal interval set based on degree + chord quality
    private static int[] GetModalIntervals(ScaleDegree degree, ChordQuality? quality)
    {
        // Default mode based on degree (major scale harmony)
        if (DegreeToModeIntervals.TryGetValue(degree, out var mode))
            return mode;

        // Fallback by chord quality (use Ionian for major, Aeolian for minor, Locrian for diminished)
        return quality switch
        {
            ChordQuality.Major => DegreeToModeIntervals[ScaleDegree.One],
            ChordQuality.Minor => DegreeToModeIntervals[ScaleDegree.Six],
            ChordQuality.Diminished => DegreeToModeIntervals[ScaleDegree.Seven],
            _ => DegreeToModeIntervals[ScaleDegree.One]
        };
    }



    public List<(Chord chord, List<int> midiNotes)> GenerateChordNotes()
    {
        var result = new List<(Chord, List<int>)>();

        foreach (var chord in progression.Chords)
        {

            Console.WriteLine("Chord: " + chord.ToString());

            // --- Step 1: Get modal intervals for this chord ---
            int[] modeIntervals = GetModalIntervals(chord.Degree, chord.Quality);

            // --- Step 2: Determine the root note (string + MIDI) ---
            string chordRootNote = GetRootNoteFromDegree(progression.Key, chord.Degree);
            int chordRootMidi = LowestMidiFromNote(chordRootNote);

            // --- Step 3: Build MIDI notes using formula ---
            var chordMidiNotes = new List<int>();
            for (int j = 0; j < formula.Length; j++)
            {
                int modeIndex = formula[j] - 1; // 1-based formula
                if (modeIndex < 0 || modeIndex >= modeIntervals.Length)
                    throw new Exception($"Formula index {formula[j]} is out of bounds for mode intervals.");

                int semitoneOffset = modeIntervals[modeIndex];
                int noteMidi = chordRootMidi + semitoneOffset;
                chordMidiNotes.Add(noteMidi);
            }

            // --- Step 4: Add to result ---
            result.Add((chord, chordMidiNotes));
        }

        return result;
    }

    public string NoteFromMidi(int midi)
    {
        // Offset to align C1 = MIDI 4
        int noteIndex = midi % 12;
        int octave = midi / 12;
        return $"{Notes[noteIndex]}{octave}";
    }



}
