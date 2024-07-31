This is for in the future when I want to compress more images or anyone else for that matter.
# Lossless

### https://squoosh.app/
good at reducing the pallet, a first step for images that have a limited number of colors, bad at actually compressing things though, for all formats except webp.

## PNGs:
good ratios, though not as good as other options, though better compatibility
### pngcrush
Good, but should be ran before optipng, but isn't as good as it, use in tandom
### optipng
The best tool to really shrink pngs to be as small as they can be.

## WEBP
it's better than png, though I have a feeling more could be done to compress these
### cwebp
so far this seems to be the best way to compress webp images with a command that kinda looks like this one
```bash
cwebp -lossless -z 9 in.webp -o out.webp
```
while for all other formats squoosh is not recommended, for webp it'll be identical due to cwebp using the same libary as squoosh.

## AVIF
As far as I can tell, this format just sucks at its job, at least for lossless images

## JPEGXL
Really good at compression size, though it's not supported anywhere outside of safari as of now.
### cjxl
this command should do the trick for compressing
```bash
cjxl input.png output.jxl -q 100 -e 10
```

# Vector

## SVGs:
### https://svgomg.net/
great tool, if anyone knows how to squish them further, let me know, some manual work may go a long way to help shrink svgs, though I'm not doing that right now lol.

I may look into other formats soon as well, though these are the main two I'm currently using
