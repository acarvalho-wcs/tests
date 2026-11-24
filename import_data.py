"""Import reviewed, public-only GeoJSON and news. Run inside the web container."""
import json, os, math
from pathlib import Path
from urllib.parse import urlparse
import psycopg
root=Path(__file__).parent
data=json.loads((root/"data/sites.geojson").read_text())
assert data["type"]=="FeatureCollection"
seen=set()
with psycopg.connect(os.environ.get("DATABASE_URL","")) as c:
    for f in data["features"]:
        p=f["properties"]
        if p.get("public") is not True: raise ValueError("Only explicitly public, approved records may be imported")
        if f["geometry"]["type"]!="Point": raise ValueError("Point required")
        lon,lat=f["geometry"]["coordinates"]
        if not all(isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) for v in (lon,lat)) or not -180<=lon<=180 or not -85.05112878<=lat<=85.05112878: raise ValueError("Invalid Web Mercator coordinates")
        for k in ("id","name","country","category","source","source_url"):
            if not isinstance(p.get(k),str) or not p[k].strip(): raise ValueError("Missing "+k)
        u=urlparse(p["source_url"])
        if u.scheme not in ("https","http") or not u.netloc: raise ValueError("Source URL required")
        if p["id"] in seen: raise ValueError("Duplicate ID")
        seen.add(p["id"])
        c.execute("""INSERT INTO sites(id,name,country,category,source,source_url,description,start_year,end_year,geom,public) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,ST_SetSRID(ST_MakePoint(%s,%s),4326),true) ON CONFLICT(id) DO UPDATE SET name=excluded.name,country=excluded.country,category=excluded.category,source=excluded.source,source_url=excluded.source_url,description=excluded.description,start_year=excluded.start_year,end_year=excluded.end_year,geom=excluded.geom,public=true""",[p[k] for k in ("id","name","country","category","source","source_url")]+[p.get("description",""),p.get("start_year"),p.get("end_year"),lon,lat])
    for n in json.loads((root/"data/news.json").read_text()):
        c.execute("INSERT INTO news(id,date,title,body) VALUES (%s,%s,%s,%s) ON CONFLICT(id) DO UPDATE SET date=excluded.date,title=excluded.title,body=excluded.body",[n[k] for k in ("id","date","title","body")])
print(f"Imported {len(seen)} approved records.")
