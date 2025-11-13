namespace BlazorWalkingBassline.Models;

// interface so we don't have to import music theory namespace (this would be circular)
public interface IProgressionGenerator
{
    List<Note> GenerateNotes(List<Chord> chords, string key);
    public string NoteFromMidi(int midi);
}

public class Progression
{
    public string Key { get; set; }
    public List<Chord> Chords { get; set; }



    private readonly IProgressionGenerator Generator;
    
    public List<Note> Notes { get; set; } = new List<Note>();

    // constructor
    public Progression(string _key, List<Chord> _chords, IProgressionGenerator _generator)
    {
        Key = _key;
        Chords = _chords;
        Generator = _generator;
        

        RunGenerator();
    }

    // public wrapper for generator
    public void RunGenerator()
    {
        Notes = Generator.GenerateNotes(Chords, Key);
    }


}