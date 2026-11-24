# ARCHA — Research Platform

Independent implementation inspired by the visual and interaction design of [Ancient Nerds](https://ancientnerds.com/globe.html). Reference architecture: [AncientMap](https://github.com/ancientnerds/AncientMap). No upstream code, branding assets, data, API credentials or records are bundled. Archa uses original implementation code and MapLibre instead of the original Three.js/Mapbox stack. Map tiles retain their providers' attribution and are subject to their terms.

## Static preview (GitHub Pages)

Set Settings → Pages → Deploy from a branch → main / (root). Open the resulting site and choose Explore the Globe. The preview reads data/sites.geojson and data/news.json. It is intended for small datasets. You can also serve the root with `python -m http.server 8080` locally (do not use the development HTTP server for production). The browser requires WebGL and internet access for map library and basemap tiles.

## Full application (FastAPI + PostGIS)

Install Docker with Compose, then:

```sh
cp .env.example .env
# Edit .env; replace the example password with a strong random value.
docker compose up --build -d
docker compose exec web python import_data.py
````

Open http://localhost:8000. Database mode is auto-configured by the backend. API docs: http://localhost:8000/docs. The API supports full-text substring search, country/type/source/year filtering, paginated results and spatial vector tiles using PostGIS. Low zoom clusters are generated on the server, and the browser requests only visible tiles. No million-record benchmark has been run. For production add HTTPS, rate limiting, caching and monitoring; confirm map tile service terms and capacity. GitHub Pages cannot host this Python backend or database.

For data changes, update data/sites.geojson or data/news.json and run `docker compose up -d --build web` then `docker compose exec web python import_data.py`. For larger deployments use a separate controlled ETL process rather than keeping massive source files in Git. See [data instructions](data/README.md).

## Scope

Landing page, interactive globe / flat map, dark / satellite basemap, auto rotation, filters, clickable site records, paginated search, news area, and a deterministic research assistant based on matching records. The assistant is not a generative LLM; it makes no unsupported claims. No dataset has been preloaded. UI is English. This is a starter implementation, not a pixel-perfect clone or full replication of AncientMap features. Browser and Docker integration tests are still required.

## Publication status

The root includes `.nojekyll` for direct GitHub Pages serving. GitHub Pages must be enabled by a repository administrator before the public URL works. The landing globe is decorative; it degrades to the static background if WebGL or the CDN is unavailable. The explorer reports startup failures rather than silently displaying a blank screen.
