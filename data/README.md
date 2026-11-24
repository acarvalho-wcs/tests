# Data input

sites.geojson starts empty. Add only records cleared for public disclosure. Never put sensitive coordinates in this public repository or its history. Each Feature requires Point geometry [longitude, latitude] and properties: id (unique string), name, country, category, source, source_url (http/https), public (true only after review), description (optional), start_year and end_year (optional integers; negative=BCE, positive=CE). Null means unknown. Preserve the source and its licence. No source dataset is bundled.

news.json is an array of objects containing id, date (YYYY-MM-DD), title, body. Static mode reads it directly; Docker mode imports it.

Import is an upsert, not a deletion sync. To withdraw a published database record, remove it from GeoJSON and explicitly set public=false in PostGIS; remember that historical public Git commits cannot reliably be made private again.
