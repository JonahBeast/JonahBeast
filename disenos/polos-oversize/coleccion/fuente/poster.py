from PIL import Image, ImageFilter
import numpy as np, sys
src=Image.open('/home/user/JonahBeast/public/logo-marca.webp').convert('RGBA')
a=np.asarray(src).astype(float); al=a[...,3]
rgb=a[...,:3]; L=rgb.mean(2); r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
K=int(sys.argv[1]); W,H=400*K,480*K; out=sys.argv[2]
def up(arr,blur):
    im=Image.fromarray(np.clip(arr,0,255).astype('uint8')).resize((W,H),Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(float)
A=up(al,K*0.6)>128
Lu=up(L,K*0.35)
fire=up(np.clip((r-b-60)*3,0,255),K*0.45)>128
bright=Lu>175
o=np.zeros((H,W,4),'uint8')
mode=sys.argv[3] if len(sys.argv)>3 else 'a'
CAR=[22,17,13,255];AJI=[232,89,12,255];CRE=[247,242,231,255]
o[A]=CRE if mode=='a' else CAR
o[A&fire]=AJI
o[A&(Lu<int(sys.argv[4]) if len(sys.argv)>4 else Lu<70)]=CAR
o[A&bright]=CRE
Image.fromarray(o).save(out)
