namespace BlazorWalkingBassline.Models;

public class Chord
{

    public ScaleDegree Degree { get; } // I, IV, V
    public ChordQuality? Quality { get; } // Major, Minor


    // constructor
    public Chord(ScaleDegree degree, ChordQuality? quality = null)
    {
        Degree = degree;
        Quality = quality;
    }

    public override string ToString()
    {
        return $"{ScaleDegreeToString()}{GetQualitySuffix()}";
    }

    private string ScaleDegreeToString() => Degree switch
    {
        ScaleDegree.One => "1",
        ScaleDegree.FlatTwo => "flat2",
        ScaleDegree.Two => "2",
        ScaleDegree.FlatThree => "flat3",
        ScaleDegree.Three => "3",
        ScaleDegree.Four => "4",
        ScaleDegree.FlatFive => "flat5",
        ScaleDegree.Five => "5",
        ScaleDegree.SharpFive => "sharp5",
        ScaleDegree.Six => "6",
        ScaleDegree.FlatSeven => "flat7",
        ScaleDegree.Seven => "7",
        _ => "1"

    };
    private string GetQualitySuffix() => Quality switch
    {
        ChordQuality.Major => "",
        ChordQuality.Minor => "m",
        ChordQuality.Dominant7 => "7",
        ChordQuality.Minor7 => "m7",
        ChordQuality.Major7 => "maj7",
        ChordQuality.Diminished => "dim",
        ChordQuality.Augmented => "aug",
        _ => "" // fallback if no value exists
    };

}