namespace BlazorWalkingBassline.Models;

public class Progression
{
    public string Key { get; set; }
    public List<Chord> Chords { get; set; }

    // constructor
    public Progression(string key, List<Chord> chords)
    {
        Key = key;
        Chords = chords;
    }


}