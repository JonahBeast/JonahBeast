#!/usr/bin/env python3
"""Genera los SVG de bordado (en mm, formas planas, textos convertidos a trazos).
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


# ---------------------------------------------------------------- GORILA
# Cabeza de frente en una caja de 100 x 100 unidades (u). Se escala con transform.
HEAD = ('M50 1 C61 1 71 6 77 15 C81 22 83 29 84 36 '
        'C88 35.5 92 39 92 45 C92 50 89 54 85 54 '
        'L88 62 L84.5 63.5 L87 71 L82.5 72 '
        'C78 86 66 96 50 96 '
        'C34 96 22 86 17.5 72 L13 71 L15.5 63.5 L12 62 L15 54 '
        'C11 54 8 50 8 45 C8 39 12 35.5 16 36 '
        'C17 29 19 22 23 15 C29 6 39 1 50 1 Z')
HEAD_MINI = ('M50 1 C61 1 71 6 77 15 C81 22 83 29 84 36 '
        'C88 35.5 92 39 92 45 C92 50 89 54 85 54 '
        'C86 74 72 96 50 96 C28 96 14 74 15 54 '
        'C11 54 8 50 8 45 C8 39 12 35.5 16 36 '
        'C17 29 19 22 23 15 C29 6 39 1 50 1 Z')
# Mascara de la cara (piel): el borde de arriba es la ceja pesada del gorila.
MASK = ('M50 46 L56 49 C61 44 70 43 77 46 '
        'C79 51 77 56 74 60 C79 66 80 74 77 80 '
        'C73 87 62 90.5 50 90.5 C38 90.5 27 87 23 80 '
        'C20 74 21 66 26 60 C23 56 21 51 23 46 '
        'C30 43 39 44 44 49 Z')
# Ojos hundidos bajo la ceja
EYE_L = 'M28 50.5 C33 48.6 39.5 49.2 42.5 52.2 C38.5 55.6 31 55.4 28 50.5 Z'
EYE_R = 'M72 50.5 C67 48.6 60.5 49.2 57.5 52.2 C61.5 55.6 69 55.4 72 50.5 Z'
# Nariz ancha de gorila
NOSE = ('M46.5 52 L53.5 52 C55 56.5 60 58.5 61.5 62.5 C63 67.5 59 70.5 55 69.5 '
        'C53 69 47 69 45 69.5 C41 70.5 37 67.5 38.5 62.5 C40 58.5 45 56.5 46.5 52 Z')
NOSTRIL_L = 'M40.8 64.8 C41.8 61.8 45.8 61.8 47.6 64.3 C46.2 66.6 42.3 67 40.8 64.8 Z'
NOSTRIL_R = 'M59.2 64.8 C58.2 61.8 54.2 61.8 52.4 64.3 C53.8 66.6 57.7 67 59.2 64.8 Z'
# Boca (forma rellena, no linea)
MOUTH = 'M36 77.5 C43 80.5 57 80.5 64 77.5 C64.6 80.2 63.6 81.8 62 82.2 C55 84.2 45 84.2 38 82.2 C36.4 81.8 35.4 80.2 36 77.5 Z'
# Llama de la frente (sello de la marca)
FLAME = ('M50 10 C53.5 15 58 18 57 25 C59 23.5 60 21.5 60 19 '
         'C64 24 64 32 57 36 C54.5 37.4 45.5 37.4 43 36 '
         'C36 32 36 24 40 19 C40 21.5 41 23.5 43 25 '
         'C42 18 46.5 15 50 10 Z')


def gorila(x, y, ancho_mm, borde_mm=1.4, pupila=True, fosas=True, boca=True, mini=False, ojo_mini=AJI,
           cuerpo=CARBON, piel=CREMA, acento=AJI, rasgos=CARBON):
    """Cabeza de gorila con su esquina sup-izq en (x,y) y ancho_mm de ancho."""
    s = (ancho_mm - borde_mm) / 84.0  # la cabeza ocupa 84 u de ancho (8..92); el contorno suma borde_mm
    bu = borde_mm / s
    o = borde_mm / 2
    g = [f'<g transform="translate({x - 8 * s + o:.3f} {y - 1 * s + o:.3f}) scale({s:.5f})">',
         f'<path d="{HEAD_MINI if mini else HEAD}" fill="{cuerpo}" stroke="{acento}" stroke-width="{bu:.3f}" stroke-linejoin="round"/>',
         f'<path d="{MASK}" fill="{piel}"/>',
         f'<path d="{FLAME}" fill="{acento}"/>',
         (f'<ellipse cx="35" cy="52" rx="6.8" ry="4" fill="{ojo_mini}"/><ellipse cx="65" cy="52" rx="6.8" ry="4" fill="{ojo_mini}"/>'
          if mini else f'<path d="{EYE_L}" fill="{rasgos}"/><path d="{EYE_R}" fill="{rasgos}"/>')]
    if pupila:
        g.append(f'<circle cx="36" cy="52" r="2.2" fill="{acento}"/><circle cx="64" cy="52" r="2.2" fill="{acento}"/>')
    g.append(f'<path d="{NOSE}" fill="{rasgos}"/>')
    if fosas:
        g.append(f'<path d="{NOSTRIL_L}" fill="{piel}"/><path d="{NOSTRIL_R}" fill="{piel}"/>')
    if boca:
        g.append(f'<path d="{MOUTH}" fill="{rasgos}"/>')
    g.append('</g>')
    alto = 95 * s + borde_mm
    return '\n'.join(g), alto


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


def diamante(cx, cy, r, fill):
    return f'<path fill="{fill}" d="M{cx} {cy - r} L{cx + r} {cy} L{cx} {cy + r} L{cx - r} {cy} Z"/>'


def d1():
    # Pecho: gorila solo, 70 mm de ancho
    W = 70
    g, h = gorila(0, 0, W, borde_mm=1.5)
    guardar('d1-pecho-gorila.svg', svg(W, h, g, 'Diseño 1 · Pecho · Gorila',
            'Bordado pecho izquierdo. 3 colores de hilo.'))
    # Manga: JONAH BEAST FUEL en una linea, mayuscula de 6 mm
    cap = 6.0
    for polo, col in POLO.items():
        t1, w1 = text(ANTON, 'JONAH BEAST ', cap, 0, cap, col, anchor='start', track_em=0.12)
        t2, w2 = text(ANTON, 'FUEL', cap, w1 + 0.12 * cap, cap, AJI, anchor='start', track_em=0.12)
        W2 = w1 + 0.12 * cap + w2
        guardar(f'd1-manga-texto-polo-{polo}.svg', svg(W2, cap, t1 + t2, 'Diseño 1 · Manga',
                f'Manga izquierda, para polo {polo}. 2 colores de hilo.'))


def escudo_path(W, H, i):
    """Escudo tipo club (W x H), reducido i mm hacia adentro."""
    x0, x1 = i, W - i
    top = 6 + i * 0.9
    mid = W / 2
    return (f'M{x0:.2f} {top:.2f} Q{mid:.2f} {i + 0.2 - (0 if i else 0):.2f} {x1:.2f} {top:.2f} '
            f'L{x1:.2f} {H * 0.53:.2f} C{x1:.2f} {H * 0.78 - i * 0.3:.2f} {W * 0.76 - i * 0.2:.2f} {H * 0.93 - i * 0.6:.2f} {mid:.2f} {H - i * 1.25:.2f} '
            f'C{W * 0.24 + i * 0.2:.2f} {H * 0.93 - i * 0.6:.2f} {x0:.2f} {H * 0.78 - i * 0.3:.2f} {x0:.2f} {H * 0.53:.2f} Z')


def d2(w=82, h=89):
    b = 2.6  # borde naranja
    o = b / 2
    body = [f'<g transform="translate({o} {o})">',
            f'<path d="{escudo_path(w - b, h - b, 0)}" fill="{CARBON}" stroke="{AJI}" stroke-width="{b}" stroke-linejoin="round"/>',
            f'<path d="{escudo_path(w - b, h - b, 3.4)}" fill="none" stroke="{CREMA}" stroke-width="1.1" stroke-linejoin="round"/>',
            '</g>']
    cx = w / 2
    body.append(arc_text(ANTON, 'JONAH BEAST', 7.0, cx, 80, 60, CREMA, track_em=0.16))
    gw = 38
    g, gh = gorila(cx - gw / 2, 26, gw, borde_mm=1.1)
    body.append(g)
    fuel, fw = text(ANTON, 'FUEL', 8.0, cx, 78.5, AJI, track_em=0.2)
    body.append(fuel)
    body.append(diamante(cx - fw / 2 - 4.2, 74.5, 1.5, CREMA))
    body.append(diamante(cx + fw / 2 + 4.2, 74.5, 1.5, CREMA))
    guardar('d2-pecho-escudo.svg', svg(w, h, '\n'.join(body), 'Diseño 2 · Pecho · Escudo',
            'Bordado pecho izquierdo. 3 colores de hilo.'))
    # Manga: la llama sola (1 color)
    lw = 24.0
    s = lw / 28.0  # la llama mide 28 u de ancho (36..64) y 27.4 de alto (10..37.4)
    lh = 27.4 * s
    for nombre, col, txt in (('polo-carbon-o-crema', AJI, 'naranja ají'), ('polo-naranja', CREMA, 'crema')):
        guardar(f'd2-manga-llama-{nombre}.svg', svg(lw, lh,
                f'<g transform="translate({-36 * s:.3f} {-10 * s:.3f}) scale({s:.5f})"><path d="{FLAME}" fill="{col}"/></g>',
                'Diseño 2 · Manga · Llama', f'Manga izquierda. 1 color de hilo ({txt}).'))


def d3():
    cap = 10.5
    gap_l = 3.8  # entre lineas
    H = cap * 2 + gap_l
    g, gh = gorila(0, 0, 1, borde_mm=0.9, mini=True)  # para medir proporcion
    # alto del gorila = alto del bloque de texto
    gw = (H - 1.0) / 95 * 84 + 1.0
    g, gh = gorila(0, 0, gw, borde_mm=1.0, mini=True, pupila=False, fosas=False)
    x = gw + 4.5
    variantes = {'carbon': (CREMA, AJI, CREMA), 'crema': (CARBON, AJI, CARBON), 'naranja': (CARBON, CREMA, CREMA)}
    for polo, (c1, c2, raya) in variantes.items():
        t1, w1 = text(ANTON, 'JONAH BEAST', cap, x, cap, c1, anchor='start', track_em=0.06)
        t2, w2 = text(ANTON, 'FUEL', cap, x, H, c2, anchor='start', track_em=0.06)
        rx = x + w2 + 3.2
        r = f'<rect x="{rx:.2f}" y="{H - cap / 2 - 0.9:.2f}" width="{x + w1 - rx:.2f}" height="1.8" fill="{c2}"/>'
        W = x + w1
        gg = g
        if polo == 'naranja':
            gg, _ = gorila(0, 0, gw, borde_mm=1.0, mini=True, pupila=False, fosas=False, acento=CREMA, ojo_mini=AJI)
        guardar(f'd3-pecho-logotipo-polo-{polo}.svg', svg(W, H, gg + t1 + t2 + r, 'Diseño 3 · Pecho · Logotipo',
                f'Bordado pecho izquierdo, para polo {polo}. 3 colores de hilo.'))
    # Espalda: COMIDA A COMIDA
    cap2 = 6.0
    for polo, col in {'carbon': CREMA, 'crema': CARBON, 'naranja': CARBON}.items():
        t, w = text(ANTON, 'COMIDA A COMIDA', cap2, 0, cap2, col, anchor='start', track_em=0.28)
        guardar(f'd3-espalda-comida-a-comida-polo-{polo}.svg', svg(w, cap2, t, 'Diseño 3 · Espalda',
                f'Espalda alta, bajo el cuello, para polo {polo}. 1 color de hilo.'))


if __name__ == '__main__':
    os.makedirs(SALIDA, exist_ok=True)
    d1(); d2(); d3()
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
