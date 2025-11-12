using System;
using System.Collections.Generic;
using System.Linq;
using BlazorWalkingBassline.Models;

namespace BlazorWalkingBassline.MusicTheory
{
    public static class FretboardMapper
    {
        // Standard 4-string bass tuning (E1, A1, D2, G2)
        // Index 0 = E string (lowest), Index 3 = G string (highest)
        private static readonly int[] OpenStrings = [ 28, 33, 38, 43 ];
        private const int MaxFret = 24;

        // Cost weights (can tune later)
        private const int FretCostWeight = 1;
        private const int StringCostWeight = 1;

        /// Map a chordNotesList (MIDI numbers) to TabNotes using a greedy strategy
        public static List<(Chord chord, List<TabNote> notes)> MapChordsToTab(List<(Chord chord, List<int> notes)> chordNotesList)
        {
            var result = new List<(Chord chord, List<TabNote> notes)>();
            TabNote previousNote = null;

            foreach (var (chord, midiNotes) in chordNotesList)
            {
                var chordTabNotes = new List<TabNote>();
                int beatCounter = 1; // reset beat per measure

                foreach (var midi in midiNotes)
                {
                    var candidates = GetPlayablePositions(midi);

                    TabNote chosen;

                    if (previousNote == null)
                    {
                        // First note overall: choose lowest fret
                        chosen = candidates.OrderBy(n => n.Fret).First();
                    }
                    else
                    {
                        // Greedy: pick candidate with minimal movement from previous note
                        chosen = candidates.OrderBy(n => Cost(previousNote, n)).First();
                    }

                    // Set beat for this measure
                    chosen.Beat = beatCounter++;
                    chordTabNotes.Add(chosen);

                    previousNote = chosen;
                }

                result.Add((chord, chordTabNotes));
            }

            return result;
        }


        /// Compute all playable TabNote positions for a MIDI note
        private static List<TabNote> GetPlayablePositions(int midiNote)
        {
            var list = new List<TabNote>();

            for (int stringIdx = 0; stringIdx < OpenStrings.Length; stringIdx++)
            {
                int fret = midiNote - OpenStrings[stringIdx];
                if (fret >= 0 && fret <= MaxFret)
                {
                    // StringNumber: 1 = G (highest), 4 = E (lowest)
                    int stringNumber = 4 - stringIdx;
                    list.Add(new TabNote(stringNumber, fret, 0)); // beat will be set later
                }
            }

            return list;
        }


        /// Compute simple cost between two TabNotes
        private static int Cost(TabNote prev, TabNote next)
        {
            int fretDiff = Math.Abs(next.Fret - prev.Fret);
            int stringDiff = Math.Abs(next.StringNumber - prev.StringNumber);
            return fretDiff * FretCostWeight + stringDiff * StringCostWeight;
        }
    }
}
