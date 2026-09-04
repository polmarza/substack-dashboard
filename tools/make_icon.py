#!/usr/bin/env python3
"""Genera el icono de la extensión: una «S» blanca sobre el naranja de Substack.

    python3 tools/make_icon.py

Escribe extension/icon.svg y lo rasteriza a los tamaños que pide Chrome (16/32/48/128)
con rsvg-convert. Ejecútalo solo si quieres regenerar el icono.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.join(HERE, "..", "extension")
ORANGE = "#FF6719"

SVG = f'''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="{ORANGE}"/>
  <text x="64" y="64" fill="#ffffff" font-family="Helvetica, Arial, sans-serif"
        font-size="86" font-weight="700" text-anchor="middle" dominant-baseline="central">S</text>
</svg>
'''


def main():
    os.makedirs(EXT, exist_ok=True)
    svg_path = os.path.join(EXT, "icon.svg")
    open(svg_path, "w").write(SVG)
    if not _has("rsvg-convert"):
        sys.exit("Falta rsvg-convert (brew install librsvg). El SVG se ha escrito; "
                 "conviértelo a icon-16/32/48/128.png con la herramienta que prefieras.")
    for size in (16, 32, 48, 128):
        out = os.path.join(EXT, f"icon-{size}.png")
        subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), svg_path, "-o", out], check=True)
        print(f"  icon-{size}.png")
    print("Icono generado.")


def _has(cmd):
    from shutil import which
    return which(cmd) is not None


if __name__ == "__main__":
    main()
