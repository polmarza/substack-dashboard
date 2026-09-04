#!/usr/bin/env python3
"""Genera el mapamundi que lleva incrustado el panel.

    python3 tools/make_worldmap.py

Convierte los polígonos de países de Natural Earth (dominio público, escala 1:110m)
en un trazado SVG por país, indexado por su código ISO 3166-1 alfa-2, y lo escribe
dentro de `tools/template.html` entre los marcadores WORLD.

Se incrusta en la plantilla, no se carga aparte, porque el panel tiene que abrirse
sin conexión y desde `file://`. Ejecútalo solo si hace falta regenerar el mapa.
"""
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "template.html")
CACHE = os.path.join(HERE, "..", ".cache", "ne_110m_admin_0_countries.geojson")
SOURCE = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
          "geojson/ne_110m_admin_0_countries.geojson")

# Proyección equirectangular. Se recorta por debajo de -60° para dejar fuera la
# Antártida, que ocuparía un cuarto del lienzo sin aportar nada a estas cifras.
W, H = 1000.0, 460.0
LAT_TOP, LAT_BOTTOM = 84.0, -60.0
PRECISION = 1          # decimales que se conservan en el trazado
MIN_AREA = 0.6         # descarta islas diminutas (en unidades del lienzo, al cuadrado)


def fetch_geojson():
    if os.path.exists(CACHE):
        return json.load(open(CACHE, encoding="utf-8"))
    print(f"descargando Natural Earth 110m…")
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with urllib.request.urlopen(SOURCE, timeout=120) as r:
        raw = r.read()
    open(CACHE, "wb").write(raw)
    return json.loads(raw)


def project(lon, lat):
    x = (lon + 180.0) / 360.0 * W
    y = (LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM) * H
    return x, y


def ring_to_path(ring):
    pts = []
    last = None
    for lon, lat in ring:
        if lat < LAT_BOTTOM - 5 or lat > LAT_TOP + 5:
            continue
        x, y = project(lon, max(LAT_BOTTOM, min(LAT_TOP, lat)))
        p = (round(x, PRECISION), round(y, PRECISION))
        if p != last:                       # descarta puntos repetidos tras redondear
            pts.append(p)
            last = p
    if len(pts) < 4:
        return None, 0.0
    # Área por la fórmula del cordón de zapato, para descartar islas irrelevantes.
    area = abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1]
                   for i in range(len(pts)))) / 2.0
    if area < MIN_AREA:
        return None, area
    fmt = lambda v: (f"{v:.{PRECISION}f}").rstrip("0").rstrip(".") or "0"
    d = "M" + " ".join(f"{fmt(x)},{fmt(y)}" for x, y in pts) + "Z"
    return d, area


def polygons(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    return []


def build():
    gj = fetch_geojson()
    out = {}
    names = {}
    for feat in gj["features"]:
        p = feat["properties"]
        iso = (p.get("ISO_A2_EH") or p.get("ISO_A2") or "").strip().upper()
        if not iso or iso in ("-99", "") or len(iso) != 2:
            continue
        if iso == "AQ":                     # Antártida fuera
            continue
        parts = []
        for poly in polygons(feat["geometry"]):
            for ring in poly:               # anillo exterior y huecos: se dibujan todos
                d, _ = ring_to_path(ring)
                if d:
                    parts.append(d)
        if parts:
            out[iso] = "".join(parts)
            names[iso] = p.get("NAME") or iso
    return out, names


def main():
    paths, names = build()
    if len(paths) < 100:
        sys.exit(f"ERROR: solo {len(paths)} países; algo va mal con la fuente")
    blob = json.dumps({"w": W, "h": H, "paths": paths, "names": names},
                      separators=(",", ":"), ensure_ascii=False)
    tpl = open(TEMPLATE, encoding="utf-8").read()
    marker = re.compile(r"(/\* __WORLD__ \*/)(.*?)(/\* __WORLD_END__ \*/)", re.S)
    if not marker.search(tpl):
        sys.exit("ERROR: no encuentro los marcadores WORLD en tools/template.html")
    tpl = marker.sub(lambda m: m.group(1) + blob + m.group(3), tpl)
    open(TEMPLATE, "w", encoding="utf-8").write(tpl)
    print(f"{len(paths)} países incrustados en tools/template.html ({len(blob) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
