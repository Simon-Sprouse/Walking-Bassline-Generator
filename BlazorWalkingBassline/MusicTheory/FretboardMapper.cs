using BlazorWalkingBassline.Models;

namespace BlazorWalkingBassline.MusicTheory
{
    public static class FretboardMapper
    {
        // Standard 4-string bass tuning (E1, A1, D2, G2)
        // MIDI Note Numbers for open strings: E1 (28), A1 (33), D2 (38), G2 (43)
        // Index 0 = E string (lowest), Index 3 = G string (highest)
        private static readonly int[] OpenStrings = [ 28, 33, 38, 43 ];
        private const int MaxFret = 24;

        // Cost weights (can tune later)
        private const int FretCostWeight = 1;
        private const int StringCostWeight = 1;

        /// <summary>
        /// Map MIDI numbers to TabNotes using a greedy strategy
        /// </summary>
        public static List<TabNote> MapNotesToTab(List<Note> notesList)
        {
            List<TabNote> result = new List<TabNote>();

            // Use a sentinel TabNote for the "starting position" before the first note
            // Placing it on Fret 12 of the E string (String 0) is a reasonable neutral spot.
            TabNote previousTabNote = new TabNote(0, 12, 0, 0.0);

            foreach (var currentNote in notesList)
            {
                List<TabNote> possiblePositions = GetPlayablePositions(currentNote.MidiNumber)
                    .Select(pos => new TabNote(
                        pos.StringNumber, 
                        pos.Fret, 
                        currentNote.Measure, 
                        currentNote.Beat))
                    .ToList();

                // If no positions are playable (outside the fretboard), skip the note
                if (!possiblePositions.Any())
                {
                    // Optionally log a warning here.
                    continue; 
                }

                // Greedily select the position with the lowest cost from the previous note
                TabNote bestPosition = possiblePositions
                    .OrderBy(next => Cost(previousTabNote, next))
                    .First();

                result.Add(bestPosition);
                // The best position for the current note becomes the "previous" position for the next iteration
                previousTabNote = bestPosition;
            }

            return result;
        }


        /// <summary>
        /// Compute all playable TabNote positions for a MIDI note
        /// </summary>
        private static List<TabNote> GetPlayablePositions(int midiNote)
        {
            var list = new List<TabNote>();

            // Iterate through the four strings (0 to 3)
            for (int stringIndex = 0; stringIndex < OpenStrings.Length; stringIndex++)
            {
                int openMidiNote = OpenStrings[stringIndex];
                
                // Calculate the fret number
                int fret = midiNote - openMidiNote;

                // Check if the resulting fret is within the playable range (0 to MaxFret)
                if (fret >= 0 && fret <= MaxFret)
                {
                    // We use (stringIndex + 1) for the StringNumber property 
                    // if you intend for 'String 1' to be the E string (common for tab notation).
                    // If 0-indexed is preferred for the model, use stringIndex. I'm assuming 1-indexed for user tab.
                    // The 'Measure' and 'Beat' fields are not needed here, as this is just position mapping.
                    list.Add(new TabNote(
                        stringIndex, // Use stringIndex (0-3) for internal logic
                        fret,
                        0, // Dummy measure/beat
                        0.0 // Dummy measure/beat
                    ));
                }
            }

            return list;
        }


        /// <summary>
        /// Compute simple cost between two TabNotes
        /// </summary>
        private static int Cost(TabNote prev, TabNote next)
        {
            // Fret difference is how far the hand has to move
            int fretDiff = Math.Abs(next.Fret - prev.Fret);
            // String difference is how far the plucking hand has to move (or just a weight for changing strings)
            int stringDiff = Math.Abs(next.StringNumber - prev.StringNumber);
            
            // Note: If prev and next are on the same string, the cost should be the fret movement.
            // If they are on different strings, the cost is the weighted combination.
            return fretDiff * FretCostWeight + stringDiff * StringCostWeight;
        }
    }
}