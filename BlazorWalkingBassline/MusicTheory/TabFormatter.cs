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
        
        // Total number of strings, assuming 4 strings
        const int TotalStrings = 4; 

        // 1. Add the static Header column (EADG order for tab display)
        // We reverse the StringNames list here to display them top-to-bottom as E, A, D, G
        columns.Add(new TabColumn
        {
            // Iterate backward to get E, A, D, G order (assuming StringNames = G, D, A, E)
            StringLines = StringNames.Reverse().ToList(), 
            Type = ColumnType.HeaderLine,
            Measure = 0,
            Beat = 0.0,
            Duration = 0.0
        });

        // Group notes by Measure and Beat for easy lookup
        var noteLookup = tabNotes.ToLookup(n => (n.Measure, n.Beat));

        // Determine the loop end measure (or keep 4 as a sensible default)
        int maxMeasure = tabNotes.Any() ? Math.Max(4, tabNotes.Max(n => n.Measure)) : 4;
        int currentMeasure = tabNotes.Any() ? tabNotes.Min(n => n.Measure) : 1;
        
        // Loop for the measures in the progression
        for (; currentMeasure <= maxMeasure; currentMeasure++) 
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

                // *** CRITICAL FIX: Iterate Backward (from E string to G string) ***
                // This ensures StringLines are added in the correct E-A-D-G visual order.
                for (int stringIndex = TotalStrings - 1; stringIndex >= 0; stringIndex--) 
                {
                    int stringNumber = stringIndex; // Our internal string index is 0(G) to 3(E)
                    
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
                // *** End of Fix ***

                columns.Add(currentColumn);

                // 3. Insert Bar Line after the last beat of the measure
                if (beat == BeatsPerMeasure)
                {
                    // The bar lines also need to be in the correct E-A-D-G order
                    // By iterating backward above, currentColumn.StringLines is now E-A-D-G.
                    // We generate the bar line string list by reversing the standard G|D|A|E| array.
                    columns.Add(new TabColumn
                    {
                        StringLines = new List<string> { "|", "|", "|", "|" }, // E, A, D, G
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