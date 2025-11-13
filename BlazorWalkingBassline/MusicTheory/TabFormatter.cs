using System.Text;
using BlazorWalkingBassline.Models;

namespace BlazorWalkingBassline.MusicTheory;

public static class TabFormatter
{
    private static readonly string[] StringNames = { "G", "D", "A", "E" }; // top to bottom visually
    private const int BeatsPerMeasure = 4; // Based on your quarter-note only rule

    public static List<TabColumn> RenderAscii(List<TabNote> tabNotes, int SlotWidth)
    {
        var columns = new List<TabColumn>();

        // 1. Add the static Header column (GDAE)
        columns.Add(new TabColumn
        {
            StringLines = new List<string>(StringNames),
            Type = ColumnType.HeaderLine,
            Measure = 0,
            Beat = 0.0,
            Duration = 0.0
        });

        // Group notes by Measure and Beat for easy lookup
        var noteLookup = tabNotes.ToLookup(n => (n.Measure, n.Beat));

        // Start from the first measure and beat
        int currentMeasure = tabNotes.Any() ? tabNotes.Min(n => n.Measure) : 1;
        
        // Loop for a set number of measures (e.g., 4 measures for a simple progression)
        // In a real app, this would loop until the end of the last note's measure.
        for (; currentMeasure <= 4; currentMeasure++) 
        {
            for (double beat = 1.0; beat <= BeatsPerMeasure; beat++)
            {
                // 2. Create Content Column for the current beat
                var currentColumn = new TabColumn
                {
                    StringLines = new List<string>(),
                    Measure = currentMeasure,
                    Beat = beat,
                    Duration = 1.0, // Assuming quarter notes (duration of 1 beat)
                    Type = ColumnType.Content
                };

                // Create the content for each of the four strings
                for (int stringIndex = 0; stringIndex < StringNames.Length; stringIndex++)
                {
                    int stringNumber = stringIndex; // Our internal string index is 0 to 3 (G to E)
                    
                    // Look up the TabNote for this specific measure, beat, and string.
                    var noteAtPosition = noteLookup[(currentMeasure, beat)]
                        .FirstOrDefault(n => n.StringNumber == stringNumber);

                    string fretData;
                    if (noteAtPosition != null)
                    {
                        // Note found: Format the fret number
                        fretData = noteAtPosition.Fret.ToString();
                    }
                    else
                    {
                        // No note: Use an empty string, which the formatter will turn into dashes
                        fretData = string.Empty;
                    }

                    // Format and add the string line to the column
                    currentColumn.StringLines.Add(
                        FormatStringInSlot(fretData, SlotWidth, '-')
                    );
                }

                columns.Add(currentColumn);

                // 3. Insert Bar Line after the last beat of the measure
                if (beat == BeatsPerMeasure)
                {
                    columns.Add(new TabColumn
                    {
                        StringLines = new List<string> { "|", "|", "|", "|" },
                        Measure = currentMeasure + 1, // Time point is the start of the next measure
                        Beat = 1.0,
                        Duration = 0.0,
                        Type = ColumnType.BarLine
                    });
                }
            }
        }
        
        return columns;
    }

    /// <summary>
    /// Format a fret number (as string data) inside a slot with left/right padding.
    /// Example: "12" in a width 4 slot -> "-12-". "" in a width 4 slot -> "----".
    /// </summary>
    /// <returns>The padded string.</returns>
    private static string FormatStringInSlot(string data, int slotWidth, char slotChar='-')
    {
        if (string.IsNullOrEmpty(data))
        {
            // If no data (no note), return a full slot of dashes.
            return new string(slotChar, slotWidth);
        }

        int dataLength = data.Length;
        int remainingWidth = slotWidth - dataLength;

        // If data is too long for the slot, just return the data (shouldn't happen with 4 slots and up to 24 frets).
        if (remainingWidth < 0) return data; 

        // Calculate left and right padding for center alignment.
        // Left padding is always Math.Floor(remainingWidth / 2.0)
        // Right padding is the rest.
        int leftPadding = remainingWidth / 2; // Integer division acts as Math.Floor
        int rightPadding = remainingWidth - leftPadding;

        var sb = new StringBuilder();
        
        // 1. Append left padding
        sb.Append(slotChar, leftPadding);
        
        // 2. Append the data (fret number)
        sb.Append(data);
        
        // 3. Append right padding
        sb.Append(slotChar, rightPadding);

        return sb.ToString();
    }
}