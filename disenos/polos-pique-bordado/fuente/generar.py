#!/usr/bin/env python3
"""Genera los textos de marca para bordar (SVG en mm, letras convertidas a trazos).
El gorila NO se dibuja aqui: se usa siempre el logo original public/logo-marca.webp.
Uso: python3 generar.py   -> escribe ../bordado/*.svg
"""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, '..', 'bordado')

# Colores de hilo
CARBON = '#16110D'
AJI = '#E8590C'
CREMA = '#F7F2E7'

ANTON = TTFont(os.path.join(AQUI, 'anton.woff2'))
WORK = TTFont(os.path.join(AQUI, 'worksans.woff2'))


def _cap(font):
    return font['OS/2'].sCapHeight


def glyph_d(font, ch, sx, sy, tx, ty, rot=0.0, cx=0.0, cy=0.0):
    """Path del glifo: escala (sx), y hacia abajo, trasladado a (tx,ty) [linea base]."""
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord(ch)]
    pen = SVGPathPen(gs, ntos=lambda v: ('%.3f' % v).rstrip('0').rstrip('.'))
    c, s = math.cos(rot), math.sin(rot)
    # coordenadas del glifo (u) -> local (x=u*sx - cx, y=-v*sy) -> rotar -> trasladar
    a, b = sx * c, sx * s
    cc, d = sy * s, -sy * c
    e = tx + (-cx) * c - 0 * s
    f = ty + (-cx) * s
    tp = TransformPen(pen, (a, b, cc, d, e, f))
    gs[name].draw(tp)
    return pen.getCommands(), gs[name].width


def text_width(font, s, cap_mm, track_em=0.0):
    k = cap_mm / _cap(font)
    gs = font.getGlyphSet(); cmap = font.getBestCmap()
    w = 0
    for i, ch in enumerate(s):
        w += gs[cmap[ord(ch)]].width * k
        if i < len(s) - 1:
            w += track_em * cap_mm
    return w


def text(font, s, cap_mm, x, y, fill, anchor='middle', track_em=0.0):
    """Texto recto convertido a trazos. y = linea base."""
    k = cap_mm / _cap(font)
    w = text_width(font, s, cap_mm, track_em)
    if anchor == 'middle':
        x -= w / 2
    elif anchor == 'end':
        x -= w
    gs = font.getGlyphSet(); cmap = font.getBestCmap()
    out = []
    for ch in s:
        if ch != ' ':
            d, _ = glyph_d(font, ch, k, k, x, y)
            out.append(d)
        x += gs[cmap[ord(ch)]].width * k + track_em * cap_mm
    return f'<path fill="{fill}" d="{" ".join(out)}"/>', w


def arc_text(font, s, cap_mm, cx, cy, r, fill, track_em=0.0, top=True):
    """Texto en arco (arriba, se lee de izquierda a derecha). r = radio de la linea base."""
    k = cap_mm / _cap(font)
    gs = font.getGlyphSet(); cmap = font.getBestCmap()
    total = text_width(font, s, cap_mm, track_em)
    ang_total = total / r
    a = -math.pi / 2 - ang_total / 2  # empieza a la izquierda
    out = []
    for ch in s:
        gw = gs[cmap[ord(ch)]].width * k
        mid = a + (gw / 2) / r
        px, py = cx + r * math.cos(mid), cy + r * math.sin(mid)
        rot = mid + math.pi / 2
        if ch != ' ':
            d, _ = glyph_d(font, ch, k, k, px, py, rot=rot, cx=gw / 2)
            out.append(d)
        a += (gw + track_em * cap_mm) / r
    return f'<path fill="{fill}" d="{" ".join(out)}"/>'


def svg(w, h, body, titulo, nota, m=0.5):
    """m = margen de seguridad (mm) alrededor del diseño, para que no se corte nada."""
    body = f'<g transform="translate({m} {m})">\n{body}\n</g>'
    w, h = w + 2 * m, h + 2 * m
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.2f}mm" height="{h:.2f}mm" viewBox="0 0 {w:.3f} {h:.3f}">\n'
            f'<title>{titulo}</title>\n<desc>{nota} Unidades en mm (1 unidad = 1 mm). '
            f'Hilos: carbón {CARBON}, naranja ají {AJI}, crema {CREMA}.</desc>\n{body}\n</svg>\n')


def guardar(nombre, contenido):
    with open(os.path.join(SALIDA, nombre), 'w', encoding='utf-8') as f:
        f.write(contenido)
    print('ok', nombre)


POLO = {'carbon': CREMA, 'crema': CARBON}  # color del texto segun el polo


def textos():
    # Manga: JONAH BEAST FUEL en una linea, mayuscula de 6 mm ("FUEL" en naranja)
    cap = 6.0
    for polo, col in POLO.items():
        t1, w1 = text(ANTON, 'JONAH BEAST ', cap, 0, cap, col, anchor='start', track_em=0.12)
        t2, w2 = text(ANTON, 'FUEL', cap, w1 + 0.12 * cap, cap, AJI, anchor='start', track_em=0.12)
        guardar(f'manga-jonah-beast-fuel-polo-{polo}.svg', svg(w1 + 0.12 * cap + w2, cap, t1 + t2,
                'Manga · JONAH BEAST FUEL', f'Manga izquierda, para polo {polo}. 2 colores de hilo.'))
    # Espalda bajo el cuello: COMIDA A COMIDA, mayuscula de 6 mm
    for polo, col in POLO.items():
        t, w = text(ANTON, 'COMIDA A COMIDA', cap, 0, cap, col, anchor='start', track_em=0.28)
        guardar(f'espalda-comida-a-comida-polo-{polo}.svg', svg(w, cap, t, 'Espalda · COMIDA A COMIDA',
                f'Espalda alta, bajo el cuello, para polo {polo}. 1 color de hilo.'))


if __name__ == '__main__':
    os.makedirs(SALIDA, exist_ok=True)
    textos()
    # medidas para los mockups
    import re, json
    med = {}
    for f in sorted(os.listdir(SALIDA)):
        if f.endswith('.svg'):
            m = re.search(r'width="([\d.]+)mm" height="([\d.]+)mm"', open(os.path.join(SALIDA, f)).read())
            med[f[:-4]] = [float(m.group(1)), float(m.group(2))]
    with open(os.path.join(AQUI, 'medidas.js'), 'w') as f:
        f.write('window.MED = ' + json.dumps(med, indent=1) + ';\n')
    for k, v in med.items():
        print(f'{k}: {v[0] / 10:.1f} x {v[1] / 10:.1f} cm')
