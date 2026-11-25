# ARCHA — Research Platform

Globe rendering adapted from [Ancient Nerds / AncientMap](https://github.com/ancientnerds/AncientMap/tree/7e4bee2d9fbffa11ca31706f0fb2b94bc4635dbe) (AGPL-3.0-or-later). See [UPSTREAM.md](UPSTREAM.md) and [LICENSE](LICENSE). The application uses the upstream Three.js version, original perspective camera, unit sphere, star shader, vector line shaders and coordinate conversion. Native sphere only; the upstream close-zoom Mapbox mode, label pipeline, satellite and historical layers are not enabled. OrbitControls handles dragging (the custom upstream arcball was not ported). Original start-tier coastlines and country borders are fetched from the pinned upstream GitHub commit. No archaeological data is imported. Source attribution is visible.

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

Open http://localhost:8000. Database mode is auto-configured by the backend. API docs: http://localhost:8000/docs. The API supports full-text substring search, country/type/source/year filtering, paginated results and spatial vector tiles using PostGIS, plus a filtered globe-points endpoint. The tile API remains available, but the native sphere currently loads filtered points as GeoJSON. Large datasets require a paged or binary point stream and benchmarking. No million-record benchmark has been run. For production add HTTPS, rate limiting, caching and monitoring; confirm map tile service terms and capacity. GitHub Pages cannot host this Python backend or database.

For data changes, update data/sites.geojson or data/news.json and run `docker compose up -d --build web` then `docker compose exec web python import_data.py`. For larger deployments use a separate controlled ETL process rather than keeping massive source files in Git. See [data instructions](data/README.md).

## Scope

Landing page, native interactive 3D globe with coastline and country-border controls, auto rotation, filters, clickable site records, paginated search, news area, and a deterministic research assistant based on matching records. The assistant is not a generative LLM; it makes no unsupported claims. No dataset has been preloaded. UI is English. This is a starter implementation, not a pixel-perfect clone or full replication of AncientMap features. Browser and Docker integration tests are still required. Original globe source was adapted, not transferred as a full application.

## Publication status

The root includes `.nojekyll` for direct GitHub Pages serving. GitHub Pages must be enabled by a repository administrator before the public URL works. The landing globe is decorative; it degrades to the static background if WebGL or the CDN is unavailable. The explorer reports startup failures rather than silently displaying a blank screen.

## Wildlife trafficking experiment

The public frontend currently reads the two canonical public JSON feeds directly from the pinned Observatory commit 583ac03918994a214cdf10eaa4ab67e284602da2. The original archaeological GeoJSON and PostGIS tables are unchanged. Filters use event/publication date independently, country, fauna group, transport modal, source, text and documented-route presence. The counts exclude records flagged exclude_from_totals while all matching public records remain selectable. Routes require unique case matching across the complete unfiltered collection, documented status, valid endpoints and no exclusions; unknown directions are not inferred. Gray lines are schematic, blue arrowheads show documented directions and hollow blue rings mark approximate references. The experiment is read-only and does not access the restricted area. The static frontend does not import this experiment into PostGIS. The external feed is pinned for consistent cases/routes; update SOURCE_COMMIT to refresh both together. Browser and complete-feed validation remain pending.
