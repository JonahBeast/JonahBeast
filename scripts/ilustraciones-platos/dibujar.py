"""Colección de ilustraciones de platos (vista desde arriba, mismo estilo que las 3 muestras aprobadas).
Uso: python3 -I scripts/ilustraciones-platos/dibujar.py <carpeta-salida> [slug ...]
Luego: node scripts/preparar-fotos-platos.mjs <carpeta-salida>  (ver docs/fotos-platos.md).
La base (marco, degradados, papas, carne, cebolla, tomate, pescado) está en muestras.py,
que también dibuja las 3 muestras aprobadas por Jonah.
"""
import math, random, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
SOLO = set(sys.argv[2:])
_src = open(os.path.join(HERE, 'muestras.py')).read()
_src = _src.split('\nfor name, fn in [')[0]  # sin escribir las muestras
_ns = {'__name__': 'platos_base'}
_argv = sys.argv
sys.argv = [_argv[0], OUT]
exec(_src, _ns)
sys.argv = _argv
DEFS, DEFS2, blob, fry, tomato_wedge, onion, beef, lettuce, fish_cube = (
    _ns[k] for k in ['DEFS', 'DEFS2', 'blob', 'fry', 'tomato_wedge', 'onion', 'beef', 'lettuce', 'fish_cube'])
lettuce = None  # se define abajo (la del ceviche ya no se usa)
from_platos = _ns

DEFS3 = """
<defs>
  <radialGradient id="horno" cx="40%" cy="32%" r="78%">
    <stop offset="0%" stop-color="#FBD58A"/>
    <stop offset="40%" stop-color="#E39A42"/>
    <stop offset="80%" stop-color="#B8621F"/>
    <stop offset="100%" stop-color="#8A4214"/>
  </radialGradient>
  <radialGradient id="sinpiel" cx="40%" cy="32%" r="78%">
    <stop offset="0%" stop-color="#F6E3CC"/>
    <stop offset="55%" stop-color="#E2BE98"/>
    <stop offset="100%" stop-color="#B98A64"/>
  </radialGradient>
  <linearGradient id="plancha" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#F7E1BE"/>
    <stop offset="60%" stop-color="#E7C08C"/>
    <stop offset="100%" stop-color="#C99A62"/>
  </linearGradient>
  <radialGradient id="bread" cx="40%" cy="30%" r="80%">
    <stop offset="0%" stop-color="#F7CE84"/>
    <stop offset="45%" stop-color="#DE9A45"/>
    <stop offset="100%" stop-color="#A45E1E"/>
  </radialGradient>
  <radialGradient id="yolk" cx="38%" cy="34%" r="70%">
    <stop offset="0%" stop-color="#FFE27A"/>
    <stop offset="60%" stop-color="#FFB61E"/>
    <stop offset="100%" stop-color="#E58A07"/>
  </radialGradient>
  <radialGradient id="white" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#FFFFFF"/>
    <stop offset="100%" stop-color="#ECE6DA"/>
  </radialGradient>
  <radialGradient id="shell" cx="38%" cy="30%" r="75%">
    <stop offset="0%" stop-color="#F4D2AA"/>
    <stop offset="55%" stop-color="#D9A574"/>
    <stop offset="100%" stop-color="#A9703F"/>
  </radialGradient>
  <linearGradient id="banana" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#FFF08A"/>
    <stop offset="50%" stop-color="#F7D33A"/>
    <stop offset="100%" stop-color="#D9A91A"/>
  </linearGradient>
  <radialGradient id="avoskin" cx="45%" cy="40%" r="70%">
    <stop offset="0%" stop-color="#4E7A2A"/>
    <stop offset="100%" stop-color="#22401A"/>
  </radialGradient>
  <radialGradient id="avoflesh" cx="50%" cy="55%" r="65%">
    <stop offset="0%" stop-color="#F3F2A6"/>
    <stop offset="70%" stop-color="#CFE07A"/>
    <stop offset="100%" stop-color="#93BE45"/>
  </radialGradient>
  <radialGradient id="pit" cx="38%" cy="32%" r="70%">
    <stop offset="0%" stop-color="#C58A55"/>
    <stop offset="100%" stop-color="#6E3A16"/>
  </radialGradient>
  <radialGradient id="straw" cx="40%" cy="30%" r="80%">
    <stop offset="0%" stop-color="#FF6B6B"/>
    <stop offset="60%" stop-color="#E0202E"/>
    <stop offset="100%" stop-color="#9E0E1C"/>
  </radialGradient>
  <radialGradient id="apple" cx="36%" cy="32%" r="78%">
    <stop offset="0%" stop-color="#FF7A6A"/>
    <stop offset="45%" stop-color="#D9202A"/>
    <stop offset="100%" stop-color="#8A0E16"/>
  </radialGradient>
  <radialGradient id="mand" cx="38%" cy="32%" r="78%">
    <stop offset="0%" stop-color="#FFC26A"/>
    <stop offset="55%" stop-color="#F58A1C"/>
    <stop offset="100%" stop-color="#C45A08"/>
  </radialGradient>
  <radialGradient id="potato" cx="38%" cy="32%" r="78%">
    <stop offset="0%" stop-color="#F6E2AE"/>
    <stop offset="60%" stop-color="#DDBA72"/>
    <stop offset="100%" stop-color="#A9823F"/>
  </radialGradient>
  <radialGradient id="potin" cx="45%" cy="45%" r="65%">
    <stop offset="0%" stop-color="#FFF3B8"/>
    <stop offset="100%" stop-color="#F2CF62"/>
  </radialGradient>
  <linearGradient id="papaya" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FFB070"/>
    <stop offset="100%" stop-color="#F26A1E"/>
  </linearGradient>
  <radialGradient id="cream" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#FFFFFF"/>
    <stop offset="70%" stop-color="#F3EFE6"/>
    <stop offset="100%" stop-color="#D9D1C2"/>
  </radialGradient>
  <radialGradient id="porridge" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#F3E3C2"/>
    <stop offset="70%" stop-color="#E2CA9C"/>
    <stop offset="100%" stop-color="#C6A874"/>
  </radialGradient>
  <radialGradient id="broth" cx="45%" cy="40%" r="65%">
    <stop offset="0%" stop-color="#F2C55E"/>
    <stop offset="70%" stop-color="#D9982E"/>
    <stop offset="100%" stop-color="#A86A18"/>
  </radialGradient>
  <radialGradient id="lent" cx="45%" cy="40%" r="65%">
    <stop offset="0%" stop-color="#A86A34"/>
    <stop offset="100%" stop-color="#6A3C17"/>
  </radialGradient>
  <radialGradient id="aji" cx="42%" cy="38%" r="68%">
    <stop offset="0%" stop-color="#FFD866"/>
    <stop offset="65%" stop-color="#F2AE2C"/>
    <stop offset="100%" stop-color="#D18412"/>
  </radialGradient>
  <radialGradient id="estof" cx="45%" cy="40%" r="65%">
    <stop offset="0%" stop-color="#E5793A"/>
    <stop offset="100%" stop-color="#A63E14"/>
  </radialGradient>
  <radialGradient id="ricegreen" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#9CCB62"/>
    <stop offset="70%" stop-color="#5E9B34"/>
    <stop offset="100%" stop-color="#3D6E20"/>
  </radialGradient>
  <radialGradient id="chaufa" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#E9B465"/>
    <stop offset="70%" stop-color="#C48536"/>
    <stop offset="100%" stop-color="#93591C"/>
  </radialGradient>
  <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#5FA33A"/>
    <stop offset="100%" stop-color="#2C6A1E"/>
  </linearGradient>
  <linearGradient id="masa" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FFD978"/>
    <stop offset="100%" stop-color="#E89E2A"/>
  </linearGradient>
  <linearGradient id="ham" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FFB9B4"/>
    <stop offset="100%" stop-color="#E77D82"/>
  </linearGradient>
  <linearGradient id="cheese" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FFFFFF"/>
    <stop offset="100%" stop-color="#EEE7D6"/>
  </linearGradient>
  <linearGradient id="almond" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#C98A4E"/>
    <stop offset="100%" stop-color="#7E4318"/>
  </linearGradient>
  <linearGradient id="crumbint" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#C8986A"/>
    <stop offset="100%" stop-color="#9C6E44"/>
  </linearGradient>
  <linearGradient id="glassw" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.30"/>
    <stop offset="18%" stop-color="#FFFFFF" stop-opacity="0.08"/>
    <stop offset="80%" stop-color="#FFFFFF" stop-opacity="0.05"/>
    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.22"/>
  </linearGradient>
  <radialGradient id="ceramic" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#FFFDF7"/>
    <stop offset="100%" stop-color="#E3DACA"/>
  </radialGradient>
  <radialGradient id="powder" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#FBF1DC"/>
    <stop offset="100%" stop-color="#DCC79E"/>
  </radialGradient>
</defs>
"""


def frame(body, k=1.0, well=None):
    w = well or 'url(#well)'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
{DEFS}{DEFS2}{DEFS3}
<rect width="512" height="512" rx="112" fill="#16110D"/>
<circle cx="256" cy="256" r="254" fill="url(#halo)"/>
<circle cx="256" cy="256" r="236" fill="none" stroke="#E8590C" stroke-width="5" stroke-opacity="0.9"/>
<g filter="url(#plateSh)"><circle cx="256" cy="256" r="224" fill="url(#rim)"/></g>
<circle cx="256" cy="256" r="224" fill="none" stroke="#6B6255" stroke-width="2" stroke-opacity="0.5"/>
<circle cx="256" cy="256" r="204" fill="{w}"/>
<path d="M98 196 A168 168 0 0 1 206 92" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(256 256) scale({k}) translate(-256 -256)">
{body}
</g>
</svg>"""


def T(x, y, rot=0, s=1.0):
    return f'transform="translate({x} {y}) rotate({rot}) scale({s})"'


def hl(d, w=8, op=0.6, col='#FFFFFF'):
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-opacity="{op}" stroke-width="{w}" stroke-linecap="round"/>'


# ---------- piezas ----------
def rice_mound(cx, cy, r, seed=3, n=None):
    b = [f'<g filter="url(#sh)"><circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#rice)"/></g>']
    random.seed(seed)
    for _ in range(n or int(r * 0.8)):
        a = random.uniform(0, 2*math.pi); rr = (r-10)*math.sqrt(random.random())
        x = cx + rr*math.cos(a); y = cy + rr*math.sin(a); t = random.uniform(0, 180)
        b.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="7.5" ry="3.2" transform="rotate({t:.0f} {x:.1f} {y:.1f})" fill="#FFFFFF" stroke="#D3C7AE" stroke-width="1.4"/>')
    b.append(hl(f'M{cx-r*0.62:.0f} {cy-r*0.42:.0f} A{r*0.75:.0f} {r*0.75:.0f} 0 0 1 {cx+r*0.05:.0f} {cy-r*0.78:.0f}', 10, 0.95))
    return "".join(b)


def drum(x, y, rot, s=1.0, skin=True, sauce=None):
    """Pierna (muslo inferior) entera con su hueso."""
    fill = sauce or ('url(#horno)' if skin else 'url(#sinpiel)')
    st = '#5E2A0C' if skin else '#9A6A48'
    o = [f'<g {T(x, y, rot, s)} filter="url(#sh)">',
         f'<path d="M0 -92 C52 -92 78 -48 72 -4 C66 40 34 64 16 92 L-16 92 C-34 64 -66 40 -72 -4 C-78 -48 -52 -92 0 -92Z" fill="{fill}" stroke="{st}" stroke-width="3"/>',
         f'<path d="M-15 88 L-12 132 L12 132 L15 88Z" fill="#EFE2CB" stroke="#BFAE8F" stroke-width="2.5"/>',
         '<circle cx="-12" cy="140" r="15" fill="#F7EEDC" stroke="#BFAE8F" stroke-width="2.5"/>',
         '<circle cx="12" cy="140" r="15" fill="#F7EEDC" stroke="#BFAE8F" stroke-width="2.5"/>']
    if skin:
        o.append(hl('M-46 -50 C-30 -76 10 -82 34 -66', 12, 0.7, '#FFE6B0'))
        o += [f'<ellipse cx="{a}" cy="{b}" rx="{r}" ry="{r*0.6:.1f}" fill="#FFE9B8" opacity="0.75"/>' for a, b, r in
              [(-20, -30, 6), (14, -40, 5), (30, -6, 5), (-36, 6, 4.5), (6, 10, 4), (-10, 36, 4)]]
    else:
        o += [hl(f'M{a} -60 Q{a+8} 0 {a//2} 70', 4.5, 0.75, '#FFF4E6') for a in (-36, -12, 12, 34)]
        o.append(hl('M-40 -52 C-24 -74 10 -78 30 -64', 10, 0.55, '#FFF8EE'))
    o.append('</g>')
    return "".join(o)


def thigh(x, y, rot, s=1.0, skin=True):
    """Entrepierna (muslo): presa ancha y redondeada."""
    fill = 'url(#horno)' if skin else 'url(#sinpiel)'
    st = '#5E2A0C' if skin else '#9A6A48'
    o = [f'<g {T(x, y, rot, s)} filter="url(#sh)">',
         '<rect x="96" y="-16" width="40" height="30" rx="10" fill="#EFE2CB" stroke="#BFAE8F" stroke-width="2.5"/>',
         '<circle cx="140" cy="-2" r="22" fill="#F7EEDC" stroke="#BFAE8F" stroke-width="2.5"/>',
         f'<path d="M-118 -10 C-122 -70 -60 -104 4 -100 C70 -96 118 -60 114 4 C110 66 64 104 -2 102 C-70 100 -114 54 -118 -10Z" fill="{fill}" stroke="{st}" stroke-width="3"/>']
    if skin:
        o += [f'<ellipse cx="{a}" cy="{b}" rx="{rx}" ry="{ry}" fill="#9A4A16" opacity="0.45"/>' for a, b, rx, ry in
              [(-80, 30, 22, 12), (40, 60, 26, 12), (70, -40, 18, 10)]]
    if skin:
        o.append(hl('M-86 -46 C-60 -82 0 -90 50 -72', 14, 0.7, '#FFE6B0'))
        o += [f'<ellipse cx="{a}" cy="{b}" rx="{r}" ry="{r*0.6:.1f}" fill="#FFE9B8" opacity="0.75"/>' for a, b, r in
              [(-50, -20, 7), (-10, -44, 6), (36, -24, 6), (-64, 22, 5), (10, 10, 5), (60, 22, 5), (-20, 52, 4.5)]]
        o.append(hl('M-70 58 C-30 84 30 86 72 60', 6, 0.35, '#5E2A0C'))
    else:
        o += [hl(f'M-90 {a} Q0 {a-18} 92 {a+4}', 4.5, 0.75, '#FFF4E6') for a in (-40, -6, 28, 60)]
        o.append(hl('M-86 -46 C-60 -80 0 -88 50 -72', 11, 0.55, '#FFF8EE'))
    o.append('</g>')
    return "".join(o)


def breast(x, y, rot, s=1.0, skin=True):
    """Pecho: pechuga entera, ancha, con la quilla."""
    fill = 'url(#horno)' if skin else 'url(#sinpiel)'
    st = '#5E2A0C' if skin else '#9A6A48'
    o = [f'<g {T(x, y, rot, s)} filter="url(#sh)">',
         # puntas de las costillas que asoman por un costado
         ''.join(f'<rect x="96" y="{yy}" width="56" height="14" rx="7" fill="#F2E6D0" stroke="#BFAE8F" stroke-width="2" transform="rotate({rr} 96 {yy})"/>'
                 for yy, rr in [(-40, -14), (0, 0), (40, 14)]),
         f'<path d="M0 -150 C70 -150 126 -96 126 -10 C126 70 80 140 0 150 C-80 140 -132 70 -132 -10 C-132 -96 -70 -150 0 -150Z" fill="{fill}" stroke="{st}" stroke-width="3"/>',
         # la quilla (cartílago blanco) a lo largo del pecho
         '<path d="M-20 -146 C-36 -60 -36 60 -20 146" fill="none" stroke="#F4EAD8" stroke-width="9" stroke-linecap="round" opacity="0.9"/>']
    if skin:
        o += [f'<ellipse cx="{a}" cy="{b}" rx="{rx}" ry="{ry}" fill="#9A4A16" opacity="0.45"/>' for a, b, rx, ry in
              [(60, 90, 30, 14), (-90, 70, 20, 12), (80, -60, 20, 10)]]
    if skin:
        o.append(hl('M-96 -60 C-80 -110 -30 -138 -6 -136', 14, 0.7, '#FFE6B0'))
        o.append(hl('M30 -128 C70 -118 104 -84 112 -50', 10, 0.55, '#FFE6B0'))
        o += [f'<ellipse cx="{a}" cy="{b}" rx="{r}" ry="{r*0.6:.1f}" fill="#FFE9B8" opacity="0.75"/>' for a, b, r in
              [(-60, -30, 7), (-40, 20, 6), (-80, 50, 5), (50, -40, 7), (70, 20, 6), (40, 70, 5), (-30, 90, 5)]]
    else:
        o += [hl(f'M{sg*14} {a} Q{sg*70} {a+30} {sg*112} {a+60}', 4.5, 0.75, '#FFF4E6') for sg in (-1, 1) for a in (-100, -50, 0, 50)]
        o.append(hl('M-96 -60 C-80 -110 -30 -138 -6 -136', 11, 0.55, '#FFF8EE'))
    o.append('</g>')
    return "".join(o)


def fillet(x, y, rot, s=1.0):
    """Filete de pechuga a la plancha (sin piel, sin hueso)."""
    o = [f'<g {T(x, y, rot, s)} filter="url(#sh)">',
         '<clipPath id="cfil"><path d="M-160 -10 C-150 -70 -40 -96 60 -84 C140 -74 176 -30 166 14 C156 60 80 86 -10 84 C-100 82 -170 50 -160 -10Z"/></clipPath>',
         '<path d="M-160 -10 C-150 -70 -40 -96 60 -84 C140 -74 176 -30 166 14 C156 60 80 86 -10 84 C-100 82 -170 50 -160 -10Z" fill="url(#plancha)" stroke="#A97B48" stroke-width="3"/>',
         '<g clip-path="url(#cfil)">']
    for i in range(-3, 4):
        o.append(f'<path d="M{i*44-40} -70 L{i*44+30} 70" stroke="#8A4E1C" stroke-width="13" stroke-linecap="round" opacity="0.72"/>')
    o.append('</g>')
    o.append(hl('M-120 -40 C-80 -70 0 -82 60 -74', 9, 0.55, '#FFF6E2'))
    o.append('</g>')
    return "".join(o)


def bread_roll(x, y, rot, s=1.0, filling=None):
    """Pan francés visto desde arriba, con su corte."""
    o = [f'<g {T(x, y, rot, s)}>']
    if filling:
        o.append(filling)
    o += ['<g filter="url(#sh)">',
          '<path d="M-150 0 C-150 -70 -80 -104 0 -104 C80 -104 150 -70 150 0 C150 70 80 104 0 104 C-80 104 -150 70 -150 0Z" fill="url(#bread)" stroke="#8A4A14" stroke-width="3"/>',
          '</g>']
    if not filling:
        o += ['<path d="M-104 6 C-60 -22 60 -22 104 6 C60 18 -60 18 -104 6Z" fill="#F7DFA8" stroke="#B9732A" stroke-width="3"/>',
              hl('M-80 2 C-40 -10 40 -10 80 2', 4, 0.7, '#FFF4D6')]
    o += [hl('M-120 -40 C-96 -80 -30 -94 20 -90', 11, 0.6, '#FFE7B0'),
          '<circle cx="-50" cy="54" r="3.5" fill="#FFF3DA" opacity="0.7"/><circle cx="40" cy="62" r="3" fill="#FFF3DA" opacity="0.7"/><circle cx="96" cy="40" r="3" fill="#FFF3DA" opacity="0.6"/>',
          '</g>']
    return "".join(o)


def egg_half(x, y, rot, s=1.0):
    return (f'<g {T(x, y, rot, s)} filter="url(#sh)">'
            '<ellipse cx="0" cy="0" rx="78" ry="98" fill="url(#white)" stroke="#CFC6B4" stroke-width="3"/>'
            '<circle cx="0" cy="8" r="44" fill="url(#yolk)" stroke="#D88A0A" stroke-width="2.5"/>'
            + hl('M-50 -56 C-36 -80 -10 -90 12 -88', 8, 0.9) + '</g>')


def olive(x, y, s=1.0):
    return (f'<g {T(x, y, 0, s)} filter="url(#shs)"><ellipse cx="0" cy="0" rx="24" ry="17" fill="#3B2131" stroke="#1E0E18" stroke-width="2"/>'
            '<ellipse cx="-8" cy="-6" rx="7" ry="4" fill="#B98AA8" opacity="0.8"/></g>')


def strands(cx, cy, R, seed, col, dark, n=34, w=10):
    random.seed(seed)
    o = []
    for _ in range(n):
        a0 = random.uniform(0, 2*math.pi); r0 = R*random.uniform(0.15, 0.95)
        span = random.uniform(1.0, 2.2); rr = R*random.uniform(0.25, 0.75)
        ox = cx + (r0 - rr)*math.cos(a0)*0.6; oy = cy + (r0 - rr)*math.sin(a0)*0.6
        a1 = random.uniform(0, 2*math.pi); a2 = a1 + span
        x1, y1 = ox + rr*math.cos(a1), oy + rr*math.sin(a1)
        x2, y2 = ox + rr*math.cos(a2), oy + rr*math.sin(a2)
        d = f'M{x1:.1f} {y1:.1f} A{rr:.1f} {rr:.1f} 0 0 1 {x2:.1f} {y2:.1f}'
        o.append(f'<path d="{d}" fill="none" stroke="{dark}" stroke-width="{w+3}" stroke-linecap="round"/>')
        o.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>')
    return "".join(o)


def nest(cx, cy, R, seed, col, dark, light, base, n=40, w=10):
    o = [f'<g filter="url(#sh)"><circle cx="{cx}" cy="{cy}" r="{R*0.8:.0f}" fill="{base}"/></g>']
    o.append(strands(cx, cy, R*0.92, seed, col, dark, n, w))
    random.seed(seed + 1)
    for _ in range(10):
        a = random.uniform(0, 2*math.pi); r = R*random.uniform(0.2, 0.8)
        x = cx + r*math.cos(a); y = cy + r*math.sin(a)
        o.append(f'<path d="M{x-14:.1f} {y:.1f} Q{x:.1f} {y-8:.1f} {x+14:.1f} {y:.1f}" stroke="{light}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>')
    return "".join(o)


def dots(cx, cy, R, n, seed, cols, rx, ry=None, stroke=None, sw=1.2, sx=1.0, sy=1.0):
    random.seed(seed)
    o = []
    for _ in range(n):
        a = random.uniform(0, 2*math.pi); r = R*math.sqrt(random.random())
        x = cx + r*math.cos(a)*sx; y = cy + r*math.sin(a)*sy; t = random.uniform(0, 180)
        c = random.choice(cols)
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
        o.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{rx}" ry="{ry or rx}" transform="rotate({t:.0f} {x:.1f} {y:.1f})" fill="{c}"{st}/>')
    return "".join(o)


def carrot(x, y, r=17):
    return (f'<g filter="url(#shs)"><circle cx="{x}" cy="{y}" r="{r}" fill="#F08A24" stroke="#B85A0C" stroke-width="2"/>'
            f'<circle cx="{x}" cy="{y}" r="{r*0.45:.1f}" fill="#FFB25A"/></g>')


def pea(x, y, r=10):
    return (f'<g filter="url(#shs)"><circle cx="{x}" cy="{y}" r="{r}" fill="#7CC44A" stroke="#3F7D1E" stroke-width="2"/>'
            f'<circle cx="{x-r*0.3:.1f}" cy="{y-r*0.3:.1f}" r="{r*0.3:.1f}" fill="#D6F5A8"/></g>')


def potato_chunk(x, y, rot, s=1.0):
    return (f'<g {T(x, y, rot, s)} filter="url(#shs)"><path d="{blob(0, 0, 34, 3, 0.10, int(x+y), 1.15, 0.9)}" fill="url(#potin)" stroke="#B88A2A" stroke-width="2.5"/>'
            + hl('M-22 -14 Q-6 -24 14 -20', 5, 0.85, '#FFFBE6') + '</g>')


def green_onion(x, y, r=9):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#5FAE34" stroke-width="{r*0.6:.1f}"/>'


def chicken_bit(x, y, rot, s=1.0, col='#F4E1C0', st='#C7A47A'):
    return (f'<g {T(x, y, rot, s)} filter="url(#shs)"><path d="M-18 -14 L16 -16 Q22 -14 20 -6 L18 14 Q16 18 10 18 L-16 16 Q-22 14 -20 8Z" fill="{col}" stroke="{st}" stroke-width="2"/>'
            + hl('M-12 -9 L12 -10', 3.5, 0.8, '#FFFFFF') + '</g>')


def spoon(x, y, rot, sugar=True, s=1.0):
    o = [f'<g {T(x, y, rot, s)} filter="url(#shs)">',
         '<rect x="-8" y="18" width="16" height="116" rx="8" fill="#B3BAC1" stroke="#6E747B" stroke-width="2"/>',
         '<ellipse cx="0" cy="-10" rx="34" ry="42" fill="#959DA6" stroke="#5E646B" stroke-width="2.5"/>']
    if sugar:
        o.append('<ellipse cx="0" cy="-12" rx="28" ry="35" fill="#FFFFFF"/>')
        random.seed(5)
        for _ in range(26):
            a = random.uniform(0, 6.28); r = math.sqrt(random.random())
            o.append(f'<rect x="{18*r*math.cos(a)-2.5:.1f}" y="{-12+25*r*math.sin(a)-2.5:.1f}" width="5" height="5" fill="#E6E2DA" transform="rotate({random.randint(0, 90)} {18*r*math.cos(a):.1f} {-12+25*r*math.sin(a):.1f})"/>')
        o.append(hl('M-12 -30 Q-4 -38 6 -36', 4, 0.9))
    o.append('</g>')
    return "".join(o)


def cup(liquid, extra='', cx=236, cy=236, r=128):
    """Taza vista desde arriba (cerámica crema) con su asa."""
    return (f'<g filter="url(#sh)">'
            f'<rect x="{cx+r-14}" y="{cy-26}" width="76" height="52" rx="26" fill="url(#ceramic)" stroke="#BFB39C" stroke-width="3"/>'
            f'<rect x="{cx+r+6}" y="{cy-10}" width="36" height="20" rx="10" fill="#3A3026"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#ceramic)" stroke="#BFB39C" stroke-width="3"/></g>'
            f'<circle cx="{cx}" cy="{cy}" r="{r-18}" fill="#CFC4AE"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r-22}" fill="{liquid}"/>'
            + extra +
            hl(f'M{cx-r+40} {cy-40} A{r-40} {r-40} 0 0 1 {cx-30} {cy-r+42}', 9, 0.35)
            + hl(f'M{cx-r+8} {cy+30} A{r-6} {r-6} 0 0 0 {cx-20} {cy+r-6}', 6, 0.25, '#FFFFFF'))


def glass(liquid_top, liquid_body, extra_body='', extra_top='', fill_level=0.86, empty_tint=None):
    """Vaso de vidrio en 3/4 parado sobre el plato."""
    x0, x1, yt = 156, 356, 92     # borde de arriba
    bx0, bx1, yb = 180, 332, 420  # base
    ry_t, ry_b = 30, 22
    lt = yt + (1 - fill_level) * (yb - yt)  # nivel del líquido
    # ancho al nivel del líquido
    f = (lt - yt) / (yb - yt)
    lx0 = x0 + (bx0 - x0) * f; lx1 = x1 + (bx1 - x1) * f
    lry = ry_t + (ry_b - ry_t) * f
    o = [f'<ellipse cx="256" cy="{yb+8}" rx="96" ry="26" fill="#0B0705" opacity="0.55"/>',
         # cuerpo del líquido
         f'<path d="M{lx0:.1f} {lt:.1f} L{bx0} {yb} A{(bx1-bx0)/2} {ry_b} 0 0 0 {bx1} {yb} L{lx1:.1f} {lt:.1f} Z" fill="{liquid_body}"/>',
         extra_body,
         f'<ellipse cx="256" cy="{lt:.1f}" rx="{(lx1-lx0)/2:.1f}" ry="{lry:.1f}" fill="{liquid_top}"/>',
         extra_top.replace('LT', f'{lt:.1f}'),
         # vidrio
         f'<path d="M{x0} {yt} L{bx0} {yb} A{(bx1-bx0)/2} {ry_b} 0 0 0 {bx1} {yb} L{x1} {yt}" fill="url(#glassw)" stroke="#E9EEF2" stroke-opacity="0.75" stroke-width="4"/>',
         f'<ellipse cx="256" cy="{yb}" rx="{(bx1-bx0)/2}" ry="{ry_b}" fill="none" stroke="#E9EEF2" stroke-opacity="0.45" stroke-width="5"/>',
         f'<ellipse cx="256" cy="{yt}" rx="{(x1-x0)/2}" ry="{ry_t}" fill="{empty_tint or "none"}" stroke="#F4F7FA" stroke-opacity="0.9" stroke-width="5"/>',
         f'<path d="M{x0+18} {yt+40} L{bx0+12} {yb-30}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="10" stroke-linecap="round"/>',
         f'<path d="M{x1-22} {yt+60} L{bx1-14} {yb-60}" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="6" stroke-linecap="round"/>']
    return "".join(o)


def leaf(x, y, rot, L=60, W=26, col='#4F9A2E', vein='#BDE59A'):
    return (f'<g {T(x, y, rot)}><path d="M0 0 Q{L*0.5} {-W} {L} 0 Q{L*0.5} {W} 0 0Z" fill="{col}" stroke="#2C5E18" stroke-width="2"/>'
            f'<path d="M4 0 L{L-8} 0" stroke="{vein}" stroke-width="2.5"/></g>')


# ---------------- PLATOS ----------------
P = {}


def plato(slug):
    def deco(fn):
        P[slug] = fn
        return fn
    return deco


@plato('arroz-blanco-cocido')
def _():
    return frame(rice_mound(256, 256, 150, 3, 150), 1.0)


@plato('arroz-blanco-crudo')
def _():
    # granos sueltos, secos y translúcidos, esparcidos (no el montoncito del cocido)
    b = [f'<path d="{blob(256, 262, 150, 6, 0.06, 4, 1.0, 0.92)}" fill="#E9E1CC" opacity="0.18"/>']
    random.seed(8)
    for i in range(330):
        a = random.uniform(0, 2*math.pi); r = 150*math.sqrt(random.random())
        x = 256 + r*math.cos(a); y = 262 + r*math.sin(a)*0.92; t = random.uniform(0, 180)
        c = random.choice(['#F6F1E4', '#EFE7D2', '#E4D9BF', '#FBF8EF'])
        b.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="9" ry="3.6" transform="rotate({t:.0f} {x:.1f} {y:.1f})" fill="{c}" stroke="#A89C80" stroke-width="1.3"/>')
    for i in range(14):
        a = random.uniform(0, 2*math.pi); r = random.uniform(160, 185)
        x = 256 + r*math.cos(a); y = 256 + r*math.sin(a); t = random.uniform(0, 180)
        b.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="9" ry="3.6" transform="rotate({t:.0f} {x:.1f} {y:.1f})" fill="#EFE7D2" stroke="#A89C80" stroke-width="1.3"/>')
    return frame("".join(b))


@plato('pan-frances')
def _():
    return frame(bread_roll(256, 256, -18, 1.12))


@plato('platano-de-seda-cruda')
def _():
    b = ['<g filter="url(#sh)" transform="rotate(-28 256 256)">',
         '<path d="M66 232 C110 372 392 376 452 214 C458 198 448 188 438 198 C370 268 150 262 96 206 C86 196 62 214 66 232Z" fill="url(#banana)" stroke="#A47A0E" stroke-width="3.5"/>',
         '<path d="M84 232 C140 320 380 324 444 210" fill="none" stroke="#C99B12" stroke-width="6" opacity="0.7"/>',
         '<path d="M438 198 C446 190 454 178 452 168 L466 166 C468 180 460 200 448 214Z" fill="#7A5A16" stroke="#5A3E0C" stroke-width="2"/>',
         '<ellipse cx="74" cy="228" rx="9" ry="12" fill="#4A3410"/>',
         hl('M130 272 C200 312 320 314 398 270', 9, 0.7, '#FFFBD0'),
         '<circle cx="230" cy="290" r="3" fill="#8A6414" opacity="0.6"/><circle cx="300" cy="294" r="2.5" fill="#8A6414" opacity="0.6"/>',
         '</g>']
    return frame("".join(b), 1.0)


@plato('huevo-de-gallina-cocido')
def _():
    return frame(egg_half(196, 260, -14, 1.05) + egg_half(318, 252, 12, 1.05))


@plato('huevo-de-gallina-frito')
def _():
    b = ['<g filter="url(#sh)">',
         f'<path d="{blob(256, 262, 150, 5, 0.09, 21, 1.0, 0.9, 10)}" fill="url(#white)" stroke="#C98A3A" stroke-width="10" stroke-linejoin="round"/>',
         f'<path d="{blob(256, 262, 150, 5, 0.09, 21, 1.0, 0.9, 10)}" fill="none" stroke="#E9B062" stroke-width="4" stroke-linejoin="round"/>',
         '</g>',
         '<g filter="url(#sh)"><circle cx="262" cy="248" r="62" fill="url(#yolk)" stroke="#D88A0A" stroke-width="3"/></g>',
         hl('M222 228 A44 44 0 0 1 256 196', 10, 0.95),
         hl('M150 190 C170 160 210 140 240 136', 7, 0.5)]
    return frame("".join(b))


@plato('huevo-de-gallina-crudo')
def _():
    b = ['<g filter="url(#sh)" transform="rotate(-24 256 256)">',
         '<path d="M256 104 C330 104 372 210 372 278 C372 352 320 400 256 400 C192 400 140 352 140 278 C140 210 182 104 256 104Z" fill="url(#shell)" stroke="#8C5A2E" stroke-width="3.5"/>',
         hl('M196 190 C210 150 236 130 258 128', 14, 0.75, '#FFF3E0'),
         '<circle cx="300" cy="300" r="3" fill="#B07A48" opacity="0.6"/><circle cx="240" cy="330" r="2.5" fill="#B07A48" opacity="0.6"/><circle cx="320" cy="230" r="2.5" fill="#B07A48" opacity="0.6"/>',
         '</g>']
    return frame("".join(b))


@plato('cafe-negro-con-azucar')
def _():
    liq = '#3A1E0D'
    extra = ('<circle cx="236" cy="236" r="102" fill="none" stroke="#6E3E1C" stroke-width="6" opacity="0.8"/>'
             '<ellipse cx="206" cy="206" rx="34" ry="14" fill="#FFFFFF" opacity="0.18" transform="rotate(-35 206 206)"/>')
    return frame(cup(liq, extra, 226, 222, 124) + spoon(360, 362, 40))


@plato('cafe-con-leche-con-azucar')
def _():
    extra = ('<circle cx="226" cy="222" r="102" fill="none" stroke="#D9A877" stroke-width="7" opacity="0.8"/>'
             '<path d="M190 230 C200 190 250 186 262 214 C272 238 240 256 222 240" fill="none" stroke="#E8C59C" stroke-width="7" stroke-linecap="round" opacity="0.8"/>'
             '<ellipse cx="196" cy="196" rx="30" ry="12" fill="#FFFFFF" opacity="0.22" transform="rotate(-35 196 196)"/>')
    return frame(cup('#B9824E', extra, 226, 222, 124) + spoon(360, 362, 40))


@plato('te-infusion-con-azucar')
def _():
    extra = ('<circle cx="226" cy="222" r="102" fill="#C47A1C" opacity="0.35"/>'
             '<ellipse cx="196" cy="196" rx="30" ry="12" fill="#FFFFFF" opacity="0.25" transform="rotate(-35 196 196)"/>'
             '<path d="M250 250 L274 232 L292 254 L268 272Z" fill="#C9A26A" opacity="0.55"/>')
    tag = ('<path d="M226 120 C250 70 300 64 330 92" fill="none" stroke="#F3EAD8" stroke-width="3"/>'
           '<g filter="url(#shs)"><rect x="318" y="78" width="44" height="54" rx="5" fill="#E8590C" transform="rotate(18 340 105)"/>'
           '<rect x="326" y="88" width="28" height="34" rx="3" fill="#FF8A4A" transform="rotate(18 340 105)"/></g>')
    liq = '<radialGradient/>'
    return frame(cup('#A8560F', extra, 226, 222, 124) + tag + spoon(360, 362, 40))


@plato('palta-cruda')
def _():
    def half(x, y, rot, pit):
        o = [f'<g {T(x, y, rot)} filter="url(#sh)">',
             '<path d="M0 -112 C40 -112 54 -70 62 -36 C74 6 96 30 92 66 C86 108 46 128 0 128 C-46 128 -86 108 -92 66 C-96 30 -74 6 -62 -36 C-54 -70 -40 -112 0 -112Z" fill="url(#avoskin)" stroke="#162A10" stroke-width="3"/>',
             '<path d="M0 -98 C30 -98 42 -64 50 -34 C60 4 80 28 78 62 C74 98 40 114 0 114 C-40 114 -74 98 -78 62 C-80 28 -60 4 -50 -34 C-42 -64 -30 -98 0 -98Z" fill="url(#avoflesh)"/>']
        if pit:
            o += ['<circle cx="0" cy="44" r="40" fill="url(#pit)" stroke="#4A230A" stroke-width="2.5"/>',
                  hl('M-22 30 A26 26 0 0 1 0 18', 7, 0.6, '#F5D3AE')]
        else:
            o.append('<circle cx="0" cy="44" r="40" fill="#E3E79A" stroke="#B8C860" stroke-width="2"/>')
        o += [hl('M-40 -40 C-36 -70 -18 -88 0 -90', 6, 0.5), '</g>']
        return "".join(o)
    return frame(half(186, 262, -16, True) + half(330, 250, 16, False))


@plato('pollo-pechuga-cocida')
def _():
    return frame(fillet(256, 256, -22, 1.05))


@plato('fresa-cruda')
def _():
    def berry(x, y, rot, s=1.0):
        o = [f'<g {T(x, y, rot, s)} filter="url(#sh)">',
             '<path d="M0 86 C-30 80 -72 30 -70 -20 C-68 -56 -36 -64 0 -60 C36 -64 68 -56 70 -20 C72 30 30 80 0 86Z" fill="url(#straw)" stroke="#7A0A14" stroke-width="3"/>']
        random.seed(int(x))
        for yy in range(-40, 70, 20):
            for xx in range(-52, 60, 22):
                xo = xx + (11 if (yy // 20) % 2 else 0)
                if (xo/66)**2 + ((yy-10)/76)**2 < 0.8:
                    o.append(f'<ellipse cx="{xo}" cy="{yy}" rx="3.2" ry="4.5" fill="#FFE38A"/>')
        o += ['<path d="M0 -58 L-34 -84 L-14 -66 L-40 -56 L-12 -54 L-22 -36 L0 -50 L22 -36 L12 -54 L40 -56 L14 -66 L34 -84Z" fill="#4FA02E" stroke="#2C6418" stroke-width="2.5" stroke-linejoin="round"/>',
              '<rect x="-4" y="-80" width="8" height="22" rx="4" fill="#3E7D22"/>',
              hl('M-48 -24 C-46 -40 -34 -48 -20 -48', 7, 0.6), '</g>']
        return "".join(o)
    return frame(berry(184, 214, -24) + berry(330, 226, 22) + berry(256, 340, 4, 1.02))


@plato('avena-quinua-de-bebida-con-azucar')
def _():
    top = ('<g>' + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#9A5A24" opacity="0.85"/>' for x, y, r in
                         [(226, 0, 3.5), (250, 6, 3), (276, -4, 3.5), (296, 8, 3), (240, -10, 2.5), (262, -14, 3), (214, 10, 2.5), (286, -16, 2.5), (306, -2, 2.5), (232, 14, 2)])
           + '</g>')
    top = top.replace('cy="', 'cy="LTX').replace('LTX', '')  # placeholder no usado
    # canela en polvo sobre la superficie (posición relativa al nivel del líquido)
    random.seed(12)
    sp = []
    for _ in range(46):
        a = random.uniform(0, 6.28); r = math.sqrt(random.random())
        sp.append((256 + 70*r*math.cos(a), 26*r*math.sin(a), random.choice([2.5, 3, 3.5])))
    top = "".join(f'<circle cx="{x:.1f}" cy="calc" r="{r}" fill="#93501C" opacity="0.85"/>'.replace('cy="calc"', f'cy="{{LT+{dy:.1f}}}"') for x, dy, r in sp)
    return frame(glass_with_top('#EEDDBA', '#E3CC9F', top))


def glass_with_top(top_col, body_col, top_items, fill=0.82, extra_body=''):
    g = glass(top_col, body_col, extra_body, 'TOPITEMS', fill)
    # nivel del líquido
    yt, yb = 92, 420
    lt = yt + (1 - fill) * (yb - yt)
    items = top_items
    import re
    items = re.sub(r'\{LT\+(-?[0-9.]+)\}', lambda m: f'{lt + float(m.group(1)):.1f}', items)
    return g.replace('TOPITEMS', items)


@plato('agua')
def _():
    body = '<path d="M190 300 L196 400" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="5"/>'
    top = ('<ellipse cx="256" cy="{LT+0}" rx="70" ry="18" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="3"/>'
           '<ellipse cx="256" cy="{LT+0}" rx="40" ry="10" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="3"/>')
    return frame(glass_with_top('#BFE6FA', '#7FC6EE', top, 0.8, body).replace('fill="#7FC6EE"', 'fill="#7FC6EE" fill-opacity="0.55"').replace('fill="#BFE6FA"', 'fill="#BFE6FA" fill-opacity="0.8"'))


@plato('gaseosa-regular')
def _():
    random.seed(31)
    bub = "".join(f'<circle cx="{random.uniform(196, 316):.1f}" cy="{random.uniform(170, 400):.1f}" r="{random.choice([3, 4, 5, 6])}" fill="none" stroke="#F3D9B8" stroke-opacity="0.7" stroke-width="2"/>' for _ in range(22))
    top = ('<ellipse cx="256" cy="{LT+0}" rx="80" ry="22" fill="#C89A6A" opacity="0.6"/>'
           + "".join(f'<circle cx="{x}" cy="{{LT+{dy}}}" r="{r}" fill="#F6E6CC" opacity="0.85"/>' for x, dy, r in
                     [(206, 2, 5), (226, -8, 4), (250, 6, 6), (274, -6, 4), (296, 4, 5), (310, -4, 3.5), (236, 12, 3.5), (284, 12, 3)])
           + '<g transform="translate(222 {LT+-6}) rotate(-14)"><rect x="-28" y="-20" width="56" height="40" rx="9" fill="#E8F4FA" fill-opacity="0.75" stroke="#FFFFFF" stroke-width="2.5"/><path d="M-18 -10 L10 -12" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></g>'
           + '<g transform="translate(294 {LT+4}) rotate(18)"><rect x="-26" y="-18" width="52" height="36" rx="9" fill="#E8F4FA" fill-opacity="0.7" stroke="#FFFFFF" stroke-width="2.5"/><path d="M-16 -8 L10 -10" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></g>')
    return frame(glass_with_top('#4A2310', '#2A0F05', top, 0.84, bub))


@plato('papa-cocida')
def _():
    b = ['<g filter="url(#sh)" transform="rotate(-20 200 250)">',
         f'<path d="{blob(200, 250, 104, 3, 0.06, 41, 1.15, 0.85)}" fill="url(#potato)" stroke="#8A6528" stroke-width="3"/>',
         '<ellipse cx="160" cy="226" rx="6" ry="4" fill="#9A7434"/><ellipse cx="236" cy="280" rx="6" ry="4" fill="#9A7434"/><ellipse cx="240" cy="214" rx="5" ry="3.5" fill="#9A7434"/>',
         hl('M120 220 C130 186 170 168 206 168', 10, 0.6, '#FFF6D8'), '</g>',
         '<g filter="url(#sh)" transform="rotate(16 340 300)">',
         f'<path d="{blob(340, 300, 82, 3, 0.05, 43, 1.1, 0.9)}" fill="#C9A35A" stroke="#8A6528" stroke-width="3"/>',
         f'<path d="{blob(340, 300, 70, 3, 0.05, 43, 1.1, 0.9)}" fill="url(#potin)"/>',
         hl('M296 278 C306 258 330 248 350 248', 7, 0.8, '#FFFBE8'), '</g>']
    return frame("".join(b))


@plato('avena-en-hojuelas-cruda')
def _():
    b = [f'<path d="{blob(256, 260, 160, 6, 0.05, 6)}" fill="#C7A877" opacity="0.35"/>']
    random.seed(17)
    for i in range(150):
        a = random.uniform(0, 2*math.pi); r = 158*math.sqrt(random.random())
        x = 256 + r*math.cos(a); y = 260 + r*math.sin(a); t = random.uniform(0, 180)
        c = random.choice(['#E9D3A6', '#DCC08A', '#F2E2BE', '#CFAF78'])
        rx = random.uniform(11, 15); ry = rx*random.uniform(0.6, 0.8)
        b.append(f'<g transform="rotate({t:.0f} {x:.1f} {y:.1f})"><path d="M{x-rx:.1f} {y:.1f} Q{x-rx*0.6:.1f} {y-ry:.1f} {x+rx*0.2:.1f} {y-ry:.1f} Q{x+rx:.1f} {y-ry*0.6:.1f} {x+rx:.1f} {y+ry*0.2:.1f} Q{x+rx*0.4:.1f} {y+ry:.1f} {x-rx*0.4:.1f} {y+ry*0.9:.1f}Z" fill="{c}" stroke="#9A7A46" stroke-width="1.5"/></g>')
    return frame("".join(b))


@plato('pan-integral')
def _():
    b = ['<g filter="url(#sh)" transform="rotate(-10 256 262)">',
         '<path d="M136 400 L136 200 C136 120 180 100 256 100 C332 100 376 120 376 200 L376 400 Q376 412 364 412 L148 412 Q136 412 136 400Z" fill="#6E4320" stroke="#4A2A10" stroke-width="3"/>',
         '<path d="M152 392 L152 204 C152 136 190 118 256 118 C322 118 360 136 360 204 L360 392 Q360 396 356 396 L156 396 Q152 396 152 392Z" fill="url(#crumbint)"/>']
    random.seed(9)
    for _ in range(70):
        x = random.uniform(166, 346); y = random.uniform(140, 384); t = random.uniform(0, 180)
        c = random.choice(['#6E4320', '#E8C99A', '#5A3618', '#D9B27C'])
        b.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{random.choice([3, 4, 5])}" ry="2.4" transform="rotate({t:.0f} {x:.1f} {y:.1f})" fill="{c}"/>')
    b += [hl('M168 200 C170 150 200 130 240 128', 8, 0.35, '#FFF0D8'), '</g>']
    return frame("".join(b))


@plato('yogur-griego-natural')
def _():
    b = ['<circle cx="256" cy="256" r="196" fill="url(#cream)"/>',
         '<circle cx="256" cy="256" r="196" fill="none" stroke="#CFC6B4" stroke-width="4"/>',
         # espeso: remolino con picos
         '<path d="M256 256 m-14 0 a14 14 0 1 1 28 0 a36 36 0 1 1 -70 6 a62 62 0 1 1 122 -8 a92 92 0 1 1 -178 18 a120 120 0 1 1 236 -16" fill="none" stroke="#D8CFBF" stroke-width="14" stroke-linecap="round"/>',
         '<path d="M256 256 m-14 0 a14 14 0 1 1 28 0 a36 36 0 1 1 -70 6 a62 62 0 1 1 122 -8 a92 92 0 1 1 -178 18 a120 120 0 1 1 236 -16" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" transform="translate(-4 -5)"/>',
         '<g filter="url(#shs)"><path d="M248 248 Q262 210 280 236 Q272 250 248 248Z" fill="#FFFFFF"/></g>',
         hl('M110 190 A160 160 0 0 1 190 104', 10, 0.8)]
    return frame("".join(b), well='#2A2018')


@plato('yogur-natural')
def _():
    b = ['<circle cx="256" cy="256" r="196" fill="url(#cream)"/>',
         '<circle cx="256" cy="256" r="196" fill="none" stroke="#CFC6B4" stroke-width="4"/>',
         '<ellipse cx="200" cy="190" rx="70" ry="26" fill="#FFFFFF" opacity="0.9" transform="rotate(-30 200 190)"/>',
         '<path d="M150 300 C200 330 300 336 360 290" fill="none" stroke="#E2DBCD" stroke-width="6" stroke-linecap="round"/>',
         spoon(330, 300, -40, False, 1.25),
         hl('M110 190 A160 160 0 0 1 190 104', 10, 0.8)]
    return frame("".join(b), well='#2A2018')


@plato('manzana-cruda')
def _():
    b = ['<g filter="url(#sh)">',
         '<path d="M256 140 C300 112 384 120 392 214 C400 300 340 392 256 390 C172 392 112 300 120 214 C128 120 212 112 256 140Z" fill="url(#apple)" stroke="#6A0A10" stroke-width="3.5"/>',
         '</g>',
         '<path d="M240 150 C246 168 266 168 272 150" fill="#8A1018" opacity="0.6"/>',
         '<path d="M256 156 C254 132 258 112 270 96" fill="none" stroke="#5A3A18" stroke-width="9" stroke-linecap="round"/>',
         leaf(268, 112, -30, 78, 28),
         hl('M162 200 C170 170 196 152 220 150', 14, 0.6, '#FFD6CC'),
         '<ellipse cx="180" cy="250" rx="10" ry="20" fill="#FFFFFF" opacity="0.25" transform="rotate(10 180 250)"/>']
    return frame("".join(b))


@plato('mandarina-cruda')
def _():
    random.seed(4)
    dimples = "".join(f'<circle cx="{200+90*math.sqrt(random.random())*math.cos(a):.1f}" cy="{240+90*math.sqrt(random.random())*math.sin(a):.1f}" r="2.2" fill="#C45A08" opacity="0.45"/>' for a in [random.uniform(0, 6.28) for _ in range(40)])
    b = ['<g filter="url(#sh)"><path d="' + blob(206, 238, 110, 5, 0.03, 2, 1.05, 0.95) + '" fill="url(#mand)" stroke="#9A4406" stroke-width="3"/></g>',
         dimples,
         '<circle cx="206" cy="160" r="9" fill="#5A7A1E"/>',
         leaf(208, 156, -60, 74, 26, '#3F8A26'),
         hl('M126 210 C134 176 160 152 190 146', 12, 0.55, '#FFE2B0')]
    # gajos
    for x, y, r in [(352, 330, 30), (300, 380, 70), (380, 260, -20)]:
        b.append(f'<g {T(x, y, r)} filter="url(#shs)"><path d="M-44 6 C-40 -30 40 -30 44 6 C30 26 -30 26 -44 6Z" fill="#FFA43A" stroke="#D2700E" stroke-width="3"/>'
                 '<path d="M-30 -2 C-10 -14 10 -14 30 -2" stroke="#FFD49A" stroke-width="4" fill="none" stroke-linecap="round"/></g>')
    return frame("".join(b))


@plato('arroz-chaufa')
def _():
    b = [f'<g filter="url(#sh)"><path d="{blob(256, 256, 172, 7, 0.05, 61)}" fill="url(#chaufa)"/></g>',
         dots(256, 256, 160, 220, 62, ['#F0C77E', '#D89A4A', '#B9772C', '#F6D69A'], 7.5, 3.2, '#8A5418', 1)]
    random.seed(63)
    for _ in range(8):
        a = random.uniform(0, 6.28); r = 120*math.sqrt(random.random())
        b.append(chicken_bit(256 + r*math.cos(a), 256 + r*math.sin(a), random.uniform(0, 90), 1.25))
    for _ in range(7):
        a = random.uniform(0, 6.28); r = 125*math.sqrt(random.random())
        x = 256 + r*math.cos(a); y = 256 + r*math.sin(a)
        b.append(f'<g filter="url(#shs)"><path d="{blob(x, y, 18, 3, 0.25, int(x))}" fill="#FFD84A" stroke="#D9A20C" stroke-width="2"/></g>')
    for _ in range(14):
        a = random.uniform(0, 6.28); r = 140*math.sqrt(random.random())
        b.append(green_onion(round(256 + r*math.cos(a)), round(256 + r*math.sin(a)), 10))
    b.append(hl('M120 190 C140 140 190 110 240 104', 10, 0.35, '#FFF0C8'))
    return frame("".join(b))


@plato('proteina-en-polvo-whey')
def _():
    b = [f'<g filter="url(#sh)"><path d="{blob(220, 290, 120, 6, 0.05, 71, 1.15, 0.85)}" fill="url(#powder)"/></g>',
         dots(220, 290, 110, 90, 72, ['#E6D3AE', '#FFF8E8', '#D2BB8E'], 2.6, None, None, 1, 1.15, 0.85),
         hl('M130 260 C150 220 200 206 240 210', 9, 0.6),
         # scoop
         '<g filter="url(#sh)">',
         '<rect x="340" y="132" width="90" height="24" rx="12" fill="#F3F0EA" stroke="#B9B2A4" stroke-width="2.5" transform="rotate(-36 340 144)"/>',
         '<circle cx="318" cy="186" r="70" fill="#F7F4EE" stroke="#B9B2A4" stroke-width="3"/>',
         '<circle cx="318" cy="186" r="56" fill="url(#powder)"/>',
         '</g>',
         dots(318, 186, 50, 36, 73, ['#E6D3AE', '#FFF8E8'], 2.4),
         hl('M282 160 A44 44 0 0 1 316 138', 6, 0.8)]
    return frame("".join(b))


@plato('queso-fresco')
def _():
    b = ['<g filter="url(#sh)" transform="rotate(-12 256 262)">',
         '<path d="M118 196 Q118 172 142 172 L370 172 Q394 172 394 196 L394 334 Q394 358 370 358 L142 358 Q118 358 118 334Z" fill="#DCD2BC"/>',
         '<path d="M118 180 Q118 156 142 156 L370 156 Q394 156 394 180 L394 316 Q394 340 370 340 L142 340 Q118 340 118 316Z" fill="url(#cheese)" stroke="#CFC5AE" stroke-width="3"/>']
    random.seed(19)
    for _ in range(16):
        x = random.uniform(140, 372); y = random.uniform(176, 322)
        b.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{random.choice([3, 4, 5])}" ry="2.5" fill="#E6DECB"/>')
    b += [hl('M138 172 L300 172', 7, 0.9), '</g>']
    return frame("".join(b))


@plato('avena-cocida')
def _():
    b = ['<circle cx="256" cy="256" r="196" fill="url(#porridge)"/>',
         '<circle cx="256" cy="256" r="196" fill="none" stroke="#B89A66" stroke-width="4"/>',
         dots(256, 256, 170, 90, 81, ['#D8BC88', '#EAD5AC', '#C9A86F'], 11, 6, None),
         '<path d="M170 230 C200 190 280 186 310 220 C330 246 300 280 260 276" fill="none" stroke="#FAF0DA" stroke-width="10" stroke-linecap="round" opacity="0.8"/>',
         hl('M110 190 A160 160 0 0 1 190 104', 10, 0.55)]
    return frame("".join(b), well='#2A2018')


@plato('carne-de-res-bistec-cocida')
def _():
    d = blob(256, 256, 156, 3, 0.07, 91, 1.15, 0.78)
    b = ['<g filter="url(#sh)" transform="rotate(-14 256 256)">',
         f'<clipPath id="cbis"><path d="{d}"/></clipPath>',
         f'<path d="{d}" fill="url(#beef2)" stroke="#3A1607" stroke-width="3"/>',
         f'<path d="{blob(256, 256, 140, 3, 0.07, 91, 1.15, 0.78)}" fill="none" stroke="#C98454" stroke-width="5" opacity="0.5"/>',
         '<g clip-path="url(#cbis)">']
    for i in range(-3, 4):
        b.append(f'<path d="M{256+i*46-46} 150 L{256+i*46+40} 362" stroke="#3A1607" stroke-width="12" stroke-linecap="round" opacity="0.55"/>')
    b += ['</g>', hl('M120 220 C150 170 230 146 300 148', 10, 0.45, '#E8A878'), '</g>']
    return frame("".join(b))


@plato('fideos-pasta-cocidos')
def _():
    return frame(nest(256, 256, 172, 101, '#F7DC95', '#B88A34', '#FFF6D2', '#C9A350', 44, 13))


@plato('papas-fritas-comida-rapida')
def _():
    pos = [(250, 330, -12, 170), (300, 280, 30, 170), (206, 250, 64, 160), (322, 356, -60, 150), (262, 196, -24, 170),
           (190, 330, 18, 150), (334, 206, 74, 150), (250, 268, 6, 170), (176, 186, -40, 140), (356, 300, 48, 140),
           (278, 150, 20, 130), (232, 390, 34, 130), (150, 262, 86, 120), (300, 236, -50, 150)]
    b = [fry(x, y, a, L, 36) for x, y, a, L in pos]
    return frame("".join(b))


def aji_tira(x, y, ang, L=110, w=20):
    return (f'<g {T(x, y, ang)} filter="url(#shs)"><path d="M{-L/2} 0 Q0 -16 {L/2} 0" fill="none" stroke="#B9700A" stroke-width="{w+3}" stroke-linecap="round"/>'
            f'<path d="M{-L/2} 0 Q0 -16 {L/2} 0" fill="none" stroke="#FFB21E" stroke-width="{w}" stroke-linecap="round"/>'
            f'<path d="M{-L/2+8} -4 Q0 -18 {L/2-8} -4" fill="none" stroke="#FFE08A" stroke-width="{w*0.3:.1f}" stroke-linecap="round"/></g>')


def pollo_tira(x, y, ang, w=130, h=60):
    return (f'<g {T(x, y, ang)} filter="url(#sh)"><rect x="{-w/2}" y="{-h/2}" width="{w}" height="{h}" rx="{h*0.35:.0f}" fill="url(#plancha)" stroke="#A9733E" stroke-width="2.5"/>'
            f'<path d="M{-w/2+14} {-h/2+12} L{w/2-18} {-h/2+10}" stroke="#FFF4DE" stroke-width="5" stroke-linecap="round" opacity="0.8"/>'
            f'<path d="M{-w/2+16} {h/2-12} L{w/2-14} {h/2-14}" stroke="#B9783A" stroke-width="6" stroke-linecap="round" opacity="0.55"/></g>')


def lomo_mezcla(dx=0, dy=0, s=1.0, papas=True, carne='res'):
    """Saltado simplificado: pocas piezas y grandes."""
    pieza = beef if carne == 'res' else pollo_tira
    b = [f'<g transform="translate({dx} {dy}) translate(256 256) scale({s}) translate(-256 -256)">',
         f'<path d="{blob(256, 256, 160, 5, 0.06, 11, 1.0, 0.92, -20)}" fill="url(#jugo)"/>']
    if papas:
        b += [fry(168, 300, -35, 176, 40), fry(344, 168, 25, 176, 40), fry(336, 344, 62, 164, 40), fry(176, 170, 75, 150, 40)]
        b += [pieza(252, 232, -14, 146, 82), pieza(346, 262, 32, 132, 76), pieza(176, 250, 62, 124, 72), pieza(258, 336, 8, 136, 78)]
        b += [aji_tira(214, 190, -30, 100, 18)]
        b += [onion(286, 156, 24, 134, 30, 24), onion(146, 336, -70, 112, 26, 22), onion(368, 346, -40, 112, 26, 22)]
    else:
        # sin papas fritas: carne, cebolla, tomate y ají amarillo
        b += [pieza(236, 214, -14, 150, 84), pieza(330, 290, 32, 140, 80), pieza(170, 300, 62, 130, 76), pieza(318, 170, 74, 120, 70), pieza(250, 352, 8, 140, 80)]
        b += [aji_tira(190, 180, -40), aji_tira(370, 230, 70), aji_tira(220, 280, 20, 100, 18)]
        b += [onion(286, 140, 24, 134, 30, 24), onion(140, 250, -70, 120, 28, 22), onion(370, 336, -40, 116, 26, 22), onion(250, 300, 150, 110, 26, 22)]
    b += [tomato_wedge(320, 226, 70, 1.7), tomato_wedge(212, 314, -150, 1.6), tomato_wedge(236, 146, 8, 1.45), '</g>']
    return "".join(b)


for carne, base in [('res', 'lomo-saltado'), ('pollo', 'saltado-de-pollo')]:
    for papas in (True, False):
        suf = 'con-papas-fritas' if papas else 'sin-papas-fritas'
        P[f'{base}-{suf}'] = (lambda c=carne, p=papas: frame(lomo_mezcla(0, 4, 1.2, papas=p, carne=c)))
        if carne == 'res':
            P[f'lomo-saltado-con-arroz-{suf}'] = (lambda p=papas: frame(lomo_mezcla(46, -40, 0.98, papas=p) + rice_mound(156, 350, 96, 3, 80)))


@plato('almendras-crudas')
def _():
    def almond(x, y, rot):
        return (f'<g {T(x, y, rot)} filter="url(#shs)"><path d="M0 -44 C22 -30 30 0 26 18 C22 36 10 44 0 44 C-10 44 -22 36 -26 18 C-30 0 -22 -30 0 -44Z" fill="url(#almond)" stroke="#4E260A" stroke-width="2.5"/>'
                '<path d="M-8 -26 Q-12 6 -6 32 M8 -24 Q12 4 8 30 M0 -36 L0 36" stroke="#5E2E0E" stroke-width="2" fill="none" opacity="0.55"/>'
                + hl('M-12 -24 C-16 -10 -18 4 -16 14', 4, 0.5, '#F2C89A') + '</g>')
    pos = [(200, 190, -30), (262, 176, 10), (322, 200, 40), (176, 262, -70), (240, 248, 20), (306, 266, -20), (360, 280, 60),
           (204, 330, 30), (270, 326, -40), (332, 344, 10), (150, 320, 80), (250, 390, 70), (380, 210, -10)]
    return frame("".join(almond(*p) for p in pos))


def broth_bowl(extra, col='url(#broth)'):
    random.seed(111)
    fat = "".join(f'<circle cx="{256+150*math.sqrt(random.random())*math.cos(a):.1f}" cy="{256+150*math.sqrt(random.random())*math.sin(a):.1f}" r="{random.choice([4, 6, 8, 10])}" fill="none" stroke="#FFE6A0" stroke-width="2.5" opacity="0.7"/>' for a in [random.uniform(0, 6.28) for _ in range(18)])
    return ('<circle cx="256" cy="256" r="196" fill="' + col + '"/>'
            '<circle cx="256" cy="256" r="196" fill="none" stroke="#8A5410" stroke-width="4" opacity="0.6"/>'
            + fat + extra + hl('M100 200 A164 164 0 0 1 180 100', 10, 0.45))


@plato('sopa-de-pollo-con-fideos')
def _():
    ex = (strands(256, 260, 150, 121, '#F7DE98', '#D2A24A', 26, 8)
          + carrot(196, 196) + carrot(330, 330) + carrot(176, 320) + carrot(352, 210)
          + "".join(f'<g filter="url(#shs)"><rect x="{x-12}" y="{y-9}" width="24" height="18" rx="5" fill="#9FD06A" stroke="#4E8A24" stroke-width="2"/></g>' for x, y in [(230, 340), (300, 186), (160, 260), (360, 280)])
          + chicken_bit(270, 262, 20, 2.2, '#F2DDBC', '#BE9A6E'))
    return frame(broth_bowl(ex), well='#2A2018')


@plato('caldo-de-gallina')
def _():
    ex = (strands(256, 260, 150, 131, '#F7DE98', '#D2A24A', 22, 8)
          + potato_chunk(176, 300, -10, 1.3)
          + "".join(green_onion(x, y, 11) for x, y in [(330, 170), (350, 200), (200, 170), (310, 350), (360, 320), (150, 240)])
          + drum(286, 236, 40, 0.95, skin=False))
    return frame(broth_bowl(ex), well='#2A2018')


@plato('lenteja-cocida')
def _():
    b = ['<circle cx="256" cy="256" r="190" fill="url(#lent)"/>',
         dots(256, 256, 178, 420, 141, ['#B07A3E', '#8E5626', '#C48C4C', '#7A4618'], 8.5, 6.5, '#5A3010', 1.2),
         hl('M100 200 A164 164 0 0 1 180 100', 10, 0.35, '#F2C890')]
    return frame("".join(b), well='#2A2018')


@plato('ceviche-de-pescado')
def _():
    b = ['<ellipse cx="256" cy="262" rx="176" ry="160" fill="url(#leche)"/>']
    cubes = [(196, 220, 10), (256, 196, -12), (318, 214, 18), (350, 280, -8), (210, 290, -20),
             (276, 268, 6), (330, 340, 24), (170, 344, 14), (240, 350, -6), (290, 396, -16), (160, 270, 30)]
    for x, y, a in cubes:
        b.append(fish_cube(x, y, a, 62))
    b += [onion(240, 250, 20, 104, 28, 18), onion(310, 300, -30, 104, 28, 18), onion(200, 320, 70, 90, 24, 17),
          onion(300, 180, 110, 84, 22, 16), onion(250, 380, -5, 90, 22, 16)]
    # ají limo en rodajitas y culantro
    for x, y in [(352, 236), (220, 180), (270, 312), (180, 400)]:
        b.append(f'<g filter="url(#shs)"><circle cx="{x}" cy="{y}" r="15" fill="#E8261E" stroke="#9A1010" stroke-width="2"/><circle cx="{x}" cy="{y}" r="7" fill="#FFE8A0"/></g>')
    for x, y, r in [(150, 220, 20), (360, 380, -40), (330, 150, 60), (120, 310, 0)]:
        b.append(f'<g {T(x, y, r)} filter="url(#shs)"><path d="M0 0 C-14 -18 -4 -32 8 -24 C14 -36 32 -30 26 -14 C40 -8 34 12 18 10 C16 22 0 22 0 0Z" fill="#4FA83A" stroke="#2C6A1E" stroke-width="2"/></g>')
    return frame("".join(b), 1.0)


@plato('papaya-cruda')
def _():
    def wedge(x, y, rot):
        return (f'<g {T(x, y, rot)} filter="url(#sh)"><path d="M-160 -30 C-130 110 130 110 160 -30 C100 20 -100 20 -160 -30Z" fill="#9DB62E" stroke="#5A7A12" stroke-width="3"/>'
                '<path d="M-148 -22 C-116 92 116 92 148 -22 C96 22 -96 22 -148 -22Z" fill="url(#papaya)"/>'
                '<path d="M-130 -10 C-90 24 90 24 130 -10" stroke="#FFD6AE" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.85"/></g>')
    return frame(wedge(250, 176, -10) + wedge(262, 318, -10))


@plato('chicha-morada-con-azucar')
def _():
    top = ('<ellipse cx="256" cy="{LT+0}" rx="64" ry="16" fill="#7A2A66" opacity="0.6"/>'
           + "".join(f'<g transform="translate({x} {{LT+{dy}}}) rotate({r})"><rect x="-13" y="-10" width="26" height="20" rx="4" fill="{c}" stroke="#8A6A20" stroke-width="2"/></g>'
                     for x, dy, r, c in [(214, 0, 12, '#FFD84A'), (248, -10, -20, '#FFF2C8'), (286, 2, 30, '#FFD84A'), (308, -8, -8, '#FFF2C8'), (236, 12, 40, '#FFE07A'), (270, 14, 0, '#FFF2C8')]))
    return frame(glass_with_top('#5E1A4E', '#3A0A2E', top, 0.84))


@plato('tamal')
def _():
    b = ['<g filter="url(#sh)" transform="rotate(-14 256 256)">',
         '<path d="M70 256 C70 140 150 92 256 92 C362 92 442 140 442 256 C442 372 362 420 256 420 C150 420 70 372 70 256Z" fill="url(#leaf)" stroke="#1E4A12" stroke-width="3"/>',
         '<path d="M90 256 L422 256 M130 160 L180 256 M200 112 L230 256 M300 112 L282 256 M380 160 L332 256 M130 352 L180 256 M200 400 L230 256 M300 400 L282 256 M380 352 L332 256" stroke="#8BC45E" stroke-width="3" opacity="0.6"/>',
         '</g>',
         '<g filter="url(#sh)" transform="rotate(-14 256 256)"><rect x="140" y="170" width="232" height="172" rx="40" fill="url(#masa)" stroke="#B9761A" stroke-width="3"/></g>',
         '<g transform="rotate(-14 256 256)">',
         f'<path d="{blob(256, 256, 54, 4, 0.12, 151)}" fill="#E9C08A" stroke="#A9733E" stroke-width="3"/>',
         '<path d="M222 246 Q246 236 270 248 M232 270 Q256 258 284 268 M240 232 Q262 226 280 236" stroke="#C48E52" stroke-width="4" fill="none" stroke-linecap="round"/>',
         hl('M160 200 C176 186 210 182 240 184', 8, 0.6, '#FFF2C8'),
         '</g>',
         olive(316, 300, 0.9)]
    return frame("".join(b))


@plato('jamon-ingles')
def _():
    def marmol(cx, cy, r, seed):
        random.seed(seed)
        return "".join(f'<path d="M{cx + r*0.7*math.cos(a):.0f} {cy + r*0.7*math.sin(a):.0f} q{random.uniform(-20, 20):.0f} {random.uniform(-14, 14):.0f} {random.uniform(-30, 30):.0f} {random.uniform(-10, 10):.0f}" stroke="#FFD6D2" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.7"/>' for a in [random.uniform(0, 6.28) for _ in range(7)])
    b = ['<g filter="url(#sh)">',
         f'<path d="{blob(220, 230, 138, 4, 0.03, 221)}" fill="#FBE4E0" stroke="#D99A9C" stroke-width="3"/>',
         f'<path d="{blob(220, 230, 122, 4, 0.03, 221)}" fill="url(#ham)"/>', '</g>',
         marmol(220, 230, 110, 222),
         hl('M120 190 C140 150 180 124 220 118', 9, 0.55, '#FFF0EE'),
         # segunda tajada doblada por la mitad
         '<g filter="url(#sh)" transform="rotate(-24 320 330)">',
         '<path d="M196 320 A124 124 0 0 0 444 320Z" fill="#FBE4E0" stroke="#D99A9C" stroke-width="3"/>',
         '<path d="M212 324 A108 108 0 0 0 428 324Z" fill="#E98A90"/>',
         '<path d="M196 320 L444 320" stroke="#C26A72" stroke-width="5" stroke-linecap="round"/>',
         '</g>']
    return frame("".join(b))


@plato('tomate-crudo')
def _():
    b = ['<g filter="url(#sh)"><circle cx="210" cy="226" r="118" fill="url(#tom)" stroke="#8E1A10" stroke-width="3"/></g>',
         '<path d="M210 226 L180 190 L204 206 L196 170 L216 204 L240 176 L226 212 L262 206 L226 226 L248 252 L214 234 L208 268 L200 232 L168 246 L194 224Z" fill="#4E9A2A" stroke="#2C5E18" stroke-width="2.5" stroke-linejoin="round"/>',
         hl('M120 190 C130 150 160 126 190 120', 14, 0.5, '#FFD0C4')]
    for cx, cy in [(350, 340), (250, 380)]:
        b.append(f'<g filter="url(#shs)"><circle cx="{cx}" cy="{cy}" r="58" fill="url(#tom2)" stroke="#8E1A10" stroke-width="3"/>'
                 f'<circle cx="{cx}" cy="{cy}" r="44" fill="#FF8A6E"/>'
                 f'<path d="M{cx} {cy-38} L{cx} {cy+38} M{cx-33} {cy-19} L{cx+33} {cy+19} M{cx-33} {cy+19} L{cx+33} {cy-19}" stroke="#E0402F" stroke-width="6"/>'
                 + "".join(f'<ellipse cx="{cx+24*math.cos(a):.1f}" cy="{cy+24*math.sin(a):.1f}" rx="6" ry="4" fill="#FFE6A8"/>' for a in [0.5, 1.55, 2.6, 3.65, 4.7, 5.75])
                 + '</g>')
    return frame("".join(b))


@plato('tallarines-rojos-con-pollo')
def _():
    return frame(nest(256, 256, 172, 161, '#E85A30', '#8A2410', '#FFB08C', '#A8301A', 42, 13)
                 + drum(270, 236, 50, 0.9, sauce='url(#estof)'))


@plato('tallarines-verdes')
def _():
    return frame(nest(256, 256, 172, 171, '#9CCB55', '#3E6A18', '#E2F5B8', '#4E7F22', 44, 13))


# pollo al horno: 6 versiones
for corte, fn in [('pierna', lambda sk: drum(256, 236, 30, 1.25, sk)),
                  ('entrepierna', lambda sk: thigh(256, 256, -18, 1.2, sk)),
                  ('pecho', lambda sk: breast(256, 256, 20, 1.1, sk))]:
    for sk in (True, False):
        P[f'pollo-al-horno-{corte}-{"con" if sk else "sin"}-piel'] = (lambda f=fn, s=sk: frame(f(s)))


@plato('aji-de-gallina')
def _():
    random.seed(181)
    shreds = "".join(f'<path d="M{x:.0f} {y:.0f} q{random.uniform(-14, 14):.0f} {random.uniform(-10, 10):.0f} {random.uniform(18, 30):.0f} {random.uniform(-6, 6):.0f}" stroke="#F8E3B4" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"/>'
                     for x, y in [(256 + 140*math.sqrt(random.random())*math.cos(a), 262 + 130*math.sqrt(random.random())*math.sin(a)) for a in [random.uniform(0, 6.28) for _ in range(40)]])
    b = [f'<g filter="url(#sh)"><path d="{blob(256, 262, 170, 6, 0.04, 182)}" fill="url(#aji)"/></g>', shreds,
         hl('M120 200 C140 150 190 116 240 110', 10, 0.5, '#FFF4C8'),
         egg_half(196, 230, -20, 0.8), olive(310, 330, 1.25), olive(350, 210, 1.1)]
    return frame("".join(b))


@plato('arroz-con-pollo')
def _():
    b = [f'<g filter="url(#sh)"><path d="{blob(256, 262, 172, 7, 0.05, 191)}" fill="url(#ricegreen)"/></g>',
         dots(256, 262, 160, 200, 192, ['#B4DC7E', '#7EB84A', '#CFE89E'], 7.5, 3.2, '#3E6E1E', 1)]
    random.seed(193)
    for _ in range(8):
        a = random.uniform(0, 6.28); r = 150*math.sqrt(random.random())
        b.append(f'<g filter="url(#shs)"><rect x="{256 + r*math.cos(a)-9:.0f}" y="{262 + r*math.sin(a)-9:.0f}" width="18" height="18" rx="4" fill="#F08A24" stroke="#B85A0C" stroke-width="2"/></g>')
    for _ in range(9):
        a = random.uniform(0, 6.28); r = 150*math.sqrt(random.random())
        b.append(pea(round(256 + r*math.cos(a)), round(262 + r*math.sin(a)), 10))
    b.append(drum(286, 228, 40, 0.95))
    return frame("".join(b))


@plato('estofado-de-pollo')
def _():
    b = [f'<path d="{blob(256, 262, 180, 6, 0.04, 201)}" fill="url(#estof)"/>',
         hl('M110 210 C130 160 180 120 230 112', 8, 0.35, '#FFC8A0'),
         potato_chunk(176, 316, -12, 1.4), potato_chunk(340, 340, 20, 1.3),
         carrot(150, 230, 20), carrot(372, 252, 20), carrot(250, 380, 19), carrot(200, 170, 18),
         pea(320, 400, 11), pea(120, 290, 11), pea(390, 320, 11), pea(270, 150, 11), pea(220, 390, 10),
         drum(270, 240, 54, 1.0, sauce='url(#estof)')]
    return frame("".join(b))


@plato('pan-con-pollo-pan-blanco')
def _():
    random.seed(211)
    fill = ('<g filter="url(#sh)">'
            + f'<path d="{blob(0, 0, 150, 9, 0.08, 212, 1.1, 0.82)}" fill="#7CC440" stroke="#3E7D1E" stroke-width="3"/>'
            + f'<path d="{blob(0, 0, 138, 7, 0.06, 213, 1.08, 0.78)}" fill="#F4DDB6" stroke="#C7A47A" stroke-width="2.5"/>'
            + "".join(f'<path d="M{random.uniform(-140, 120):.0f} {random.uniform(-100, 90):.0f} q12 -6 26 2" stroke="#D6B486" stroke-width="4" fill="none" stroke-linecap="round"/>' for _ in range(30))
            + '</g>')
    # pan abierto: la tapa corrida hacia arriba para que se vea el relleno
    o = (f'<g {T(256, 286, -14, 1.0)}>{fill}</g>'
         + f'<g {T(250, 216, -14, 1.0)}>' + bread_roll(0, 0, 0, 0.92).replace('<path d="M-104 6', '<path opacity="0" d="M-104 6') + '</g>')
    return frame(o)


@plato('pan-con-jamonada-pan-blanco')
def _():
    def slice_(x, y, r):
        random.seed(int(x * 7 + y))
        return (f'<g filter="url(#shs)"><circle cx="{x}" cy="{y}" r="{r}" fill="#F0A6A4" stroke="#C9737A" stroke-width="3"/>'
                + "".join(f'<circle cx="{x + r*0.8*math.sqrt(random.random())*math.cos(a):.1f}" cy="{y + r*0.8*math.sqrt(random.random())*math.sin(a):.1f}" r="3" fill="#FFF2EE"/>' for a in [random.uniform(0, 6.28) for _ in range(14)])
                + '</g>')
    fill = slice_(-90, 10, 80) + slice_(70, 20, 80) + slice_(0, 40, 78)
    o = (f'<g {T(256, 296, -14, 1.0)}>{fill}</g>'
         + f'<g {T(250, 210, -14, 1.0)}>' + bread_roll(0, 0, 0, 0.92).replace('<path d="M-104 6', '<path opacity="0" d="M-104 6') + '</g>')
    return frame(o)


# La muestra aprobada por Jonah, tal cual.
P['pollo-a-la-brasa-con-papas-y-ensalada'] = _ns['pollo']


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for slug, fn in P.items():
        if SOLO and slug not in SOLO:
            continue
        with open(os.path.join(OUT, slug + '.svg'), 'w') as f:
            f.write(fn())
        n += 1
    print(n, 'svg')
