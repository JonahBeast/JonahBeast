"""Genera los SVG de las 3 muestras de platos (vista desde arriba, estilo plano con volumen sutil)."""
import math, random, sys, os

OUT = sys.argv[1]

DEFS = """
<defs>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%">
    <stop offset="70%" stop-color="#E8590C" stop-opacity="0"/>
    <stop offset="88%" stop-color="#E8590C" stop-opacity="0.22"/>
    <stop offset="100%" stop-color="#E8590C" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="rim" cx="45%" cy="40%" r="60%">
    <stop offset="0%" stop-color="#5A4E40"/>
    <stop offset="100%" stop-color="#3A3026"/>
  </radialGradient>
  <radialGradient id="well" cx="42%" cy="38%" r="65%">
    <stop offset="0%" stop-color="#352A1F"/>
    <stop offset="100%" stop-color="#211810"/>
  </radialGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#0B0705" flood-opacity="0.55"/>
  </filter>
  <filter id="shs" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#0B0705" flood-opacity="0.45"/>
  </filter>
  <filter id="plateSh" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity="0.6"/>
  </filter>
  <!-- arroz -->
  <radialGradient id="rice" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#FFFFFF"/>
    <stop offset="70%" stop-color="#F5EFE2"/>
    <stop offset="100%" stop-color="#DCD2BF"/>
  </radialGradient>
  <!-- carne -->
  <linearGradient id="beef" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#9A4E26"/>
    <stop offset="100%" stop-color="#5E2A12"/>
  </linearGradient>
  <!-- papa frita -->
  <linearGradient id="fry" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#FFE08A"/>
    <stop offset="55%" stop-color="#F7C54E"/>
    <stop offset="100%" stop-color="#D99A2B"/>
  </linearGradient>
  <!-- tomate -->
  <radialGradient id="tom" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#FF6A4D"/>
    <stop offset="100%" stop-color="#C8261B"/>
  </radialGradient>
  <!-- cebolla roja -->
  <linearGradient id="oni" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#C2508F"/>
    <stop offset="100%" stop-color="#7E2A5E"/>
  </linearGradient>
  <!-- pescado -->
  <linearGradient id="fish" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FFFFFF"/>
    <stop offset="100%" stop-color="#E6DFD2"/>
  </linearGradient>
  <!-- camote -->
  <radialGradient id="cam" cx="45%" cy="40%" r="65%">
    <stop offset="0%" stop-color="#FFB25A"/>
    <stop offset="100%" stop-color="#E9761C"/>
  </radialGradient>
  <!-- choclo -->
  <radialGradient id="kern" cx="40%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#FFF6CF"/>
    <stop offset="100%" stop-color="#EBD48A"/>
  </radialGradient>
  <!-- lechuga -->
  <radialGradient id="let" cx="50%" cy="50%" r="60%">
    <stop offset="0%" stop-color="#C9EE7E"/>
    <stop offset="100%" stop-color="#5FA82E"/>
  </radialGradient>
  <!-- pollo a la brasa -->
  <radialGradient id="chick" cx="42%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#E7A24A"/>
    <stop offset="60%" stop-color="#B8611D"/>
    <stop offset="100%" stop-color="#7A3510"/>
  </radialGradient>
  <!-- pepino -->
  <radialGradient id="cuc" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#F1F8D8"/>
    <stop offset="62%" stop-color="#CFE7A3"/>
    <stop offset="80%" stop-color="#9CCB63"/>
    <stop offset="100%" stop-color="#2F6B23"/>
  </radialGradient>
  <!-- jugos -->
  <radialGradient id="jugo" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#6B3416" stop-opacity="0.95"/>
    <stop offset="100%" stop-color="#4A230E" stop-opacity="0.85"/>
  </radialGradient>
  <radialGradient id="leche" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#F3EEDC" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="#E8E0C8" stop-opacity="0.12"/>
  </radialGradient>
</defs>
"""


DEFS2 = """
<defs>
  <radialGradient id="chick2" cx="40%" cy="32%" r="75%">
    <stop offset="0%" stop-color="#F6C46E"/>
    <stop offset="35%" stop-color="#D98A32"/>
    <stop offset="75%" stop-color="#A9501A"/>
    <stop offset="100%" stop-color="#6E2C0C"/>
  </radialGradient>
  <linearGradient id="fry2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#FFE7A0"/>
    <stop offset="50%" stop-color="#F6C24C"/>
    <stop offset="100%" stop-color="#D4922A"/>
  </linearGradient>
  <linearGradient id="beef2" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0%" stop-color="#A65A2E"/>
    <stop offset="55%" stop-color="#7A3A1A"/>
    <stop offset="100%" stop-color="#4E220D"/>
  </linearGradient>
  <radialGradient id="tom2" cx="50%" cy="20%" r="85%">
    <stop offset="0%" stop-color="#FF7A5C"/>
    <stop offset="60%" stop-color="#E5352A"/>
    <stop offset="100%" stop-color="#A91E15"/>
  </radialGradient>
  <radialGradient id="let2" cx="45%" cy="40%" r="65%">
    <stop offset="0%" stop-color="#E4FAA6"/>
    <stop offset="55%" stop-color="#9CD34F"/>
    <stop offset="100%" stop-color="#4F9426"/>
  </radialGradient>
</defs>
"""


def frame(body, k=1.0):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
{DEFS}{DEFS2}
<rect width="512" height="512" rx="112" fill="#16110D"/>
<circle cx="256" cy="256" r="254" fill="url(#halo)"/>
<circle cx="256" cy="256" r="236" fill="none" stroke="#E8590C" stroke-width="5" stroke-opacity="0.9"/>
<g filter="url(#plateSh)"><circle cx="256" cy="256" r="224" fill="url(#rim)"/></g>
<circle cx="256" cy="256" r="224" fill="none" stroke="#6B6255" stroke-width="2" stroke-opacity="0.5"/>
<circle cx="256" cy="256" r="204" fill="url(#well)"/>
<path d="M98 196 A168 168 0 0 1 206 92" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="10" stroke-linecap="round"/>
<g transform="translate(256 256) scale({k}) translate(-256 -256)">
{body}
</g>
</svg>"""


def blob(cx, cy, R, n, amp, seed, sx=1.0, sy=1.0, rot=0):
    """Contorno ondulado (lechuga, montículos)."""
    random.seed(seed)
    pts = []
    N = 72
    ph = random.uniform(0, 6.28)
    for i in range(N):
        t = 2*math.pi*i/N
        r = R*(1 + amp*math.sin(n*t + ph) + amp*0.4*math.sin((n*2+1)*t))
        x = r*math.cos(t)*sx; y = r*math.sin(t)*sy
        c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        pts.append((cx + x*c - y*s_, cy + x*s_ + y*c))
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f} " + " ".join(f"L{x:.1f} {y:.1f}" for x, y in pts[1:]) + "Z"
    return d


def fry(x, y, ang, L=96, W=21):
    return (f'<g transform="translate({x} {y}) rotate({ang})" filter="url(#shs)">'
            f'<rect x="{-L/2}" y="{-W/2}" width="{L}" height="{W}" rx="5" fill="url(#fry2)" stroke="#B37419" stroke-width="2"/>'
            f'<rect x="{-L/2+7}" y="{-W/2+3.5}" width="{L-22}" height="4" rx="2" fill="#FFF5CF" opacity="0.85"/>'
            f'<rect x="{L/2-12}" y="{-W/2+2}" width="9" height="{W-4}" rx="3" fill="#C98322" opacity="0.55"/></g>')


def tomato_wedge(x, y, ang, s=1.0):
    return (f'<g transform="translate({x} {y}) rotate({ang}) scale({s})" filter="url(#shs)">'
            f'<path d="M-44 -6 C-32 34 32 34 44 -6 C22 4 -22 4 -44 -6Z" fill="url(#tom2)" stroke="#8E1A10" stroke-width="2.5"/>'
            f'<path d="M-32 0 C-16 12 16 12 32 0 C16 6 -16 6 -32 0Z" fill="#FF9C7E"/>'
            f'<ellipse cx="-14" cy="6" rx="4" ry="2.6" fill="#FFE6A8"/>'
            f'<ellipse cx="0" cy="8" rx="4" ry="2.6" fill="#FFE6A8"/>'
            f'<ellipse cx="14" cy="6" rx="4" ry="2.6" fill="#FFE6A8"/>'
            f'<path d="M-26 18 C-10 26 10 26 24 19" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="4" stroke-linecap="round"/></g>')


def onion(x, y, ang, L=74, bend=20, w=13):
    return (f'<g transform="translate({x} {y}) rotate({ang})" filter="url(#shs)">'
            f'<path d="M{-L/2} 0 Q0 {-bend*2} {L/2} 0" fill="none" stroke="#7A2459" stroke-width="{w+3}" stroke-linecap="round"/>'
            f'<path d="M{-L/2} 0 Q0 {-bend*2} {L/2} 0" fill="none" stroke="#B4428A" stroke-width="{w}" stroke-linecap="round"/>'
            f'<path d="M{-L/2+3} 2 Q0 {-bend*2+3} {L/2-3} 2" fill="none" stroke="#F3D3E6" stroke-width="{w*0.38:.1f}" stroke-linecap="round"/></g>')


def beef(x, y, ang, w=66, h=40):
    return (f'<g transform="translate({x} {y}) rotate({ang})" filter="url(#sh)">'
            f'<path d="M{-w/2} {-h/2+7} Q{-w/2+3} {-h/2} {-w/2+13} {-h/2+1} L{w/2-9} {-h/2+3} Q{w/2} {-h/2+6} {w/2-1} {-h/2+15} L{w/2-5} {h/2-5} Q{w/2-10} {h/2} {w/2-19} {h/2} L{-w/2+10} {h/2-3} Q{-w/2} {h/2-7} {-w/2+2} {h/2-15}Z" fill="url(#beef2)" stroke="#3A1607" stroke-width="2"/>'
            f'<path d="M{-w/2+11} {-h/2+8} L{w/2-14} {-h/2+10}" stroke="#D79664" stroke-width="5" stroke-linecap="round" opacity="0.7"/>'
            f'<path d="M{-w/2+12} 5 Q0 2 {w/2-16} 8" stroke="#3A1607" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/></g>')


# ---------------- 1. LOMO SALTADO CON ARROZ ----------------
def lomo():
    b = []
    # jugo del saltado bajo la mezcla
    b.append(f'<path d="{blob(316, 226, 128, 5, 0.06, 11, 1.0, 0.9, -20)}" fill="url(#jugo)"/>')
    # arroz moldeado al costado
    b.append('<g filter="url(#sh)"><circle cx="164" cy="326" r="84" fill="url(#rice)"/></g>')
    random.seed(3)
    for _ in range(60):
        a = random.uniform(0, 2*math.pi); r = 74*math.sqrt(random.random())
        x = 164 + r*math.cos(a); y = 326 + r*math.sin(a); t = random.uniform(0, 180)
        b.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="6.5" ry="2.8" transform="rotate({t:.0f} {x:.1f} {y:.1f})" fill="#FFFFFF" stroke="#D3C7AE" stroke-width="1.3"/>')
    b.append('<path d="M112 290 A62 62 0 0 1 168 260" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity="0.95"/>')
    # papas fritas mezcladas
    b += [fry(352, 318, -30, 100), fry(270, 140, 14, 92), fry(404, 214, 80, 96), fry(300, 262, 48, 90),
          fry(236, 216, -70, 84), fry(336, 196, -8, 88), fry(384, 300, 40, 80)]
    # carne
    b += [beef(318, 158, -14), beef(262, 240, 24, 62, 38), beef(358, 266, -36), beef(304, 340, 10, 60, 36),
          beef(384, 160, 40, 56, 34), beef(300, 214, 70, 58, 36), beef(250, 304, -20, 56, 34), beef(406, 268, 80, 54, 32)]
    # cebolla roja en tiras
    b += [onion(354, 212, 30, 70, 9), onion(244, 274, -60, 66, 9), onion(296, 244, 120, 62, 9),
          onion(400, 300, -80, 60, 9), onion(268, 176, -150, 60, 9), onion(338, 300, 10, 60, 9), onion(366, 118, -20, 54, 8)]
    # tomate en gajos
    b += [tomato_wedge(268, 200, -25), tomato_wedge(394, 236, 70, 0.95), tomato_wedge(326, 290, 160, 0.95),
          tomato_wedge(330, 122, 5, 0.85), tomato_wedge(282, 330, -150, 0.85)]
    return frame("\n".join(b), 1.1)


# ---------------- 2. CEVICHE DE PESCADO ----------------
def lettuce(cx, cy, R, seed, sx, sy, rot, veins=True):
    out = [f'<g filter="url(#sh)"><path d="{blob(cx, cy, R, 11, 0.07, seed, sx, sy, rot)}" fill="url(#let2)" stroke="#3E7D1E" stroke-width="3" stroke-linejoin="round"/>']
    if veins:
        c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        def P(x, y): return (cx + x*c - y*s_, cy + x*s_ + y*c)
        a, bb = P(-R*sx*0.85, 0), P(R*sx*0.85, 0)
        out.append(f'<path d="M{a[0]:.1f} {a[1]:.1f} L{bb[0]:.1f} {bb[1]:.1f}" stroke="#F1FBD0" stroke-width="5" stroke-linecap="round"/>')
        for t in (-0.5, -0.1, 0.3):
            p0 = P(R*sx*t, 0)
            for sg in (-1, 1):
                p1 = P(R*sx*(t+0.28), sg*R*sy*0.6)
                out.append(f'<path d="M{p0[0]:.1f} {p0[1]:.1f} L{p1[0]:.1f} {p1[1]:.1f}" stroke="#E6F7B8" stroke-width="3" stroke-linecap="round"/>')
    out.append('</g>')
    return "".join(out)


def fish_cube(x, y, ang, s=42):
    h = s/2
    return (f'<g transform="translate({x} {y}) rotate({ang})" filter="url(#shs)">'
            f'<rect x="{-h}" y="{-h}" width="{s}" height="{s}" rx="8" fill="url(#fish)" stroke="#BDB3A0" stroke-width="2"/>'
            f'<path d="M{-h+7} {-h+8} L{h-9} {-h+7}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>'
            f'<path d="M{-h+8} {h-10} Q0 {h-16} {h-8} {h-12}" stroke="#DDD3C2" stroke-width="2.2" fill="none"/></g>')


def ceviche():
    b = []
    b.append(lettuce(170, 172, 76, 5, 1.25, 0.82, -40))
    b.append('<ellipse cx="262" cy="270" rx="132" ry="118" fill="url(#leche)"/>')
    # camote en rodaja
    b.append('<g filter="url(#sh)"><circle cx="362" cy="352" r="60" fill="url(#cam)" stroke="#B3540E" stroke-width="6"/>'
             '<circle cx="362" cy="352" r="44" fill="none" stroke="#FFCB8C" stroke-width="3" opacity="0.8"/>'
             '<path d="M326 326 A42 42 0 0 1 358 308" stroke="#FFE4BE" stroke-width="7" stroke-linecap="round" fill="none"/></g>')
    # choclo
    k = ['<g transform="translate(372 176) rotate(-32)" filter="url(#sh)">',
         '<rect x="-72" y="-38" width="144" height="76" rx="34" fill="#D6B656" stroke="#A3852F" stroke-width="3"/>']
    for row in range(4):
        for col in range(8):
            cx = -56 + col*17 + (8 if row % 2 else 0)
            cy = -25 + row*16.5
            if abs(cx) > 62 or (abs(cx) > 50 and abs(cy) > 20): continue
            k.append(f'<rect x="{cx-8}" y="{cy-7}" width="16" height="14" rx="5.5" fill="url(#kern)" stroke="#C4A247" stroke-width="1.2"/>')
    k.append('<path d="M-50 -29 L46 -29" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="3.5" stroke-linecap="round"/></g>')
    b.append("".join(k))
    cubes = [(206, 262, 10), (246, 244, -12), (288, 236, 18), (324, 262, -8), (226, 300, -20),
             (268, 284, 6), (310, 302, 24), (192, 336, 14), (238, 340, -6), (282, 330, -16),
             (258, 376, 8), (218, 380, -14), (300, 368, 20), (262, 252, 34)]
    for x, y, a in cubes:
        b.append(fish_cube(x, y, a))
    b += [onion(246, 252, 20, 74, 20, 12), onion(296, 290, -30, 78, 22, 12),
          onion(222, 322, 70, 64, 18, 12), onion(300, 244, 110, 60, 16, 11),
          onion(262, 352, -5, 66, 16, 11), onion(212, 278, -40, 52, 14, 10)]
    return frame("\n".join(b), 1.1)


# ---------------- 3. POLLO A LA BRASA (1/4) ----------------
def pollo():
    b = []
    # ensalada: lechuga + tomate + pepino
    b.append(lettuce(338, 168, 86, 9, 1.0, 0.86, 10, veins=False))
    b.append('<path d="M272 150 Q330 176 404 168 M300 104 Q324 160 330 238 M282 208 Q340 200 400 132" stroke="#E6F7B8" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85"/>')
    for cx, cy in [(316, 152), (374, 206)]:
        b.append(f'<g filter="url(#shs)"><circle cx="{cx}" cy="{cy}" r="30" fill="url(#tom2)" stroke="#8E1A10" stroke-width="2.5"/>'
                 f'<circle cx="{cx}" cy="{cy}" r="20" fill="#FF9C7E"/>'
                 f'<path d="M{cx} {cy-16} L{cx} {cy+16} M{cx-14} {cy-8} L{cx+14} {cy+8} M{cx-14} {cy+8} L{cx+14} {cy-8}" stroke="#E0402F" stroke-width="3.5"/>'
                 + "".join(f'<ellipse cx="{cx+11*math.cos(a):.1f}" cy="{cy+11*math.sin(a):.1f}" rx="3" ry="2" fill="#FFE6A8"/>' for a in [0.5, 1.55, 2.6, 3.65, 4.7, 5.75])
                 + f'<path d="M{cx-20} {cy-13} A24 24 0 0 1 {cx-4} {cy-24}" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="4" fill="none" stroke-linecap="round"/></g>')
    for cx, cy in [(370, 146), (318, 218), (282, 178)]:
        b.append(f'<g filter="url(#shs)"><circle cx="{cx}" cy="{cy}" r="25" fill="url(#cuc)"/>'
                 + "".join(f'<ellipse cx="{cx+9*math.cos(a):.1f}" cy="{cy+9*math.sin(a):.1f}" rx="2.6" ry="1.6" fill="#EEF6D2" stroke="#B0D27E" stroke-width="0.8"/>' for a in [0.3, 1.9, 3.5, 5.1])
                 + '</g>')
    # papas fritas en montón
    b += [fry(330, 384, -12, 104), fry(366, 320, 22, 100), fry(300, 344, 58, 92), fry(394, 360, -64, 92),
          fry(340, 300, -40, 88), fry(280, 388, 28, 86), fry(372, 394, 8, 84), fry(314, 316, 6, 88),
          fry(350, 350, 80, 84), fry(404, 318, 30, 76), fry(322, 360, -30, 82), fry(286, 304, -70, 70)]
    # cuarto de pollo (pierna: encuentro + pierna)
    b.append('<g filter="url(#sh)" transform="translate(4 6) rotate(-22 196 262)">'
             '<path d="M106 226 C104 162 164 132 226 146 C280 158 304 208 294 256 C284 306 234 340 184 334 C134 328 108 284 106 226Z" fill="url(#chick2)" stroke="#4E1E07" stroke-width="3"/>'
             '<path d="M200 316 C216 352 220 384 214 404 C208 422 184 424 176 408 C164 384 154 350 154 322Z" fill="url(#chick2)" stroke="#4E1E07" stroke-width="3"/>'
             '<circle cx="186" cy="418" r="12" fill="#F6EAD3" stroke="#C9B99C" stroke-width="2"/>'
             '<circle cx="202" cy="414" r="10" fill="#F6EAD3" stroke="#C9B99C" stroke-width="2"/>'
             # marcas de la brasa
             '<path d="M150 296 Q170 300 186 292" stroke="#5A2209" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.55"/>'
             '<path d="M244 258 Q262 250 272 234" stroke="#5A2209" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.5"/>'
             '<path d="M128 254 Q134 274 146 286" stroke="#5A2209" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.45"/>'
             '<path d="M188 380 Q196 390 200 400" stroke="#5A2209" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.45"/>'
             # piel crocante: puntitos de brillo
             + "".join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{rx*0.6:.1f}" fill="#FFE2A0" opacity="0.7"/>' for x, y, rx in
                       [(170, 196, 5), (196, 186, 4), (222, 200, 5), (184, 222, 3.5), (240, 222, 4), (154, 232, 3.5), (206, 248, 3), (262, 206, 3.5)])
             + '<path d="M138 210 C150 178 190 162 226 168" stroke="#FFE1A0" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.8"/>'
             '<path d="M174 330 C180 350 186 368 188 384" stroke="#FFD58A" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.6"/>'
             '</g>')
    return frame("\n".join(b), 1.1)


for name, fn in [("lomo-saltado-con-arroz", lomo), ("ceviche-de-pescado", ceviche),
                 ("pollo-a-la-brasa-con-papas-y-ensalada", pollo)]:
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(fn())
print("ok")
