"""Draw the original product illustrations and account banner using Pillow."""
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter

OUTPUT = Path(__file__).resolve().parents[1] / "public" / "images"
OUTPUT.mkdir(parents=True, exist_ok=True)

PALETTES = [
    ((230, 207, 183), (177, 108, 75), (104, 62, 57)),
    ((224, 218, 190), (104, 127, 97), (54, 81, 67)),
    ((222, 200, 196), (122, 102, 134), (75, 58, 89)),
]

def canvas(width, height, base, seed):
    rng = Random(seed)
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            light = 11 - (x / width + y / height) * 12 + rng.randint(-4, 4)
            pixels[x, y] = tuple(max(0, min(255, round(value + light))) for value in base)
    return image

def shade(image, bounds):
    shadow = Image.new("RGBA", image.size)
    ImageDraw.Draw(shadow).ellipse(bounds, fill=(39, 22, 33, 85))
    image.paste(shadow, mask=shadow.filter(ImageFilter.GaussianBlur(13)).getchannel("A"))

def botanicals(draw, x, y, scale, ink, blossom):
    for index in range(4):
        tip = (x + (index - 1.5) * 28 * scale, y - (107 + index % 2 * 16) * scale)
        draw.line([(x, y), tip], fill=ink, width=max(1, round(3 * scale)))
        for branch in range(1, 4):
            ratio = branch / 5
            lx = x + (tip[0] - x) * ratio
            ly = y + (tip[1] - y) * ratio
            sx = (-1 if (branch + index) % 2 else 1) * 22 * scale
            draw.ellipse((min(lx, lx + sx), ly - 12 * scale, max(lx, lx + sx), ly + 1), fill=ink)
        tx, ty = tip
        for dx, dy in [(-6, -5), (4, -6), (2, 4)]:
            px, py = tx + dx * scale, ty + dy * scale
            draw.ellipse((px - 5 * scale, py - 5 * scale, px + 5 * scale, py + 5 * scale), fill=blossom)

def product(kind, variant, index):
    base, ink, dark = PALETTES[(variant + (index % 3)) % 3]
    image = canvas(480, 360, base, 14 + index + variant * 34)
    shade(image, (95, 274, 414, 323))
    d = ImageDraw.Draw(image)
    cream = (250, 234, 210)
    gold = (180, 116, 49)
    if kind == "ceramic":
        if variant == 1:
            d.ellipse((93, 135, 388, 285), fill=dark)
            d.ellipse((87, 105, 395, 225), fill=ink, outline=cream, width=4)
            d.ellipse((110, 126, 374, 205), fill=dark)
            d.arc((119, 136, 361, 199), 0, 152, fill=ink, width=7)
        elif variant == 2:
            botanicals(d, 235, 173, .93, dark, gold)
            d.ellipse((143, 155, 333, 293), fill=ink, outline=dark, width=3)
            d.rounded_rectangle((203, 127, 271, 194), 21, fill=ink)
            d.ellipse((203, 130, 271, 152), fill=dark, outline=cream, width=3)
            for offset in range(0, 120, 20):
                d.arc((153 + offset, 167, 220 + offset, 282), 264, 91, fill=dark, width=2)
        else:
            d.ellipse((283, 146, 381, 242), outline=dark, width=23)
            d.ellipse((283, 144, 378, 238), outline=ink, width=17)
            d.rounded_rectangle((112, 120, 320, 289), 42, fill=ink, outline=dark, width=3)
            d.ellipse((112, 101, 320, 164), fill=cream, outline=dark, width=3)
            d.ellipse((128, 111, 304, 154), fill=dark)
            d.arc((126, 114, 306, 154), 10, 150, fill=ink, width=5)
            rng = Random(index)
            for _ in range(150):
                x, y = rng.randint(128, 301), rng.randint(169, 265)
                d.point((x, y), fill=cream if rng.randrange(4) == 0 else dark)
    elif kind in ("paper", "print"):
        d.rounded_rectangle((123, 50, 372, 310), 6, fill=dark)
        d.rounded_rectangle((109, 39, 359, 300), 5, fill=cream)
        if kind == "paper":
            d.polygon([(85, 207), (164, 152), (286, 216), (217, 280)], fill=ink)
            d.polygon([(84, 207), (183, 215), (217, 280)], fill=dark)
            botanicals(d, 257, 195, .83, dark, ink)
            for offset in range(0, 24, 8):
                d.line((222, 225 + offset, 295, 225 + offset), fill=ink, width=2)
        else:
            d.rectangle((128, 58, 341, 278), fill=ink)
            d.ellipse((213, 80, 272, 139), fill=cream)
            d.polygon([(129, 235), (181, 165), (223, 205), (273, 153), (341, 236), (341, 278), (128, 278)], fill=dark)
            if variant == 0:
                botanicals(d, 233, 269, .77, cream, gold)
            else:
                d.polygon([(129, 239), (217, 225), (341, 248), (341, 278), (128, 278)], fill=base)
    elif kind == "jewel":
        d.ellipse((87, 42, 391, 318), fill=cream, outline=ink, width=4)
        if variant == 0:
            for x, y in [(146, 120), (230, 111)]:
                d.ellipse((x, y, x + 89, y + 122), outline=dark, width=12)
                d.arc((x, y, x + 89, y + 122), -95, 255, fill=gold, width=8)
                d.arc((x + 2, y + 2, x + 87, y + 120), 25, 140, fill=(237, 185, 98), width=3)
        else:
            d.arc((143, 50, 335, 229), 0, 180, fill=gold, width=5)
            d.ellipse((227, 207, 252, 236), outline=gold, width=4)
            d.ellipse((213, 226, 266, 281), fill=gold)
            d.ellipse((219, 231, 260, 275), fill=ink, outline=cream, width=3)
            d.arc((226, 236, 254, 269), 177, 267, fill=cream, width=3)
    elif kind == "textile":
        d.polygon([(91, 138), (270, 79), (404, 185), (240, 278)], fill=ink)
        d.polygon([(91, 138), (240, 251), (404, 185), (404, 207), (237, 297), (91, 164)], fill=dark)
        for offset in range(0, 135, 13):
            line_width = 5 if offset % 2 == 0 else 2
            d.line((104 + offset, 133 - offset * .33, 251 + offset, 246 - offset * .40), fill=cream, width=line_width)
        for offset in range(0, 160, 9):
            d.line((240 + offset, 293 - offset * .55, 243 + offset, 305 - offset * .55), fill=ink, width=2)
    elif kind == "wood":
        d.rounded_rectangle((104, 93, 376, 272), 48, fill=dark)
        d.rounded_rectangle((96, 78, 371, 250), 45, fill=ink, outline=cream, width=3)
        d.rounded_rectangle((118, 101, 348, 229), 35, fill=dark, outline=cream, width=2)
        for offset in range(0, 75, 10):
            d.arc((120, 104 + offset, 342, 144 + offset), 10, 168, fill=ink, width=2)
        d.ellipse((206, 126, 275, 194), outline=gold, width=7)
        d.ellipse((239, 155, 302, 207), outline=gold, width=6)
    else:
        d.rounded_rectangle((161, 86, 319, 272), 26, outline=ink, width=4)
        botanicals(d, 240, 238, .85, dark, ink)
    return image

for index, kind in enumerate(("ceramic", "paper", "print", "jewel", "textile", "wood")):
    for variant in range(3):
        product(kind, variant, index).save(OUTPUT / f"{kind}-{variant}.png", optimize=True)

product("fallback", 0, 0).save(OUTPUT / "fallback.png", optimize=True)
banner = canvas(600, 300, (61, 45, 64), 123)
draw = ImageDraw.Draw(banner)
for center_x, center_y, radius, tone in [
    (535, 40, 153, (91, 55, 68)), (543, 90, 123, (119, 68, 77)), (521, 167, 84, (146, 83, 82))
]:
    draw.ellipse((center_x - radius, center_y - radius, center_x + radius, center_y + radius), outline=tone, width=2)
draw.ellipse((310, 209, 591, 281), fill=(49, 35, 53))
draw.polygon([(392, 126), (520, 111), (561, 214), (426, 231)], fill=(106, 71, 94), outline=(168, 111, 114), width=2)
draw.polygon([(401, 139), (541, 137), (553, 221), (417, 226)], fill=(194, 133, 114))
draw.polygon([(401, 139), (475, 180), (541, 137)], fill=(220, 162, 136), outline=(155, 94, 93), width=2)
botanicals(draw, 457, 171, 1.03, (224, 165, 144), (243, 193, 162))
banner.save(OUTPUT / "account.png", optimize=True)

