#!/usr/bin/env python3
"""Render the isolated Marshadow GIF as colored ASCII with transparent pixels."""

from pathlib import Path

import numpy as np
from PIL import Image

from render_ascii import CROP, ascii_levels, glyph_atlas, load_source, subject_mask


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent / 'public/ascii'
COLS = 44
RAMP = np.array([ord(char) for char in ' .:-=+*#%@'], dtype=np.uint8)


def main():
    frames, durations = load_source(ROOT / 'source.gif')
    atlas, char_width, char_height = glyph_atlas(12, bold=True)
    rows = round(
        (CROP[3] - CROP[1]) / (CROP[2] - CROP[0]) * COLS * char_width / char_height
    )
    samples = []

    for frame in frames:
        crop = frame.crop(CROP)
        small = crop.resize((COLS, rows), Image.Resampling.LANCZOS)
        rgb = np.asarray(small, dtype=np.float32)
        gray = np.asarray(small.convert('L'), dtype=np.float32)
        mask = subject_mask(frame).crop(CROP)
        alpha = np.asarray(mask.resize((COLS, rows), Image.Resampling.LANCZOS), dtype=np.float32) / 255
        tone = np.clip((gray - 12) / 132, 0, 1) ** .84
        chars = RAMP[np.maximum(ascii_levels(tone * 255), 3)]
        chars[alpha < .45] = ord(' ')
        samples.append((chars, rgb, alpha))

    occupied = np.stack([chars != ord(' ') for chars, _, _ in samples]).any(axis=0)
    y_coords, x_coords = np.where(occupied)
    top = max(0, int(y_coords.min()) - 2)
    bottom = min(rows, int(y_coords.max()) + 3)
    left = max(0, int(x_coords.min()) - 2)
    right = min(COLS, int(x_coords.max()) + 3)
    # The two lowest occupied rows come from the GIF's floor shadow. They form
    # a detached line that changes or disappears as the character animates.
    floor_shadow_start = int(y_coords.max()) - 1

    rendered = []
    for chars, rgb, alpha in samples:
        chars = chars[top:bottom, left:right].copy()
        chars[floor_shadow_start - top:] = ord(' ')
        rgb = rgb[top:bottom, left:right]
        alpha = alpha[top:bottom, left:right]

        glyph_alpha = atlas[chars].transpose(0, 2, 1, 3).reshape(
            chars.shape[0] * char_height, chars.shape[1] * char_width
        ).astype(np.float32) / 255
        cell_alpha = np.repeat(np.repeat(np.clip(alpha * 1.5, 0, 1), char_height, axis=0), char_width, axis=1)
        colors = np.clip((rgb / 255) ** .58 * 315, 0, 255).astype(np.uint8)
        colors = np.repeat(np.repeat(colors, char_height, axis=0), char_width, axis=1)
        pixels = np.dstack((colors, np.uint8(glyph_alpha * cell_alpha * 255)))
        rendered.append(Image.fromarray(pixels, 'RGBA'))

    if len(set(durations)) != 1:
        raise ValueError('The canvas player expects a fixed frame duration')

    sheet_columns = 9
    sheet_rows = (len(rendered) + sheet_columns - 1) // sheet_columns
    sheet = Image.new('RGBA', (
        rendered[0].width * sheet_columns,
        rendered[0].height * sheet_rows,
    ))
    for index, frame in enumerate(rendered):
        sheet.alpha_composite(frame, (
            index % sheet_columns * frame.width,
            index // sheet_columns * frame.height,
        ))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    rendered[10].save(OUTPUT / 'marshadow-still.png')
    sheet.save(OUTPUT / 'marshadow-sprite.png', optimize=True)
    print(f'Wrote {len(rendered)} frames ({rendered[0].width}×{rendered[0].height}, {durations[0]} ms each) to {OUTPUT}')


if __name__ == '__main__':
    main()
