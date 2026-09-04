#!/usr/bin/env python3
"""Genera el icono de la extensión: una «S» blanca sobre el naranja de Substack.

    python3 tools/make_icon.py

Escribe extension/icon.svg y lo rasteriza a los tamaños que pide Chrome (16/32/48/128)
con rsvg-convert. Ejecútalo solo si quieres regenerar el icono.

Centrar el texto con `dominant-baseline="central"` deja la letra alta: esa línea va
por la mitad de la altura de la x, no por la mitad del trazo real de la mayúscula.
Así que aquí se rasteriza una prueba, se mide dónde ha caído la tinta y se corrige
la posición con esa medida. Sale centrada de verdad, y sin depender de cómo
interprete las líneas base el programa que abra el SVG.
"""
import os
import struct
import subprocess
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.join(HERE, "..", "extension")
ORANGE = "#FF6719"
BOX = 128          # lienzo
FONT = 86          # tamaño de la letra
PROBE_Y = 96       # línea base de la prueba; la definitiva sale de medir


def svg(baseline_y, dx=0.0):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{BOX}" height="{BOX}" viewBox="0 0 {BOX} {BOX}">
  <rect width="{BOX}" height="{BOX}" rx="28" fill="{ORANGE}"/>
  <text x="{BOX / 2 + dx:g}" y="{baseline_y:g}" fill="#ffffff" font-family="Helvetica, Arial, sans-serif"
        font-size="{FONT}" font-weight="700" text-anchor="middle">S</text>
</svg>
'''


def render(svg_text, size, out):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), "-o", out],
                   input=svg_text.encode(), check=True)


def png_pixels(path):
    """Devuelve (ancho, alto, filas RGBA). Lector mínimo, solo para lo que genera rsvg."""
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "no es un PNG"
    idat, pos = b"", 8
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            w, h, depth, color = struct.unpack(">IIBB", chunk[:10])
            if (depth, color) != (8, 6):
                sys.exit(f"esperaba RGBA de 8 bits y he encontrado depth={depth} color={color}")
        elif kind == b"IDAT":
            idat += chunk
        elif kind == b"IEND":
            break
        pos += 12 + length

    raw, rows, prev = zlib.decompress(idat), [], bytearray(w * 4)
    stride = w * 4
    for y in range(h):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        # Los cinco filtros del PNG; rsvg usa varios según la fila.
        for i in range(stride):
            a = line[i - 4] if i >= 4 else 0
            b = prev[i]
            c = prev[i - 4] if i >= 4 else 0
            if f == 1:
                line[i] = (line[i] + a) & 0xFF
            elif f == 2:
                line[i] = (line[i] + b) & 0xFF
            elif f == 3:
                line[i] = (line[i] + (a + b) // 2) & 0xFF
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 0xFF
        rows.append(bytes(line))
        prev = line
    return w, h, rows


def ink_box(path):
    """Recuadro que ocupa la letra: los píxeles claros, que es lo único blanco del icono."""
    w, h, rows = png_pixels(path)
    xs, ys = [], []
    for y in range(h):
        row = rows[y]
        for x in range(w):
            r, g, b = row[x * 4], row[x * 4 + 1], row[x * 4 + 2]
            if r > 200 and g > 200 and b > 200:
                xs.append(x)
                ys.append(y)
    if not xs:
        sys.exit("no encuentro la letra en la prueba")
    return min(xs), min(ys), max(xs), max(ys)


def main():
    os.makedirs(EXT, exist_ok=True)
    if not _has("rsvg-convert"):
        open(os.path.join(EXT, "icon.svg"), "w").write(svg(PROBE_Y))
        sys.exit("Falta rsvg-convert (brew install librsvg). El SVG se ha escrito sin centrar; "
                 "instálalo y vuelve a ejecutar para que la letra quede centrada.")

    probe = os.path.join(EXT, ".probe.png")
    render(svg(PROBE_Y), BOX, probe)
    x0, y0, x1, y1 = ink_box(probe)
    os.remove(probe)

    # Cuánto hay que mover la letra para que su centro real coincida con el del lienzo.
    dy = BOX / 2 - (y0 + y1) / 2
    dx = BOX / 2 - (x0 + x1) / 2
    print(f"  prueba: la letra ocupa x {x0}–{x1}, y {y0}–{y1} → corrijo {dx:+.1f}, {dy:+.1f} px")

    final = svg(PROBE_Y + dy, dx)
    svg_path = os.path.join(EXT, "icon.svg")
    open(svg_path, "w").write(final)
    for size in (16, 32, 48, 128):
        out = os.path.join(EXT, f"icon-{size}.png")
        render(final, size, out)
        print(f"  icon-{size}.png")

    check = os.path.join(EXT, ".check.png")
    render(final, BOX, check)
    x0, y0, x1, y1 = ink_box(check)
    os.remove(check)
    off = ((x0 + x1) / 2 - BOX / 2, (y0 + y1) / 2 - BOX / 2)
    print(f"  comprobado: centro desviado {off[0]:+.1f}, {off[1]:+.1f} px")
    if max(abs(off[0]), abs(off[1])) > 1:
        sys.exit("ERROR: la letra sigue descentrada")
    print("Icono generado.")


def _has(cmd):
    from shutil import which
    return which(cmd) is not None


if __name__ == "__main__":
    main()
