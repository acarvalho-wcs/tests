CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE IF NOT EXISTS sites (id text PRIMARY KEY, name text NOT NULL, country text NOT NULL, category text NOT NULL, source text NOT NULL, source_url text NOT NULL, description text NOT NULL DEFAULT '', start_year integer, end_year integer, geom geometry(Point,4326) NOT NULL, public boolean NOT NULL DEFAULT false, CHECK(start_year IS NULL OR end_year IS NULL OR start_year <= end_year));
CREATE INDEX IF NOT EXISTS sites_geom_public ON sites USING gist(geom) WHERE public;
CREATE INDEX IF NOT EXISTS sites_merc_public ON sites USING gist(ST_Transform(geom,3857)) WHERE public;
CREATE INDEX IF NOT EXISTS sites_facets ON sites(country,category,source) WHERE public;
CREATE INDEX IF NOT EXISTS sites_name_trgm ON sites USING gin(name gin_trgm_ops) WHERE public;
CREATE TABLE IF NOT EXISTS news (id text PRIMARY KEY, date date NOT NULL, title text NOT NULL, body text NOT NULL);
