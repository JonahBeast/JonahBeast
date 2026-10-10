# Desgaste "vintage" del diseño 3 (poros en la tinta). Uso: python3 distress.py archivo.png [semilla] [fuerza] [escala]
from PIL import Image, ImageFilter
import numpy as np, sys
f=sys.argv[1]; rng=np.random.default_rng(int(sys.argv[2]) if len(sys.argv)>2 else 7)
im=Image.open(f).convert('RGBA'); a=np.asarray(im).copy(); H,W=a.shape[:2]
s=float(sys.argv[4]) if len(sys.argv)>4 else 1.0
def capa(cel,blur):
    n=Image.fromarray((rng.random((max(2,H//cel),max(2,W//cel)))*255).astype('uint8')).resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(n).astype(float)/255
manchas=capa(int(60*s),8*s)*0.6+capa(int(14*s),2*s)*0.4   # manchas medianas
grano=capa(3,0.6)                        # grano fino
k=float(sys.argv[3]) if len(sys.argv)>3 else 1.0
hueco=((manchas>0.62+0.08/k)&(grano>0.5))|((grano>0.97)&(manchas>0.55))
a[...,3]=np.where(hueco,0,a[...,3]).astype('uint8')
Image.fromarray(a).save(f,dpi=(300,300))
print(f, round(hueco.mean()*100,1),'% de poros')
