ASCII GIF CONVERTER — SOURCE CODE

This is the code used to create the twelve ASCII GIF variations, with fonts
bundled and local machine paths removed. The original input GIF is included.

SETUP
Use Python 3.12 or 3.13. From this folder:

    python -m venv .venv

Activate the environment:
    macOS / Linux: source .venv/bin/activate
    Windows PowerShell: .venv\Scripts\Activate.ps1

Install dependencies and render:

    python -m pip install -r requirements.txt
    python render_ascii.py source.gif --output rendered

On systems where the command is python3, substitute python3 for python.

QUICK PREVIEW
    python render_ascii.py source.gif --preview --output previews

ONLY ONE STYLE
    python render_ascii.py source.gif --only 05-green-terminal --output rendered

WEBSITE ANIMATION
    python export_web_animation.py

This creates a transparent, true-color ASCII sprite sheet and still frame in
../public/ascii/. The website plays the sprite sheet in a canvas so hovering
can pause on the current frame.

FILES
render_ascii.py  Main converter, 12 style presets, ASCII rendering, GIF export.
matting.py       OpenCV foreground extraction tuned for this character.
source.gif       The original 540 x 433, 81-frame input GIF.
fonts/           Bundled DejaVu Sans Mono fonts and their license.
vendor/          The two required upstream Asciinator source files.
requirements.txt Pinned Python dependencies.

OUTPUT
Each chosen style produces a GIF, a PNG preview, and a text snapshot.
A contact-sheet.png and manifest.json are also generated.
GIFs loop indefinitely and preserve the input frame durations.

CUSTOMIZATION
Edit STYLES in render_ascii.py:
- cols: number of character columns; higher values retain more detail.
- size: glyph font size in pixels.
- ramp: exactly ten ASCII characters, from light coverage to dense coverage.
- fg / bg: foreground and background RGB colors for monochrome styles.
- mode: mono, color, binary, edge, neon, or dots.
- glow: adds a soft glow to the glyphs.

This is the renderer for YOUR supplied GIF, not a general background remover.
CROP and the fixed coordinates / foreground colors in matting.py are tuned to
its 540 x 433 frames. To use another clip, adjust those values or disable crop
and isolate for the selected styles and skip mask generation in main(). The
preview snapshot assumes the input has at least eleven frames.

UPSTREAM
Asciinator: https://github.com/qequ/asciinator
Commit: d669f8401db9972ac6bc5c85c5716154de6121a5
The image_to_ascii function performs the brightness-to-character conversion.
Its MIT license is included in ASCIINATOR-LICENSE.txt.
DejaVu font licensing is included in fonts/LICENSE.txt.

The download contains source and the input GIF; Python packages are installed
by the setup command. Generated animations and local virtual environments are
not included.
