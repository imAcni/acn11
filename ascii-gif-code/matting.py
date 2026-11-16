import cv2
import numpy as np
from PIL import Image
cv2.setNumThreads(1)

def subject_mask(frame):
    rgb=np.asarray(frame)
    crop=rgb[130:362,188:346].copy()
    r,g,b=crop[:,:,0].astype(int),crop[:,:,1].astype(int),crop[:,:,2].astype(int)
    h,w=r.shape
    mask=np.full((h,w),cv2.GC_PR_BGD,np.uint8)
    yy,xx=np.indices((h,w))
    body=((xx-80)/58)**2+((yy-136)/90)**2 < 1
    mask[body]=cv2.GC_PR_FGD
    gray=(abs(r-106)<=5)&(abs(g-107)<=5)&(abs(b-105)<=5)
    face=(r>=20)&(r<=55)&(g>=r+4)&(b>=r+4)&(yy>75)&(yy<177)
    # The two main flat fill colors give stable, unambiguous foreground seeds.
    mask[gray|face]=cv2.GC_FGD
    warm=(r-g>3)&(r-b>8)
    face_region=(xx>=28)&(xx<=127)&(yy>=105)&(yy<=178)
    mask[warm & ~face_region]=cv2.GC_BGD
    mask[:8,:]=cv2.GC_BGD;mask[-6:,:]=cv2.GC_BGD
    mask[:,:6]=cv2.GC_BGD;mask[:,-6:]=cv2.GC_BGD
    background=np.zeros((1,65),np.float64);foreground=np.zeros((1,65),np.float64)
    cv2.grabCut(crop,mask,None,background,foreground,4,cv2.GC_INIT_WITH_MASK)
    out=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    # Remove small disconnected floor flecks while retaining the floating tuft.
    count,labels,stats,centroids=cv2.connectedComponentsWithStats(out)
    clean=np.zeros_like(out)
    for n in range(1,count):
        if stats[n,cv2.CC_STAT_AREA]>=90: clean[labels==n]=255
    full=np.zeros(rgb.shape[:2],np.uint8);full[130:362,188:346]=clean
    return Image.fromarray(full)

if __name__=='__main__':
    from PIL import ImageDraw,ImageSequence
    source=Image.open('source.gif');frames=[f.convert('RGB').copy() for f in ImageSequence.Iterator(source)]
    contact=Image.new('RGB',(1000,990),'#20242a')
    for k,n in enumerate([0,10,23,34,46,57,69,80,76]):
        mask=subject_mask(frames[n]);im=Image.new('RGB',frames[n].size,'#101822');im.paste(frames[n],mask=mask)
        crop=im.crop((162,114,378,384));x=(k%3)*333;y=(k//3)*330
        contact.paste(crop,(x,y+20));ImageDraw.Draw(contact).text((x+8,y),str(n),fill='white')
    contact.save('mask-grabcut.png')
