# Jhapa Human–Wildlife Conflict Web GIS (prototype)

All records are **fictional sample data** for demonstration.

## Structure
index.html · css/style.css · js/script.js · data/{incidents.json, conflict_points.geojson, crop_damage.shp/.dbf/.shx/.prj/.cpg} · js/lib/shp.min.js · photos/<INCIDENT_ID>/

## Run locally
Browsers block `fetch()` on `file://`, so use a server:
- VS Code: install "Live Server", right-click `index.html` → Open with Live Server; or
- Terminal: `python -m http.server 8000` in this folder, then open http://localhost:8000

## Deploy to GitHub Pages
1. Push this folder's contents to a GitHub repo (index.html at the repo root).
2. Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Open `https://<username>.github.io/<repo>/`. All paths are relative.

## Replacing sample data with field data
- `incidents.json`: one object per incident; `incident_id` is the key (e.g. HWC-001). `photos` = list of relative paths.
- `conflict_points.geojson`: Point per incident, `properties.incident_id`.
- Crop-damage shapefile: copy your files into `data/` named `crop_damage.shp`, `.dbf`, `.shx`, `.prj` (and `.cpg` if you have one), replacing the sample. No conversion needed; the browser reads it directly and reprojects to WGS84 using the `.prj`, so **the .prj is required** for UTM/other projected data. Alternatively use one `data/crop_damage.zip` and set `CROP_SHAPEFILE = "data/crop_damage.zip"` at the top of `js/script.js`.
  - The .dbf needs an Incident ID column (`Incident_ID`, or the 10-character `Incident_I`/`ID`) matching `incidents.json`. An optional `Crop` column fills in the crop type.
  - The damaged area is calculated from the polygon geometry. Several polygons with the same ID are summed. `area_damaged_ha` is only a fallback.
  - If an incident has a polygon but no point, the polygon centre is used as its marker.
- `wildlife_group` must be Elephant, Leopard, Monkey or Other.
- `python make_data.py` regenerates the sample set; delete it once you use real data.
