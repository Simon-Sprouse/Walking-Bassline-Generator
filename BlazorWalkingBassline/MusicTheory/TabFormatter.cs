using System.Text;
using BlazorWalkingBassline.Models;

namespace BlazorWalkingBassline.MusicTheory;

public static class TabFormatter
{
    private static readonly string[] StringNames = { "G", "D", "A", "E" }; // top to bottom visually

    public static string RenderAscii(List<(Chord chord, List<TabNote> notes)> tabNotesList, int beatsPerBar = 4)
    {
        if (tabNotesList == null || tabNotesList.Count == 0)
            return "(no tab notes)";

        const int slotWidth = 6; // width per beat slot
        var sb = new StringBuilder();

        // --- Render chord names line ---
        sb.Append("  "); // offset for string labels
        foreach (var (chord, _) in tabNotesList)
        {
            string chordText = chord.ToString();
            int measureWidth = beatsPerBar * slotWidth;

            // Center chord name in measure
            int leftPadding = (measureWidth - chordText.Length) / 2;
            int rightPadding = measureWidth - chordText.Length - leftPadding;

            sb.Append(new string(' ', leftPadding) + chordText + new string(' ', rightPadding));
            sb.Append(" "); // space between measures
        }
        sb.AppendLine(); // end chord line

        // --- Render tab lines ---
        for (int stringNumber = 1; stringNumber <= StringNames.Length; stringNumber++)
        {
            string stringName = StringNames[stringNumber - 1];
            sb.Append($"{stringName}|");

            foreach (var (_, notes) in tabNotesList)
            {
                for (int beat = 1; beat <= beatsPerBar; beat++)
                {
                    // Find a note that matches this string and beat
                    var note = notes.FirstOrDefault(n => n.StringNumber == stringNumber && n.Beat == beat);
                    sb.Append(FormatFretSlot(note?.Fret, slotWidth));
                }

                sb.Append('|'); // vertical bar between measures
            }

            sb.AppendLine(); // end of this string line
        }

        // --- Render beat numbers below ---
        sb.Append("  "); // offset for string labels
        foreach (var (_, notes) in tabNotesList)
        {
            for (int beat = 1; beat <= beatsPerBar; beat++)
            {
                sb.Append(FormatBeatSlot(beat, slotWidth));
            }

            sb.Append(" "); // space between measures
        }

        return sb.ToString();
    }

    // Format a fret number inside a slot
    private static string FormatFretSlot(int? fret, int slotWidth)
    {
        if (fret == null)
            return new string('-', slotWidth);

        string fretText = fret.Value.ToString();
        int leftPadding = (slotWidth - fretText.Length) / 2;
        int rightPadding = slotWidth - fretText.Length - leftPadding;

        return new string('-', leftPadding) + fretText + new string('-', rightPadding);
    }

    // Format beat numbers under each slot
    private static string FormatBeatSlot(int beat, int slotWidth)
    {
        string beatText = beat.ToString();
        int leftPadding = (slotWidth - beatText.Length) / 2;
        int rightPadding = slotWidth - beatText.Length - leftPadding;

        return new string(' ', leftPadding) + beatText + new string(' ', rightPadding);
    }
}
