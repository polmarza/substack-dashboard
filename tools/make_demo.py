#!/usr/bin/env python3
"""Genera datos de demostración ficticios y construye un panel de ejemplo.

    python3 tools/make_demo.py [carpeta_salida]     # por defecto: demo/

Sirve para ver el panel sin tener cuenta de Substack, y para las capturas del README.
Los datos son inventados con una semilla fija, así que el resultado es reproducible.
Ninguna cifra procede de una publicación real.
"""
import json, os, random, sys, datetime

SEED = 20260904
OUT = sys.argv[1] if len(sys.argv) > 1 else "demo"
HERE = os.path.dirname(os.path.abspath(__file__))

# Tres publicaciones inventadas con formas distintas, para que la comparativa tenga algo
# que contar: una que creció mucho (donde absoluto y relativo discrepan), una pequeña
# muy fiel, y una intermedia.
PUBS = [
    dict(id=900001, name="Café con Datos", subdomain="cafecondatos", custom_domain="www.cafecondatos.example",
         start_subs=120, end_subs=1850, months=18, base_reach=0.55, base_open=0.42, engage=0.020, conv=0.012),
    dict(id=900002, name="Bits & Bites", subdomain="bitsandbites", custom_domain=None,
         start_subs=610, end_subs=920, months=14, base_reach=0.48, base_open=0.38, engage=0.058, conv=0.003),
    dict(id=900003, name="Rutas y Montañas", subdomain="rutasymontanas", custom_domain=None,
         start_subs=250, end_subs=340, months=12, base_reach=0.86, base_open=0.61, engage=0.038, conv=0.005),
]

TITLES = [
    "Lo que aprendí midiendo mi propia newsletter", "Tres gráficos que cambiaron mi forma de escribir",
    "El error de métrica que cometemos todos", "Cómo elegir qué medir cuando todo parece importante",
    "Escribir para quien ya te lee", "La semana en la que dejé de mirar los números",
    "Un método simple para decidir sobre qué escribir", "Por qué tu mejor post no es el más leído",
    "Cinco preguntas antes de pulsar publicar", "El coste oculto de publicar cada semana",
    "Lo que revela una tasa de apertura baja", "Cuándo conviene repetir un tema",
    "Empezar de nuevo con la misma lista", "El post que no quería escribir",
    "Formatos que funcionan y formatos que cansan", "Qué pasa cuando escribes más corto",
    "Una plantilla para revisar tu archivo", "Del borrador al envío en dos horas",
    "Escuchar a los que no responden", "Medir sin obsesionarse",
    "El día que cambié el asunto del email", "Cómo se ve tu newsletter en el móvil",
    "Responder a todos durante un mes", "Lo que no cuentan las métricas",
]
SOURCES = [("Búsqueda", 0.28), ("Notes", 0.22), ("Recomendaciones", 0.19),
           ("Directo", 0.14), ("Redes sociales", 0.10), ("Importación", 0.07)]
REFERRERS = [("email", 0.72), ("direct", 0.11), ("search", 0.07),
             ("substack app", 0.06), ("notes", 0.04)]


def build_pub(cfg, rnd, today):
    n_posts = cfg["months"] * 4 // 3
    posts, details = [], {}
    for i in range(n_posts):
        frac = i / max(1, n_posts - 1)
        when = today - datetime.timedelta(days=int((1 - frac) * cfg["months"] * 30))
        # La lista crece con el tiempo: los posts antiguos llegaron a mucha menos gente.
        subs = int(cfg["start_subs"] + (cfg["end_subs"] - cfg["start_subs"]) * (frac ** 1.35))
        sent = subs
        delivered = int(sent * rnd.uniform(0.975, 0.995))
        open_rate = max(0.10, min(0.95, rnd.gauss(cfg["base_open"], 0.05)))
        opened = int(delivered * open_rate)
        opens = int(opened * rnd.uniform(1.2, 1.9))
        # El alcance relativo baja lentamente al crecer la lista (menos gente activa),
        # que es justo el efecto que el modo relativo deja ver.
        reach = max(0.12, cfg["base_reach"] * (1 - 0.30 * frac) * rnd.uniform(0.75, 1.35))
        views = max(5, int(delivered * reach))
        clicked = int(opened * rnd.uniform(0.05, 0.22))
        clicks = int(clicked * rnd.uniform(1.1, 1.6))
        reactions = max(0, int(views * cfg["engage"] * rnd.uniform(0.5, 1.9)))
        comments = max(0, int(reactions * rnd.uniform(0.0, 0.6)))
        shares = max(0, int(views * 0.006 * rnd.uniform(0, 2.5)))
        signups = max(0, int(views * cfg["conv"] * rnd.uniform(0.3, 2.0)))
        pid = cfg["id"] * 100 + i
        title = TITLES[(i * 7 + cfg["id"]) % len(TITLES)]
        posts.append({
            "id": pid, "title": title, "slug": f"post-{i+1}", "type": "newsletter",
            "audience": "everyone", "post_date": when.isoformat() + "Z", "cover_image": None,
            "reaction_count": reactions, "comment_count": comments,
            "stats": {
                "views": views, "opens": opens, "opened": opened, "open_rate": round(opened / delivered, 6),
                "clicks": clicks, "clicked": clicked,
                "click_through_rate": round(clicked / delivered, 6),
                "sent": sent, "delivered": delivered, "shares": shares, "signups": signups,
                "subscribes": 0, "unsubscribes": max(0, int(delivered * 0.002 * rnd.random())),
                "signups_within_1_day": int(signups * 0.7), "unsubscribes_within_1_day": 0,
            },
        })
        daily, cum = [], 0
        for d in range(7):
            share = [0.42, 0.24, 0.12, 0.08, 0.06, 0.05, 0.03][d]
            v = int(views * share)
            cum += v
            daily.append({"dt": (when + datetime.timedelta(days=d)).isoformat() + "Z", "day_n": d,
                          "views": v, "cumulative_views": cum, "signups": int(signups * share)})
        details[str(pid)] = {
            "firstWeekDailyStats": daily,
            "referrers": {"sources": [{"source": s, "views": int(views * w),
                                       "percent_of_total_views": str(round(w, 6))} for s, w in REFERRERS]},
            "links": [[f"https://example.com/enlace-{k+1}", max(1, int(clicks * w))]
                      for k, w in enumerate([0.5, 0.3, 0.2])],
            "has_more_links": False,
            "comps": {"avg_views": int(views * rnd.uniform(0.75, 1.25)),
                      "avg_open_rate": round(cfg["base_open"], 6),
                      "avg_click_through_rate": 0.06, "avg_likes": round(reactions * 0.9, 2),
                      "avg_comments": round(comments * 0.9, 2), "avg_signups": round(signups * 0.9, 2),
                      "n_comp_posts": max(3, n_posts - 1)},
        }

    series = []
    for d in range(cfg["months"] * 30, -1, -1):
        frac = 1 - d / (cfg["months"] * 30)
        series.append([(today - datetime.timedelta(days=d)).strftime("%Y/%m/%d"),
                       int(cfg["start_subs"] + (cfg["end_subs"] - cfg["start_subs"]) * (frac ** 1.35))])

    total_new = cfg["end_subs"] - cfg["start_subs"]
    meta = {k: cfg[k] for k in ("id", "name", "subdomain", "custom_domain")}
    recent = [p for p in posts if p["stats"]["delivered"]][-4:]
    views30 = sum(p["stats"]["views"] for p in recent)
    return {
        "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "host": cfg["custom_domain"] or f"{cfg['subdomain']}.substack.com",
        "subdomain": cfg["subdomain"], "source": "demo",
        "publication": {"id": cfg["id"], "name": cfg["name"], "custom_domain": cfg["custom_domain"]},
        "publication_meta": meta,
        "posts": posts, "details": details,
        "counts": {"published": len(posts), "drafts": rnd.randint(2, 11), "scheduled": 0},
        "summary": {"totalEmail": cfg["end_subs"], "views": views30,
                    "viewsDelta": int(views30 * rnd.uniform(-0.25, 0.35)),
                    "openRate": round(cfg["base_open"] * 100, 1)},
        "summary_v2": {
            "7": {"totalSubscribersStart": cfg["end_subs"] - 6, "totalSubscribersEnd": cfg["end_subs"]},
            "30": {"totalSubscribersStart": int(cfg["end_subs"] * 0.97), "totalSubscribersEnd": cfg["end_subs"],
                   "paidSubscribersStart": 0, "paidSubscribersEnd": 0},
            "365": {"totalSubscribersStart": cfg["start_subs"], "totalSubscribersEnd": cfg["end_subs"]},
        },
        "subscribers_timeseries": series,
        "growth_sources": {"sourceMetrics": [
            {"sourceName": s, "source": s.lower(), "category": "Demo",
             "metrics": [{"name": "Subscribers", "total": int(total_new * w)},
                         {"name": "Traffic", "total": int(total_new * w * 6)},
                         {"name": "Revenue", "total": 0}],
             "children": []} for s, w in SOURCES],
            "totals": [{"name": "subscribers", "total": total_new}]},
        "growth_events": {"pubEvents": []},
        "network_attribution": {"rows": []},
    }


def main():
    rnd = random.Random(SEED)
    today = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0, tzinfo=None)
    os.makedirs(OUT, exist_ok=True)
    for cfg in PUBS:
        ds = build_pub(cfg, rnd, today)
        with open(os.path.join(OUT, f"{cfg['subdomain']}.json"), "w", encoding="utf-8") as f:
            json.dump(ds, f, ensure_ascii=False)
        print(f"  {cfg['name']}: {len(ds['posts'])} posts, {cfg['end_subs']} suscriptores (ficticios)")
    sys.path.insert(0, os.path.join(HERE, "..", "substack-dashboard", "scripts"))
    import build as builder
    builder.build(OUT, os.path.join(OUT, "dashboard.html"))


if __name__ == "__main__":
    main()
