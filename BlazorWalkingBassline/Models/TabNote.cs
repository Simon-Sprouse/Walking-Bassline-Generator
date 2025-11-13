namespace BlazorWalkingBassline.Models;

public class TabNote
{
    public int StringNumber { get; set; }
    public int Fret { get; set; }
    public int Measure { get; set; }
    public double Beat { get; set; }

    // constructor
    public TabNote(int _stringNumber, int _fret, int _measure, double _beat)
    {
        StringNumber = _stringNumber;
        Fret = _fret;
        Measure = _measure;
        Beat = _beat;
    }


    public override string ToString()
    {
        return $"String {StringNumber}, Fret {Fret}, Measure {Measure}, Beat {Beat}";
    }


}