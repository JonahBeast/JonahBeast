from PIL import Image, ImageFilter, ImageDraw
import numpy as np, sys
src=Image.open('/home/user/JonahBeast/public/jonah-avatar.png').convert('RGB')
a=np.asarray(src).astype(float); L=a.mean(2)
r,g,b=a[...,0],a[...,1],a[...,2]
cand=(L>95).astype('uint8')*255
m=Image.fromarray(cand).copy()
for p in [(0,0),(199,0),(0,100),(199,100)]: ImageDraw.floodfill(m,p,128)
bg=(np.asarray(m)==128)
K=int(sys.argv[1]); W=200*K; out=sys.argv[2]
def up(arr,blur):
    im=Image.fromarray(np.clip(arr,0,255).astype('uint8')).resize((W,W),Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(float)
fg=up((~bg)*255.0,K*0.9)>128
Lu=up(L,K*0.35)
orange=((r-b)>70)&(r>150); box=np.zeros_like(orange); box[25:95,70:135]=True; orange=orange&box
oru=up(orange*255.0,K*0.45)>128
om=Image.fromarray((oru*255).astype('uint8')).filter(ImageFilter.MinFilter(K+1)).filter(ImageFilter.MaxFilter(K+1)).filter(ImageFilter.GaussianBlur(K*0.4))
oru=np.asarray(om)>128
lines=(Lu<70)&fg
o=np.zeros((W,W,4),'uint8')
o[fg]=[247,242,231,255]; o[oru&fg&~lines]=[232,89,12,255]; o[lines]=[22,17,13,255]
Image.fromarray(o).save(out)
