# Dibuja el león del icono (vectorial propio, con degradados para dar volumen) y genera:
# icono de Play 512, mipmaps de Android (launcher, round, foreground, background) y pantallas de splash.
# Uso: python make_icon.py   (desde game/store)
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RES = '../android/app/src/main/res/'
FONT = 'C:/Windows/Fonts/ariblk.ttf'
S = 2048  # lienzo de trabajo; el león ocupa ~80 %
C = S // 2


def lerp(a, b, t):
    return a + (b - a) * t


def blob(layer, mask, light, dark, cx, cy, r, fx=-0.35, fy=-0.4):
    """Pinta `mask` con degradado radial: luz en (fx, fy) relativo al radio r, sombra en el borde opuesto."""
    ys, xs = np.mgrid[0:S, 0:S].astype(np.float32)
    d = np.hypot(xs - (cx + fx * r), ys - (cy + fy * r)) / (r * 1.5)
    t = np.clip(d, 0, 1)[..., None]
    rgb = lerp(np.array(light, np.float32), np.array(dark, np.float32), t)
    m = np.asarray(mask, np.float32)[..., None] / 255
    a = layer[..., 3:4]
    out_a = m + a * (1 - m)
    layer[..., :3] = np.where(out_a > 0, (rgb * m + layer[..., :3] * a * (1 - m)) / np.maximum(out_a, 1e-6), 0)
    layer[..., 3:4] = out_a


def ell(cx, cy, rx, ry, angle=0):
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    if angle == 0:
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    else:
        tmp = Image.new('L', (S, S), 0)
        ImageDraw.Draw(tmp).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
        m = tmp.rotate(angle, center=(cx, cy), resample=Image.BICUBIC)
    return m


def poly(points):
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return m.filter(ImageFilter.GaussianBlur(6))


def stroke(layer, pts, width, rgb):
    m = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(m)
    d.line(pts, fill=255, width=width, joint='curve')
    for x, y in (pts[0], pts[-1]):
        d.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(2))
    blob(layer, m, rgb, rgb, C, C, 1)


OUT = (120, 60, 24)  # contorno marrón


def oell(L, cx, cy, rx, ry, light, dark, ow=16, angle=0, r=None):
    """Elipse con contorno grueso y degradado suave."""
    blob(L, ell(cx, cy, rx + ow, ry + ow, angle), OUT, OUT, cx, cy, 1)
    blob(L, ell(cx, cy, rx, ry, angle), light, dark, cx, cy, r or max(rx, ry))


def lion():
    """Cachorro de león sentado, estilo dibujo animado (contorno + colores planos con volumen suave)."""
    L = np.zeros((S, S, 4), np.float32)
    ORG, ORG_D = (255, 190, 80), (240, 150, 50)
    CREAM, CREAM_D = (255, 246, 222), (246, 220, 170)

    PAW, PAW_D = (255, 210, 130), (246, 178, 86)

    # hierba bajo el león
    oell(L, C, 1950, 640, 110, (140, 214, 90), (84, 168, 64), ow=0)

    # cola: sale de detrás de la cadera izquierda y sube con borla marrón
    tail = [(C - 350 - 300 * math.sin(u * math.pi / 2), 1860 - 360 * u * u) for u in [i / 16 for i in range(17)]]
    stroke(L, tail, 92, OUT)
    stroke(L, tail, 60, ORG)
    tx, ty = tail[-1]
    oell(L, tx, ty - 70, 92, 118, (176, 96, 42), (124, 62, 26), ow=14, angle=-15)
    oell(L, tx + 25, ty - 175, 34, 44, (176, 96, 42), (124, 62, 26), ow=14, angle=-35)

    # silueta del cuerpo (tronco + caderas + patas traseras) con un único contorno
    body = poly([(C - 215, 1300), (C + 215, 1300), (C + 300, 1945), (C - 300, 1945)])
    for sx in (-1, 1):
        ImageDraw.Draw(body).ellipse((C + sx * 290 - 175, 1620, C + sx * 290 + 175, 1960), fill=255)
    body = body.filter(ImageFilter.GaussianBlur(10)).point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.GaussianBlur(2))
    blob(L, body.filter(ImageFilter.MaxFilter(31)), OUT, OUT, C, C, 1)
    blob(L, body, ORG, ORG_D, C, 1560, 420, fx=-0.2, fy=-0.6)

    # pecho blanco que baja entre las patas delanteras
    blob(L, poly([(C - 105, 1380), (C + 105, 1380), (C + 80, 1800), (C - 80, 1800)]).filter(ImageFilter.GaussianBlur(8)),
         (255, 252, 240), (250, 232, 196), C, 1500, 300)

    # caderas: arco interior que separa cada muslo de la pata delantera
    for sx in (-1, 1):
        arc = [(C + sx * (290 + 175 * math.cos(math.radians(d))), 1790 + 170 * math.sin(math.radians(d)))
               for d in range(-95, -205, -5)]
        stroke(L, arc, 16, OUT)
    stroke(L, [(C, 1800), (C, 1890)], 16, OUT)

    # patas traseras (asoman hacia fuera) y delanteras, con deditos
    for sx in (-1, 1):
        oell(L, C + sx * 425, 1918, 112, 62, PAW, PAW_D, ow=14)
        for k in (0, 1):
            stroke(L, [(C + sx * (450 + k * 40), 1895), (C + sx * (450 + k * 40), 1935)], 10, OUT)
    for sx in (-1, 1):
        px = C + sx * 118
        oell(L, px, 1915, 106, 70, PAW, PAW_D, ow=14)
        for k in (-1, 1):
            stroke(L, [(px + k * 34, 1885), (px + k * 34, 1935)], 10, OUT)

    # melena trasera: lóbulos con contorno
    n = 13
    for i in range(n):
        a = 2 * math.pi * i / n - math.pi / 2
        x, y = C + 500 * math.cos(a), 900 + 470 * math.sin(a)
        oell(L, x, y, 150, 150, (232, 128, 40), (190, 94, 26), ow=14)
    oell(L, C, 900, 500, 450, (232, 128, 40), (190, 94, 26), ow=0)

    # orejas
    for sx in (-1, 1):
        ex, ey = C + sx * 400, 560
        oell(L, ex, ey, 150, 150, ORG, ORG_D)
        oell(L, ex, ey + 10, 84, 84, (255, 176, 168), (226, 122, 124), ow=0)

    # cabeza ancha
    oell(L, C, 900, 470, 400, (255, 200, 92), (244, 158, 54), r=520)

    # mechón de la frente
    for dx, a in ((-60, 22), (0, 0), (60, -22)):
        blob(L, ell(C + dx, 520, 26, 74, a), (196, 104, 34), (170, 84, 28), C, 520, 60)

    # mejillas
    for sx in (-1, 1):
        cx = C + sx * 318
        blob(L, ell(cx, 1000, 88, 56), (255, 140, 60), (255, 128, 50), cx, 1000, 90)

    # hocico crema
    oell(L, C, 1040, 250, 175, CREAM, CREAM_D, ow=14)

    # ojos grandes y brillantes
    for sx in (-1, 1):
        ex, ey = C + sx * 205, 850
        oell(L, ex, ey, 84, 104, (96, 52, 36), (30, 16, 12), ow=12)
        blob(L, ell(ex - 24, ey - 34, 34, 34), (255, 255, 255), (255, 255, 255), ex, ey, 30)
        blob(L, ell(ex + 26, ey + 40, 15, 15), (255, 255, 255), (255, 255, 255), ex, ey, 15)
        stroke(L, [(ex - 70, ey - 150), (ex, ey - 172), (ex + 70, ey - 150)], 18, (170, 84, 28))

    # nariz, boca sonriente
    nose = poly([(C - 78, 960), (C + 78, 960), (C + 34, 1032), (C - 34, 1032)])
    blob(L, ell(C, 968, 82, 56), (150, 74, 64), (92, 42, 36), C, 968, 80)
    blob(L, ell(C - 24, 954, 22, 10, 10), (255, 255, 255), (255, 255, 255), C, 954, 20)
    stroke(L, [(C, 1020), (C, 1078)], 14, OUT)
    for sx in (-1, 1):
        stroke(L, [(C + sx * t, 1078 + 40 * math.sin(math.pi * t / 150)) for t in range(0, 141, 10)], 14, OUT)
    return L


def to_img(arr):
    a = np.clip(arr, 0, None)
    out = np.dstack([np.clip(a[..., :3], 0, 255), np.clip(a[..., 3], 0, 1) * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def bg_gradient(size, dark_edges=True):
    ys, xs = np.mgrid[0:size, 0:size].astype(np.float32)
    d = np.clip(np.hypot(xs - size * 0.42, ys - size * 0.34) / (size * 0.95), 0, 1)[..., None]
    rgb = lerp(np.array((150, 224, 246), np.float32), np.array((64, 156, 214), np.float32), d)
    return Image.fromarray(rgb.astype(np.uint8), 'RGB').convert('RGBA')


def place(canvas, lion_img, scale_w):
    """Pega el león recortado con ancho `scale_w` (fracción del lienzo) centrado."""
    box = lion_img.getbbox()
    li = lion_img.crop(box)
    k = canvas.width * scale_w / max(li.width, li.height)
    li = li.resize((int(li.width * k), int(li.height * k)), Image.LANCZOS)
    canvas.alpha_composite(li, ((canvas.width - li.width) // 2, (canvas.height - li.height) // 2))
    return canvas


def circle_mask(size):
    m = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def main():
    lion_img = to_img(lion())
    lion_img.save('out/leon-icono-master.png')

    # Play 512 (cuadrado, Play redondea él solo)
    play = place(bg_gradient(512), lion_img, 0.86)
    os.makedirs('play', exist_ok=True)
    play.save('play/icono-512.png')

    # Android: fondo y primer plano adaptativos (108 dp; zona segura central 66 dp → león a ~60 %)
    dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
    for name, k in dens.items():
        fg_size, ic_size = int(108 * k), int(48 * k)
        d = RES + f'mipmap-{name}/'
        fg = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        place(fg, lion_img, 0.62).save(d + 'ic_launcher_foreground.png')
        bg_gradient(fg_size).save(d + 'ic_launcher_background.png')
        legacy = place(bg_gradient(ic_size), lion_img, 0.84)
        legacy.save(d + 'ic_launcher.png')
        rnd = place(bg_gradient(ic_size), lion_img, 0.74)
        rnd.putalpha(circle_mask(ic_size))
        rnd.save(d + 'ic_launcher_round.png')

    # Splash: fondo verde oscuro del juego + león + título
    def splash(w, h, path):
        im = Image.new('RGBA', (w, h), (29, 43, 31, 255))
        side = int(min(w, h) * 0.56)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        place(canvas, lion_img, 0.96)
        im.alpha_composite(canvas, ((w - side) // 2, int(h * 0.5 - side * 0.66)))
        d = ImageDraw.Draw(im)
        f = ImageFont.truetype(FONT, int(min(w, h) * 0.1))
        d.text((w / 2, h * 0.5 + side * 0.6), 'Zoo Esponji', font=f, fill=(255, 213, 74), anchor='mm',
               stroke_width=max(2, int(min(w, h) * 0.012)), stroke_fill=(59, 42, 16))
        im.convert('RGB').save(path)

    for dirname in os.listdir(RES):
        p = RES + dirname + '/splash.png'
        if dirname.startswith('drawable') and os.path.exists(p):
            w, h = Image.open(p).size
            splash(w, h, p)
    print('ok')


if __name__ == '__main__':
    main()
