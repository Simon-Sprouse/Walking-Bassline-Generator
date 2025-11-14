namespace BlazorWalkingBassline.MusicTheory;

using BlazorWalkingBassline.Models;

public static class MidiConverter
{

    /// <summary>
    /// Converts a list of Note objects into a JS-friendly MIDI sequence format.
    /// </summary>
    /// <param name="notes">The list of C# Note objects to convert.</param>
    /// <returns>A list of anonymous objects ready for JSON serialization and JS interop.</returns>
    public static List<object> ConvertNotesToJsSequence(List<Note> notes, double BPM)
    {

        double QuarterNoteDurationSeconds = 60.0 / BPM;

        return notes.Select((note) =>
        {
            // --- TIME CALCULATION (Absolute Time in Seconds) ---

            // Assuming 4/4 time signature: (Measure - 1) * 4 + (Beat - 1)
            double absoluteBeat = (note.Measure - 1) * 4 + (note.Beat - 1);
            double startTimeSeconds = absoluteBeat * QuarterNoteDurationSeconds;
            double durationSeconds = note.Duration * QuarterNoteDurationSeconds;

            // --- COLUMN INDEX CALCULATION (For Playhead Highlighting) ---

            // Formula: header(1) + (measure-1) * (barLine + 4beats) + barLine + beatOffset
            // 5 = 1 bar line + 4 content columns
            int measureOffset = (note.Measure - 1) * 5;
            int beatOffset = (int)(note.Beat - 1); // Beat is 1-indexed
            int columnIndex = measureOffset + 1 + beatOffset; // 1 for header + measure offset + 1 for bar line + beat

            // Return the anonymous object structure expected by JavaScript
            return new
            {
                midi = note.MidiNumber,
                time = startTimeSeconds,
                duration = durationSeconds,
                columnIndex = columnIndex
            };
        }).ToList<object>(); // Convert to List<object> for easy JS interop
    }


}