namespace BlazorWalkingBassline.Models;

public class TabColumn
{
    // The rendered ASCII characters for each string line (e.g., ["-2--", "--3-", "-2--", "----"])
    public List<string> StringLines { get; set; }

    // The original time data (from the Note/TabNote) associated with this column
    public int Measure { get; set; }
    public double Beat { get; set; }
    public double Duration { get; set; }

    public ColumnType Type { get; set; }

}

public enum ColumnType
{
    Content, // Contains fret/dash data
    BarLine, // Contains '|' characters
    HeaderLine  // Contains string names
}