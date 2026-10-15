# One-off: Open Graph images (1200x630) in the site's dark style. Needs Pillow.
# python3 scripts/make-og.py
from PIL import Image, ImageDraw, ImageFont
import os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'og')
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 630
BG, LINE, FG, MUTED, ACCENT = '#0C0E11', '#1A1F26', '#E7EAEE', '#9AA3AD', '#F2C14E'

def font(size, bold=True):
    for c in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',
              '/Library/Fonts/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

def base():
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 32):
        d.line([(x, 0), (x, H)], fill=LINE, width=1)
    for y in range(0, H, 32):
        d.line([(0, y), (W, y)], fill=LINE, width=1)
    return im, d

def mark(d, x, y, s=56):
    d.rounded_rectangle([x, y, x + s, y + s], radius=s * 0.21, fill=ACCENT)
    for cx, cy, r in [(0.36, 0.39, 0.115), (0.66, 0.34, 0.08), (0.61, 0.64, 0.13), (0.32, 0.70, 0.065)]:
        d.ellipse([x + (cx - r) * s, y + (cy - r) * s, x + (cx + r) * s, y + (cy + r) * s], fill=BG)

def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

# Studio
im, d = base()
mark(d, 80, 80)
d.text((152, 84), 'DappleByte', font=font(40), fill=FG)
y = 230
for line in wrap(d, 'Small, useful apps, made with care.', font(84), 1040):
    d.text((80, y), line, font=font(84), fill=FG); y += 96
d.text((80, y + 24), 'An independent studio building Android apps.', font=font(34, False), fill=MUTED)
d.text((80, 560), 'DAPPLEBYTE.COM', font=font(22), fill=ACCENT)
im.save(os.path.join(OUT, 'dapplebyte.png'), optimize=True)

# Products: icon + name + tagline + the product's accent for the address line
products = {
    'relaypad': ('Relaypad', 'Remote Play controller and console streaming for PS5 and PS4 on Android.', os.path.join(ROOT, 'public/relaypad/icon.png'), '#FF9426'),
    'gamepad-pro': ('Gamepad Pro', 'Map controller keys to touch. Sticks, triggers, macros, turbo. No root.', os.path.join(ROOT, 'public/gamepad-pro/icon.png'), '#E4345A'),
    'whendo': ('WhenDo', 'AI automation, auto clicker and macro maker for Android. No root needed.', os.path.join(ROOT, 'public/whendo/icon.png'), '#FF8A7D'),
    'joylink': ('JoyLink', 'Your phone as a Bluetooth gamepad, touchpad and TV remote. Nothing to install on the other side.', os.path.join(ROOT, 'public/joylink/icon.png'), '#E6FF66'),
    'apk-extractor': ('Apk Extractor', 'Extract, back up, install and move Android apps as APK and XAPK files. No root.', os.path.join(ROOT, 'public/apk-extractor/icon.png'), '#5BE89A'),
    'gamepad-tester': ('Gamepad Tester Pro', 'Test any controller on your phone: buttons, stick drift, input lag, vibration. No PC needed.', os.path.join(ROOT, 'public/gamepad-tester/icon.png'), '#3DDFA8'),
}
for slug, (name, tagline, icon, accent) in products.items():
    im, d = base()
    mark(d, 80, 80, 44)
    d.text((140, 82), 'DappleByte', font=font(32), fill=MUTED)
    if os.path.exists(icon):
        ic = Image.open(icon).convert('RGBA').resize((120, 120))
        m = Image.new('L', (120, 120), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, 120, 120], radius=28, fill=255)
        im.paste(ic, (80, 200), m)
    # Long names ("GAMEPAD TESTER PRO") step down until they fit beside the icon.
    size = 92
    while size > 48 and d.textlength(name.upper(), font=font(size)) > W - 224 - 80:
        size -= 4
    d.text((224, 206 + (92 - size) // 2), name.upper(), font=font(size), fill=FG)
    y = 350
    for line in wrap(d, tagline, font(40, False), 1040):
        d.text((80, y), line, font=font(40, False), fill=MUTED); y += 52
    d.text((80, 560), f'DAPPLEBYTE.COM/{slug.upper()}', font=font(22), fill=accent)
    im.save(os.path.join(OUT, f'{slug}.png'), optimize=True)
print('ok', os.listdir(OUT))
