#!/usr/bin/env python3
"""Render a GIF as twelve character-art variations using qequ/asciinator.

The upstream image_to_ascii function performs brightness-to-character mapping.
This wrapper adds font aspect correction, color, crops, edge art, and GIF export.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageSequence

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'vendor/asciinator/asciinator'))
from asciinator.transformers import image_to_ascii

FONT = str(ROOT / 'fonts/DejaVuSansMono.ttf')
BOLD = str(ROOT / 'fonts/DejaVuSansMono-Bold.ttf')
CROP = (162, 114, 378, 384)
UPSTREAM_RAMP = '@%#*+=-:. '

STYLES = [
    dict(id='01-classic-scene', name='Classic / full scene', desc='White ASCII on black; the complete scene.', cols=96, size=12, crop=False, mode='mono', ramp=' .:-=+*#%@', fg=(242,245,248), bg=(8,10,14)),
    dict(id='02-classic-closeup', name='Classic / close-up', desc='A closer view with large, bright text.', cols=64, size=14, crop=True, mode='mono', ramp=' .:-=+*#%@', fg=(245,247,250), bg=(8,10,14)),
    dict(id='03-color-scene', name='Original color / full scene', desc='The complete scene rendered in its original colors.', cols=100, size=12, crop=False, mode='color', ramp=' .:-=+*#%@', bg=(6,8,12)),
    dict(id='04-color-closeup', name='Original color / close-up', desc='Detailed colored characters with the glowing eyes preserved.', cols=72, size=14, crop=True, mode='color', ramp=' .:-=+*#%@', bg=(6,8,12)),
    dict(id='05-green-terminal', name='Green terminal', desc='Green phosphor text with a restrained CRT glow.', cols=64, size=14, crop=True, mode='mono', ramp=' .,:;ox%#@', fg=(91,255,139), bg=(2,13,7), glow=True),
    dict(id='06-amber-terminal', name='Amber terminal', desc='Warm amber symbols on a dark brown background.', cols=56, size=16, crop=True, mode='mono', ramp=' .,:;ox%#@', fg=(255,194,82), bg=(18,10,3), glow=True),
    dict(id='07-ink-on-paper', name='Ink on paper', desc='Dark typewriter-style text on warm paper.', cols=64, size=14, crop=True, mode='mono', ramp=' .:-=+*#%@', fg=(34,30,25), bg=(246,239,219), ink=True),
    dict(id='08-binary', name='Binary / 0 and 1', desc='The animation rebuilt entirely from zeros and ones.', cols=64, size=14, crop=True, mode='binary', ramp=' .:-=+*#%@', bg=(3,9,15)),
    dict(id='09-cyan-outline', name='Cyan outline', desc='Directional ASCII strokes trace the character and scene edges.', cols=64, size=14, crop=True, mode='edge', ramp=' .:-=+*#%@', bg=(3,12,20), glow=True),
    dict(id='10-neon-duotone', name='Neon / pink and cyan', desc='A fixed pink-to-cyan diagonal gradient over dense ASCII.', cols=64, size=14, crop=True, mode='neon', ramp=' .,:;ox%#@', bg=(12,4,22), glow=True),
    dict(id='11-chunky', name='Chunky / low detail', desc='A deliberately coarse grid with large, bold characters.', cols=36, size=24, crop=True, mode='mono', ramp=' .:-=+*#%@', fg=(240,244,255), bg=(11,14,22), bold=True),
    dict(id='12-dot-matrix', name='Dot matrix', desc='Sparse punctuation in pale blue, like a tiny dot display.', cols=58, size=16, crop=True, mode='dots', ramp=' .:-=+*#%@', bg=(5,10,22)),
]

for style in STYLES:
    if style['crop'] and style['id'] != '02-classic-closeup':
        style['isolate'] = True
    if style['mode'] == 'color' or style.get('ink'):
        style['bold'] = True


from matting import subject_mask


def load_source(path):
    im = Image.open(path)
    frames, durations = [], []
    for frame in ImageSequence.Iterator(im):
        durations.append(frame.info.get('duration', 100))
        frames.append(frame.convert('RGB').copy())
    return frames, durations


def glyph_atlas(size, bold=False):
    font = ImageFont.truetype(BOLD if bold else FONT, size)
    cw = math.ceil(font.getlength('M'))
    ch = size + 2
    atlas = []
    bbox = font.getbbox('Ag')
    y = (ch - (bbox[3] - bbox[1])) // 2 - bbox[1]
    for code in range(128):
        im = Image.new('L', (cw, ch))
        if code >= 32:
            ImageDraw.Draw(im).text(((cw-font.getlength(chr(code)))/2, y), chr(code), font=font, fill=255)
        atlas.append(np.asarray(im))
    return np.stack(atlas), cw, ch


def ascii_levels(lum):
    # Asciinator's public converter accepts a file-like object. Resizing has
    # already accounted for glyph aspect ratio. The two sentinel pixels make
    # upstream min/max normalization stable across animation frames; they are
    # restored in the resulting grid, so no visible sentinel is exported.
    grid = np.clip(np.rint(lum), 0, 255).astype(np.uint8)
    patched = grid.copy()
    patched[0, 0], patched[0, -1] = 0, 255
    buf = io.BytesIO()
    Image.fromarray(patched).save(buf, format='PNG')
    buf.seek(0)
    text = image_to_ascii(buf, output_width=grid.shape[1])
    lines = text.splitlines()
    raw = np.array([[UPSTREAM_RAMP.index(c) for c in line] for line in lines], dtype=np.uint8)
    # Upstream truncates floating point values and uses a dark-to-light ramp.
    raw[0, 0] = int(grid[0, 0]) * 9 // 255
    raw[0, -1] = int(grid[0, -1]) * 9 // 255
    return raw


def render(frame, style, atlas, cw, ch, frame_index, mask=None):
    source = frame.crop(CROP) if style['crop'] else frame
    cols = style['cols']
    rows = round(source.height / source.width * cols * cw / ch)
    small = source.resize((cols, rows), Image.Resampling.LANCZOS)
    rgb = np.array(small, dtype=np.float32)
    gray = np.array(small.convert('L'), dtype=np.float32)
    alpha = None
    if style.get('isolate'):
        alpha = np.array(mask.crop(CROP).resize((cols,rows),Image.Resampling.LANCZOS),dtype=np.float32)/255
    # Fixed tone curve avoids frame-by-frame exposure pumping.
    tone = np.clip((gray - 12) / (132 if style.get('isolate') and not style.get('ink') else 216), 0, 1) ** .84
    if style.get('ink'):
        tone = 1 - tone
    levels = ascii_levels(tone * 255)
    ramp = np.array([ord(c) for c in style['ramp']], dtype=np.uint8)
    chars = ramp[levels]
    bg = np.array(style['bg'], dtype=np.float32)
    mode = style['mode']
    colors = np.zeros((rows, cols, 3), dtype=np.float32)
    if mode == 'mono':
        colors[:] = style['fg']
    elif mode == 'color':
        # Lift the source shadows so small antialiased glyphs remain legible.
        colors = np.clip((rgb / 255) ** .58 * 315, 0, 255)
        # Color encodes shade too, so maintain coverage in the darker subject.
        dense = np.maximum(levels, 3)
        chars = ramp[dense]
    elif mode == 'binary':
        yy, xx = np.indices((rows, cols))
        chars = np.where((xx * 17 + yy * 11) % 5 < 2, ord('1'), ord('0')).astype(np.uint8)
        strength = .04 + .96 * tone ** 1.25
        colors = np.stack([50*strength, 213*strength, 255*strength], axis=-1)
    elif mode == 'neon':
        yy, xx = np.indices((rows, cols))
        t = np.clip((xx/(cols-1)*.6 + yy/(rows-1)*.4), 0, 1)[...,None]
        colors = np.array([255,72,213])*(1-t) + np.array([64,239,255])*t
    elif mode == 'edge':
        # Direction of the edge tangent selects an ASCII stroke. Add very faint
        # dot shading to retain the character's broad volumes between contours.
        smooth = np.array(small.convert('L').filter(ImageFilter.GaussianBlur(.35)), dtype=np.float32)
        gy, gx = np.gradient(smooth)
        strength = np.clip(np.hypot(gx,gy)/28, 0, 1)
        angle = (np.arctan2(gy,gx) + np.pi/2) % np.pi
        sector = (np.rint(angle/(np.pi/4)).astype(int)) % 4
        strokes = np.array([ord('-'), ord('\\'), ord('|'), ord('/')], dtype=np.uint8)
        chars = strokes[sector]
        chars[strength < .22] = ord('.')
        colors = np.array([102,239,255])[None,None,:] * np.where(strength < .22, .12+tone*.11, .45+.55*strength)[...,None]
    elif mode == 'dots':
        dots = np.array([ord(c) for c in ' .:oO'], dtype=np.uint8)
        chars = dots[np.minimum((tone*4.99).astype(int),4)]
        colors[:] = (169,217,255)
    if alpha is not None:
        chars[alpha < .45] = ord(' ')
        colors = bg + np.clip(alpha*1.5,0,1)[...,None]*(colors-bg)
    masks = atlas[chars].transpose(0,2,1,3).reshape(rows*ch,cols*cw).astype(np.float32)/255
    full_colors = np.repeat(np.repeat(colors,ch,axis=0),cw,axis=1)
    pixels = bg + masks[...,None]*(full_colors-bg)
    result = Image.fromarray(np.clip(pixels,0,255).astype(np.uint8))
    if style.get('glow'):
        blurred = np.array(result.filter(ImageFilter.GaussianBlur(1.25)), dtype=np.float32)
        result = Image.fromarray(np.clip(np.array(result,dtype=np.float32)+np.maximum(blurred-bg,0)*.45,0,255).astype(np.uint8))
    pad = 14
    padded = Image.new('RGB', (result.width+pad*2,result.height+pad*2), tuple(int(x) for x in bg))
    padded.paste(result,(pad,pad))
    lines = [''.join(chr(int(c)) for c in row) for row in chars]
    return padded, '\n'.join(lines)


def palette_for(frames):
    sample = Image.new('RGB',(256*6,256))
    for j, i in enumerate(np.linspace(0,len(frames)-1,6).astype(int)):
        im=frames[i].copy(); im.thumbnail((256,256))
        sample.paste(im,(j*256,0))
    return sample.quantize(colors=256, method=Image.Quantize.MEDIANCUT)


def save_gif(frames, durations, path):
    palette = palette_for(frames)
    indexed = [f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
    indexed[0].save(path, save_all=True, append_images=indexed[1:], duration=durations,
                    loop=0, optimize=True, disposal=1)


def make_sheet(images, styles, out_path):
    thumb_w, thumb_h = 300, 360
    margin, label_h, gap = 24, 48, 18
    sheet = Image.new('RGB',(margin*2+4*thumb_w+3*gap,104+3*(thumb_h+label_h+gap)), '#111721')
    draw=ImageDraw.Draw(sheet)
    title=ImageFont.truetype(BOLD,27)
    label=ImageFont.truetype(FONT,16)
    small=ImageFont.truetype(FONT,13)
    draw.text((margin,20),'ASCII ANIMATION / 12 VARIATIONS',font=title,fill='#f1f5fc')
    draw.text((margin,61),'Original timing preserved  /  81 frames  /  3.24-second loop',font=small,fill='#9daabd')
    for i,(im,style) in enumerate(zip(images,styles)):
        x=margin+(i%4)*(thumb_w+gap);y=104+(i//4)*(thumb_h+label_h+gap)
        draw.rounded_rectangle((x,y,x+thumb_w,y+thumb_h),radius=6,fill='#060a11')
        thumb=im.copy();thumb.thumbnail((thumb_w-12,thumb_h-12),Image.Resampling.LANCZOS)
        sheet.paste(thumb,(x+(thumb_w-thumb.width)//2,y+(thumb_h-thumb.height)//2))
        draw.text((x,y+thumb_h+9),f'{i+1:02}  '+style['name'],font=label,fill='#e8eef8')
    sheet.save(out_path)
    return sheet


def main():
    p=argparse.ArgumentParser()
    p.add_argument('input',nargs='?',default=str(ROOT/'source.gif'))
    p.add_argument('--output',default=str(ROOT/'rendered'))
    p.add_argument('--preview',action='store_true')
    p.add_argument('--only',nargs='*')
    args=p.parse_args()
    dest=Path(args.output);dest.mkdir(parents=True,exist_ok=True)
    frames,durations=load_source(args.input)
    masks = [subject_mask(f) for f in frames]
    manifest=[];previews=[];chosen=[]
    for style in STYLES:
        if args.only and style['id'] not in args.only: continue
        atlas,cw,ch=glyph_atlas(style['size'],style.get('bold',False))
        selected=[(10,frames[10])] if args.preview else list(enumerate(frames))
        rendered=[];texts=[]
        for idx,frame in selected:
            output,ascii_text=render(frame,style,atlas,cw,ch,idx,masks[idx])
            rendered.append(output);texts.append(ascii_text)
        preview = rendered[0] if args.preview else rendered[10]
        preview.save(dest/(style['id']+'.png'))
        previews.append(preview);chosen.append(style)
        if not args.preview:
            gif=dest/(style['id']+'.gif')
            save_gif(rendered,durations,gif)
            (dest/(style['id']+'.txt')).write_text(texts[10]+'\n')
            manifest.append(dict(**style, file=gif.name, width=rendered[0].width,height=rendered[0].height,
                                 input_frames=len(frames),duration_ms=sum(durations),bytes=gif.stat().st_size))
            print(f'{style["id"]}: {rendered[0].size}, {gif.stat().st_size/1024:.0f} KB',flush=True)
        else:
            print(f'Preview: {style["id"]}',flush=True)
    make_sheet(previews,chosen,dest/'contact-sheet.png')
    if not args.preview:
        (dest/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')


if __name__=='__main__':
    main()
