using System.Text;
using BlazorWalkingBassline.Models;

namespace BlazorWalkingBassline.MusicTheory;

public static class TabFormatter
{
    private static readonly string[] StringNames = ["G", "D", "A", "E"]; // top to bottom visually

    public static string RenderTextTab(List<TabNote> notes, int beatsPerBar = 4)
    {
        if (notes == null || notes.Count == 0)
            return "(no tab notes)";

        var sb = new StringBuilder();
        const int slotWidth = 6; // width per beat slot

        // Render each string line
        for (int stringNumber = 1; stringNumber <= StringNames.Length; stringNumber++)
        {
            string stringName = StringNames[stringNumber - 1];
            sb.Append($"{stringName}|");

            for (int beat = 1; beat <= beatsPerBar; beat++)
            {
                var note = notes.FirstOrDefault(n => n.StringNumber == stringNumber && n.Beat == beat);
                sb.Append(FormatFretSlot(note?.Fret, slotWidth));
            }

            sb.Append("|\n");
        }

        // Render beat numbers below, aligned
        sb.Append("  "); // offset for left tab bar
        for (int beat = 1; beat <= beatsPerBar; beat++)
        {
            sb.Append(FormatBeatSlot(beat, slotWidth));
        }

        return sb.ToString();
    }


    // Helper: format a fret number inside a slot
    private static string FormatFretSlot(int? fret, int slotWidth)
    {
        if (fret == null)
            return new string('-', slotWidth);

        string fretText = fret.Value.ToString();

        // Center fret text inside slot
        int leftPadding = (slotWidth - fretText.Length) / 2;
        int rightPadding = slotWidth - fretText.Length - leftPadding;

        return new string('-', leftPadding) + fretText + new string('-', rightPadding);
    }

    // Helper: format beats under each note
    private static string FormatBeatSlot(int beat, int slotWidth)
    {
        string beatText = beat.ToString();

        // Center beat inside slot
        int leftPadding = (slotWidth - beatText.Length) / 2;
        int rightPadding = slotWidth - beatText.Length - leftPadding;

        return new string(' ', leftPadding) + beatText + new string(' ', rightPadding);

    }



}
