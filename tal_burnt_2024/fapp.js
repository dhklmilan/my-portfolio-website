// function to create load message while opening the web-page (wait for few sec), defined as a id = status 

(function () {
  "use strict";

  const statusEl = document.getElementById("status");
  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("error", !!isError);
    statusEl.classList.remove("hide");
  }
  function clearStatus() { statusEl.classList.add("hide"); }

  
  // this function encodes each folder/file name individually while keeping / as the folder separator
  // This function makes a file/folder path safe to use in a URL. bich ma space bhaye ni farak pardaina
  const enc = (p) => p.split("/").map(encodeURIComponent).join("/");


  // Burnt area Map and base layers - OSM and google eartn image from Esri
  const map = L.map("map", { zoomControl: true, tap: true })
    .setView(CONFIG.initialView.center, CONFIG.initialView.zoom);

  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
  });
  const imagery = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "Tiles &copy; Esri" }
  );
  imagery.addTo(map); // default background layer when i open the website
  L.control.layers({ "Street map": osm, "Satellite": imagery }, null, { position: "topleft", collapsed: true }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);


  // Panes control drawing order: raster < dNBR map < points
  map.createPane("burnt");  map.getPane("burnt").style.zIndex = 300;
  map.createPane("main");   map.getPane("main").style.zIndex = 350;
  map.createPane("points"); map.getPane("points").style.zIndex = 450;


  // Main dNBR map will always displayed geographically correctly.
  // name of a map is already defined in separate congiguration script
  const mainLayer = L.imageOverlay(CONFIG.mainMap.url, CONFIG.mainMap.bounds, {
    pane: "main", opacity: CONFIG.mainMap.opacity, interactive: false,
    alt: "dNBR burn severity map"
  }).addTo(map);
  
    map.fitBounds(CONFIG.mainMap.bounds);



// Canvas renderer with a larger tap area (works well with fingers on phones)
const pointRenderer = L.canvas({ pane: "points", tolerance: 12 });


  // Loaders, to load different types of datasets 
  async function fetchBuf(url) {
    const r = await fetch(enc(url));
    if (!r.ok) throw new Error(url + " (" + r.status + ")");
    return r.arrayBuffer();
  }
  async function fetchOptional(url, asText) {
    try {
      const r = await fetch(enc(url));
      if (!r.ok) return null;
      return asText ? r.text() : r.arrayBuffer();
    } catch (e) { return null; }
  }

  function popupHtml(props) {
    const rows = Object.entries(props || {})
      .map(([k, v]) => "<tr><td>" + k + "</td><td>" + (v === null ? "" : v) + "</td></tr>").join("");
    return rows ? "<table>" + rows + "</table>" : "No attributes";
  }

  async function loadShapefile(cfg) {
    const base = cfg.url.replace(/\.shp$/i, "");
    const [shpBuf, dbfBuf, prj] = await Promise.all([
      fetchBuf(base + ".shp"),
      fetchOptional(base + ".dbf", false),
      fetchOptional(base + ".prj", true)
    ]);
    const geoms = shp.parseShp(shpBuf, prj || undefined);
    const props = dbfBuf ? shp.parseDbf(dbfBuf) : [];
    const geojson = shp.combine([geoms, props]);



    return L.geoJSON(geojson, {
      pane: "points",
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
  renderer: pointRenderer,
  pane: "points", radius: 6, color: "#fff", weight: 1,
  fillColor: cfg.color, fillOpacity: 0.9
//added point to layer block for better click and inforamtion on small device too
      }),
      style: () => ({ color: cfg.color, weight: 1.5, fillOpacity: 0.4 }),
      onEachFeature: (f, layer) => layer.bindPopup(popupHtml(f.properties))
    });
  }

  async function loadRaster(cfg) {
    const buf = await fetchBuf(cfg.url);
    const georaster = await parseGeoraster(buf);
    return new GeoRasterLayer({
      georaster, pane: "burnt", opacity: 0.8, resolution: 256, 
      // draw burned pixels only (MODIS burned area: 0 / nodata = not burned)
      pixelValuesToColorFn: (vals) => {
        const v = vals[0];
        if (v === undefined || v === null || isNaN(v) || v <= 0 || v === georaster.noDataValue) return null;
        return cfg.color;
      }
    });
  }

  // Layer checklist on top right
  const registry = {};   // id -> { cfg, layer, loading }

  async function ensureLayer(id) {
    const item = registry[id];
    if (item.layer) return item.layer;
    if (!item.loading) {
      setStatus("Loading " + item.cfg.label + "…");
      item.loading = (item.cfg.type === "raster" ? loadRaster(item.cfg) : loadShapefile(item.cfg))
        .then((l) => { item.layer = l; clearStatus(); return l; })
        .catch((e) => { item.loading = null; setStatus("Could not load " + item.cfg.label + ": " + e.message, true); throw e; });
    }
    return item.loading;
  }

  async function setVisible(id, on) {
    const item = registry[id];
    if (!on) { if (item.layer) map.removeLayer(item.layer); return; }
    try {
      const layer = await ensureLayer(id);
      // Check the box is still ticked after loading finished
      if (item.input.checked) layer.addTo(map);
    } catch (e) { item.input.checked = false; }
  }

  const LayerList = L.Control.extend({
    options: { position: "topright" },
    onAdd: function () {
      const el = L.DomUtil.create("details", "panel");
      el.open = true;
      el.innerHTML = '<summary>Layers</summary><div class="body"></div>';
      const body = el.querySelector(".body");

      CONFIG.layers.forEach((cfg) => {
        const row = document.createElement("label");
        row.className = "layer-row";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!cfg.checked;
        const sw = document.createElement("span");
        sw.className = "swatch" + (cfg.type === "raster" ? " square" : "");
        sw.style.background = cfg.color;
        const txt = document.createElement("span");
        txt.textContent = cfg.label;
        row.append(input, sw, txt);
        body.appendChild(row);

        registry[cfg.id] = { cfg, input, layer: null, loading: null };
        input.addEventListener("change", () => setVisible(cfg.id, input.checked));
      });

      const op = document.createElement("div");
      op.className = "opacity-row";
      op.innerHTML = '<label for="op-main">Burn severity map opacity</label>' +
        '<input id="op-main" type="range" min="0" max="100" value="' + Math.round(CONFIG.mainMap.opacity * 100) + '">';
      body.appendChild(op);
      op.querySelector("input").addEventListener("input", (e) => mainLayer.setOpacity(e.target.value / 100));

      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
      return el;
    }
  });
  map.addControl(new LayerList());

  // Legend on bottom left
  const Legend = L.Control.extend({
    options: { position: "bottomleft" },
    onAdd: function () {
      const el = L.DomUtil.create("details", "panel");
      // Open on larger screens, collapsed on phones
      el.open = window.matchMedia("(min-width: 601px)").matches;
      let html = "<summary>Severity level</summary><div class='body'>";
      CONFIG.legend.forEach((it) => {
        html += "<div class='legend-item'><img src='" + enc(CONFIG.legendFolder + it.img) +
                "' alt=''><span>" + it.label + "</span></div>";
      });
      el.innerHTML = html + "</div>";
      L.DomEvent.disableClickPropagation(el);
      return el;
    }
  });
  map.addControl(new Legend());

// pop message about fire information //
  // Show fire information message after 5 seconds
/* ---------- Hint pop-up after 5 seconds ---------- */
const hintEl = document.getElementById("hint");
let hintTimer = null;

function hideHint() {
  hintEl.classList.add("hide");
  clearTimeout(hintTimer);
}

document.getElementById("hint-close").addEventListener("click", hideHint);

// Show after 5 s, hide automatically after 8 s more
setTimeout(() => {
  hintEl.classList.remove("hide");
  hintTimer = setTimeout(hideHint, 8000);
}, 5000);

// If the user already clicked a fire point, there is no need to show the hint
map.on("popupopen", hideHint);

/// code closed

  // Sidebar toggle (three-arrow button)
  const appBody = document.getElementById("appBody");
  const sideBtn = document.getElementById("sidebarToggle");
  const isPhone = () => window.matchMedia("(max-width: 600px)").matches;

  function setSidebar(open) {
    appBody.classList.toggle("closed", !open);
    sideBtn.setAttribute("aria-expanded", String(open));
    // let the CSS transition finish, then re-measure the map
    setTimeout(() => map.invalidateSize(), 300);
  }

  setSidebar(!isPhone());                       // open on large screens, closed on phones
  sideBtn.addEventListener("click", () => setSidebar(appBody.classList.contains("closed")));
  map.on("click", () => { if (isPhone()) setSidebar(false); });  // tap the map to close on phones
  // Initial layers
  const initial = CONFIG.layers.filter((l) => l.checked).map((l) => setVisible(l.id, true));
  Promise.allSettled(initial).then(clearStatus);

  window.addEventListener("resize", () => map.invalidateSize());
})();
