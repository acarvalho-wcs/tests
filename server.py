import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row

pool=ConnectionPool(os.environ.get("DATABASE_URL",""),kwargs={"row_factory":dict_row},min_size=1,max_size=8,open=False)
@asynccontextmanager
async def lifespan(app):
    pool.open(wait=True)
    yield
    pool.close()
app=FastAPI(title="Archa",lifespan=lifespan)

def query(sql,args=()):
    with pool.connection() as c:
        return c.execute(sql,args).fetchall()

def filters(q="",country="",category="",source="",from_=None,to=None):
    clauses=["public"]; args=[]
    if q:
        clauses.append("(name ILIKE %s OR country ILIKE %s OR category ILIKE %s OR source ILIKE %s OR description ILIKE %s)")
        term="%"+q.replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%"
        args.extend([term]*5)
    for key,val in (("country",country),("category",category),("source",source)):
        if val:
            clauses.append(key+" = %s");args.append(val)
    if from_ is not None: clauses.append("end_year >= %s");args.append(from_)
    if to is not None: clauses.append("start_year <= %s");args.append(to)
    return " AND ".join(clauses),args
COLS="id,name,country,category,source,source_url,description,start_year,end_year,ST_X(geom) AS lon,ST_Y(geom) AS lat"
def feature(row):
    row=dict(row); lon=row.pop("lon");lat=row.pop("lat")
    return {"type":"Feature","geometry":{"type":"Point","coordinates":[lon,lat]},"properties":row}
def search(q="",country="",category="",source="",from_=None,to=None,limit=50,offset=0):
    w,a=filters(q,country,category,source,from_,to)
    total=query("SELECT count(*) AS n FROM sites WHERE "+w,a)[0]["n"]
    rows=query("SELECT "+COLS+" FROM sites WHERE "+w+" ORDER BY name,id LIMIT %s OFFSET %s",[*a,limit,offset])
    return {"total":total,"features":[feature(r) for r in rows]}
@app.get("/api/meta")
def meta():
    out={"total":query("SELECT count(*) AS n FROM sites WHERE public")[0]["n"]}
    for k in ("country","category","source"):
        out[k]=[r[k] for r in query("SELECT DISTINCT "+k+" FROM sites WHERE public ORDER BY "+k)]
    return out
@app.get("/api/sites")
def sites(q:str=Query("",max_length=300),country:str="",category:str="",source:str="",from_:int|None=Query(None,alias="from"),to:int|None=None,limit:int=Query(50,ge=1,le=100),offset:int=Query(0,ge=0,le=1000000)):
    return search(q,country,category,source,from_,to,limit,offset)
@app.get("/api/sites/{id}")
def site(id:str):
    rows=query("SELECT "+COLS+" FROM sites WHERE public AND id=%s",[id])
    if not rows: raise HTTPException(404,"Site not found")
    return feature(rows[0])
@app.get("/api/tiles/{z}/{x}/{y}.pbf")
def tiles(z:int,x:int,y:int,q:str=Query("",max_length=300),country:str="",category:str="",source:str="",from_:int|None=Query(None,alias="from"),to:int|None=None):
    if not 0<=z<=14 or not 0<=x<2**z or not 0<=y<2**z: raise HTTPException(400,"Invalid tile")
    w,a=filters(q,country,category,source,from_,to)
    base="WITH b AS (SELECT ST_TileEnvelope(%s,%s,%s) AS env), p AS (SELECT id,ST_Transform(geom,3857) AS g FROM sites,b WHERE "+w+" AND ST_Transform(geom,3857) && env AND ST_Intersects(ST_Transform(geom,3857),env)), "
    if z<9:
        grid=40075016.68557849/(2**z*16)
        sql=base+"""groups AS (SELECT min(id) AS id, count(*)::int AS n, ST_Centroid(ST_Collect(g)) AS g FROM p GROUP BY ST_SnapToGrid(g,%s)), f AS (SELECT id, CASE WHEN n>1 THEN n END AS point_count, ST_AsMVTGeom(g,env,4096,0,true) AS geom FROM groups,b) SELECT ST_AsMVT(f,'sites',4096,'geom') AS tile FROM f"""
        args=[z,x,y,*a,grid]
    else:
        sql=base+"f AS (SELECT id, ST_AsMVTGeom(g,env,4096,0,true) AS geom FROM p,b) SELECT ST_AsMVT(f,'sites',4096,'geom') AS tile FROM f"
        args=[z,x,y,*a]
    data=query(sql,args)[0]["tile"]
    return Response(bytes(data or b""),media_type="application/vnd.mapbox-vector-tile",headers={"Cache-Control":"public, max-age=60"})
@app.get("/api/news")
def news():
    return query("SELECT date,title,body FROM news ORDER BY date DESC,id DESC LIMIT 100")
class Question(BaseModel):
    question:str=Field(min_length=1,max_length=300)
@app.post("/api/assistant")
def assistant(body:Question):
    result=search(q=body.question,limit=10)
    return {"answer":f"{result['total']} matching published records. Open a record to verify its source. No external claims are generated.","features":result["features"]}
@app.get("/health")
def health():
    query("SELECT 1")
    return {"ok":True}

# Serve only explicitly public files, not the source tree or credentials.
from fastapi.responses import FileResponse
ROOT=Path(__file__).parent
@app.get("/")
def landing(): return FileResponse(ROOT/"index.html")
@app.get("/config.js")
def config():
    s=(ROOT/"config.js").read_text().replace("export const API_BASE = '';","export const API_BASE = window.location.origin;")
    return Response(s,media_type="text/javascript")
@app.get("/{filename}")
def public_file(filename:str):
    if filename not in {"index.html","globe.html","style.css","app.js","landing.js"}: raise HTTPException(404)
    return FileResponse(ROOT/filename)
