using System.Numerics;

namespace BlazorWalkingBassline.Models;

public class TabNote
{
    public int StringNumber { get; set; }
    public int Fret { get; set; }
    public int Beat { get; set; }

    // constructor
    public TabNote(int stringNumber, int fret, int beat)
    {
        StringNumber = stringNumber;
        Fret = fret;
        Beat = beat;
    }


    public override string ToString()
    {
        return $"String {StringNumber}, Fret {Fret}, Beat {Beat}";
    }

    



}