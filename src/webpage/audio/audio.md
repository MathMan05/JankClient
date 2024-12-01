# Jank Audio format
This is a markdown file that will try to describe the jank client audio format in sufficient detail so people will know how this weird custom format works into the future.
This is a byte-aligned format, which uses the sequence jasf in asci as a magic number at the start.

the next 8 bits will decide how many voices this file has/will provide, if the value is 255 you'll instead have a 16 bit number that follows for how many voices there are, this *should* be unused, but I wouldn't be totally surprised if it did get used.

then it'll parse for that many voices, which will be formatted like the following:
name:String8;
length:f32; **if this is 0, this is not an custom sound and is instead refering to something else which will be explained later™**

Given a non-zero length, this will parse the sounds as following:
|instruction | description |
| ---------- | ----------- |
| 000 | read float32 and use as value |
| 001 | read time(it'll be the time in seconds) |
| 002 | read frequency in hz |
| 003 | the constant PI |
| 004 | Math.sin() on the following sequence |
| 005 | multiplies the next two expressions |
| 006 | adds the next two expressions |
| 007 | divides the first expression by the second |
| 008 | subtracts the second expression by the first |
| 009 | first expression to the power of the second |
| 010 | first expression to the modulo of the second |
| 011 | absolute power of the next expression |
| 012 | round the next expression |
| 013 | Math.cos() on the next expression |
> note
> this is likely to expand in the future as more things are needed, but this is just how it is right now.

Once you've read all of the sounds in the file, you can move on to parsing the tracks.
This starts out by reading a u16 to find out how many tracks there are, then you'll go on to try and parse that many.

each track will then read a u16 to find out how long it is, then it'll read bytes as the following.
it'll first read the index(which is either a u8 or u16 depending on if the amount of voices was u8 or u16), which is the index of the voice 1-indexed, then if it's not 0 it'll parse two float32s in this order, the volume then the pitch of the sound, if it was 0 it'll instead read one 32f as a delay in the track. if it's a default sound it'll also read a third 32f for length

then finally you'll parse the audios which are the complete tracks. you'll first parse a u16 to get how many audios there are, then for each audio you'll first parse a string8 for the name, then a u16 for the length then according to the length you'll go on to parse a u16 to get the track (1-indexed again) where if it's 0 you'll instead add a delay according to the next f32, how many ever times according to the length.
