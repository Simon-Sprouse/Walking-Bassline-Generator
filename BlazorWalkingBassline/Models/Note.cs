namespace BlazorWalkingBassline.Models;

public class Note
{

    public int MidiNumber { get; }
    public int Measure { get; }
    public double Beat { get; }
    public double Duration { get; }


    // constructor
    public Note(int _midiNumber, int _measure, double _beat, double _duration)
    {
        MidiNumber = _midiNumber;
        Measure = _measure;
        Beat = _beat;
        Duration = _duration;
    }

    public override string ToString()
    {
        return $"Midi({MidiNumber})";
    }

  

}