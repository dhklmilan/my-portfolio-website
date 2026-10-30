
(function () {
  "use strict";

  var CAT_COLORS = { "Death": "#991B1B", "Human Injury": "#F4735B", "Crop Damage": "#0ba81e", 
                     "Property Damage": "#3B82F6", "Livestock Depredation": "#A855F7" };
  var CAT_ICONS = { "Death": "☠️", "Human Injury": "🩹", "Crop Damage": "🌾", "Property Damage": "🏚️", "Livestock Depredation": "🐐" };
  var POLY_STYLE = { color: "#D97706", weight: 2, fillColor: "#A3B84C", fillOpacity: 0.4 };
  var PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="100%" height="100%" fill="#E2E8F0"/>' +
    '<text x="50%" y="50%" font-family="Arial" font-size="15" fill="#64748B" text-anchor="middle">No Image</text></svg>');

  var map, pointLayer, polyLayer, speciesChart, yearChart;
  var records = [], byId = {}, markerById = {}, polyById = {};
  var F = { group: "All", cat: "All", muni: "All", ward: "All", year: "All", status: "All" };

  document.addEventListener("DOMContentLoaded", function () {
    initMap();
    Promise.all(["data/incidents.json", "data/conflict_points.geojson", "data/crop_damage.geojson"].map(function (u) {
      return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
    })).then(function (d) { build(d[0], d[1], d[2]); })
      .catch(function (e) {
        document.getElementById("listings-container").innerHTML =
          '<p class="modal-hint" style="padding:16px">Could not load data (' + e.message + '). Run through a local web server — see README.</p>';
      });
  }); 
  function initMap() {
    map = L.map("map").setView([26.660922, 88.113331], 8);

    var light= L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '© Google'
  })
    
    var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: '&copy; OpenStreetMap contributors', subdomains: "abc", maxZoom: 19 });
   

    var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri", maxZoom: 19 }).addTo(map);


      
   var boundaryLayer = L.geoJSON(null, {
  style: {
    color: "#D97706",
    weight: 2,
    fill: false
  },
  interactive: false,
  
// which feature of shape file is going to label in web app
  onEachFeature: function (feature, layer) {
    var name = feature.properties.WARD_NAME; // Change NAME to your shapefile field

    if (name) {
      layer.bindTooltip(name, {
        permanent: true,
        direction: "center",
        className: "municipality-label",
        opacity: 0.7
       
      });
    }
  }
}).addTo(map);


// zoom in to view the label
map.on("zoomend", function () {
  if (map.getZoom() >= 13) {
    boundaryLayer.eachLayer(function (layer) {
      if (layer.getTooltip()) layer.openTooltip();
    });
  } else {
    boundaryLayer.eachLayer(function (layer) {
      if (layer.getTooltip()) layer.closeTooltip();
    });
  }
});



// Municipality label styling
const municipalityStyle = document.createElement("style");

municipalityStyle.innerHTML = `
  .municipality-label {
    background: rgba(23, 71, 107, 0.92) !important;
    border: 1px solid rgba(255, 255, 255, 0.35) !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22) !important;

    color: #ffffff !important;
    font-size: 10px !important;
    font-weight: 600;
    font-family: "Segoe UI", Arial, sans-serif;
    padding: 5px 12px !important;
    border-radius: 20px !important;
    text-align: center;
    white-space: nowrap;
    text-shadow: none !important;
    pointer-events: none;
  }

  .municipality-label::before {
    display: none !important;
  }
`;

document.head.appendChild(municipalityStyle);


// style of label end here




    // path: forward slashes, and NO .shp extension
 shp(new URL("data/jhapa_boundary/ward_boundary", document.baseURI).href)
  .then(function (g) {
    boundaryLayer.addData(g);
    console.log("Jhapa boundary loaded successfully");
  })
  .catch(function (e) {
    console.error("Boundary shapefile not loaded:", e);
  });
    L.control.layers(
      { "Streets (OSM)": osm, "Satellite": sat, "Satellite (detailed)": light, },
      { "Mechinagar Municipal Boundary": boundaryLayer },
      { position: "topright" }
    ).addTo(map);

    polyLayer = L.featureGroup().addTo(map);
    pointLayer = L.featureGroup().addTo(map);

    var legend = L.control({ position: "bottomleft" });
    legend.onAdd = function () {
      var d = L.DomUtil.create("div", "legend");
      d.innerHTML =
        '<button type="button" class="legend-toggle" aria-expanded="true" title="Show / hide legend">' +
          '<h4>Damage category</h4><span class="legend-chevron">▾</span></button>' +
        '<div class="legend-body">' +
          Object.keys(CAT_COLORS).map(function (k) {
            return '<div><span class="sw" style="background:' + CAT_COLORS[k] + '"></span>' + k + "</div>";
          }).join("") +
          '<div><span class="sq" style="' +
'background:' + POLY_STYLE.color + ';' +
'border:2px solid ' + POLY_STYLE.fillColor + ';' +
'"></span>Crop-damage area</div>' +
        "</div>";

      var btn = d.querySelector(".legend-toggle");
      function setCollapsed(c) {
        d.classList.toggle("collapsed", c);
        btn.setAttribute("aria-expanded", String(!c));
      }
      btn.addEventListener("click", function () { setCollapsed(!d.classList.contains("collapsed")); });
      if (window.innerWidth <= 480) setCollapsed(true);   // start minimised on small phones; delete this line to always start open
      L.DomEvent.disableClickPropagation(d);               // clicking the legend doesn't click the map
      return d;
    };
    legend.addTo(map);
    if ("ResizeObserver" in window) new ResizeObserver(function () { map.invalidateSize(); }).observe(document.getElementById("map"));
  }











  
  // ---- geometry: polygon area in hectares (local equirectangular projection) ----
  function polyAreaHa(coords) {
    var ring = coords[0], lat0 = ring[0][1] * Math.PI / 180, kx = 111320 * Math.cos(lat0), ky = 110574, s = 0;
    for (var i = 0; i < ring.length - 1; i++) {
      s += (ring[i][0] * kx) * (ring[i + 1][1] * ky) - (ring[i + 1][0] * kx) * (ring[i][1] * ky);
    }
    return Math.abs(s) / 2 / 10000;
  }

  function build(inc, pts, polys) {
    inc.forEach(function (r) { byId[r.incident_id] = r; });
    pts.features.forEach(function (f) {
      var r = byId[f.properties.incident_id];
      if (r) { r.lng = f.geometry.coordinates[0]; r.lat = f.geometry.coordinates[1]; }
    });
    polys.features.forEach(function (f) {
      var r = byId[f.properties.incident_id];
      if (r) { r.polygon = f; r.polygon_area_ha = polyAreaHa(f.geometry.coordinates); }
    });
    records = inc.filter(function (r) { return r.lat != null; });
    records.forEach(function (r) { r.year = +r.incident_date.slice(0, 4); });
    fillSelects();
    bindFilters();
    render(true);
  }

  // ---- filters ----
  function uniq(key, num) {
    var v = records.map(function (r) { return r[key]; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    return v.sort(num ? function (a, b) { return a - b; } : undefined);
  }
  function fillSelect(id, label, vals) {
    document.getElementById(id).innerHTML = '<option value="All">All ' + label + "</option>" +
      vals.map(function (v) { return '<option value="' + v + '">' + v + "</option>"; }).join("");
  }
  function fillSelects() {
    fillSelect("f-muni", "municipalities", uniq("municipality"));
    fillSelect("f-ward", "wards", uniq("ward", true));
    fillSelect("f-year", "years", uniq("year", true).reverse());
    fillSelect("f-status", "statuses", uniq("mitigation_status"));
  }
  function bindFilters() {
    function pick(barId, attr, key) {
      document.getElementById(barId).addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x === b); });
        F[key] = b.getAttribute(attr); render(true);
      });
    }
    pick("group-bar", "data-group", "group");
    pick("category-bar", "data-cat", "cat");
    [["f-muni", "muni"], ["f-ward", "ward"], ["f-year", "year"], ["f-status", "status"]].forEach(function (p) {
      document.getElementById(p[0]).addEventListener("change", function (e) { F[p[1]] = e.target.value; render(true); });
    });
  }
  function filtered() {
    return records.filter(function (r) {
      return (F.group === "All" || r.wildlife_group === F.group) && (F.cat === "All" || r.damage_category === F.cat) &&
        (F.muni === "All" || r.municipality === F.muni) && (F.ward === "All" || String(r.ward) === F.ward) &&
        (F.year === "All" || String(r.year) === F.year) && (F.status === "All" || r.mitigation_status === F.status);
    });
  }

  // ---- helpers ----
  function areaOf(r) { return r.polygon ? r.polygon_area_ha : (r.area_damaged_ha || 0); }
  function npr(n) { return "NPR " + Math.round(n).toLocaleString("en-US"); }
  function fmtDate(s) { return new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function photoOf(r, i) { return (r.photos && r.photos[i || 0]) || PLACEHOLDER; }
  function badge(r) { return '<span class="badge" style="background:' + CAT_COLORS[r.damage_category] + '">' + esc(r.damage_category) + "</span>"; }

     function popupOpts() {
    var w = window.innerWidth, small = w <= 600;
    return {
      maxWidth: Math.min(380, w - 56),
      maxHeight: small ? Math.max(150, map.getSize().y - 110) : null,   // scrolls inside if taller than the map
      autoPanPaddingTopLeft: L.point(12, small ? 64 : 20),               // keeps clear of the top buttons
      autoPanPaddingBottomRight: L.point(12, 16)
    };
  }
    var LBL = "font-style:normal;font-weight:600;color:var(--navy);flex:0 0 64px;";   // label column
  function popupHtml(r) {
    var col = CAT_COLORS[r.damage_category] || "#64748B";
    var thumbs = (r.photos || []).length > 1 ? '<div class="gallery-strip">' + r.photos.map(function (p, i) {
      return '<img class="gallery-thumb' + (i ? "" : " active") + '" src="' + esc(photoOf(r, i)) + '" data-gallery-thumb alt="Photo ' + (i + 1) + '" />';
    }).join("") + "</div>" : "";
    var tiles = '<div class="pc-tile"><span>Est. loss</span><b>' + npr(r.economic_loss_npr) + "</b></div>" +
      (areaOf(r) ? '<div class="pc-tile"><span>' + (r.polygon ? "Area (polygon)" : "Area (reported)") + "</span><b>" + areaOf(r).toFixed(2) + " ha</b></div>" : "");
    return '<div class="popup-card" style="--cat:' + col + '">' +
      '<div class="pc-media"><img class="gallery-main" src="' + esc(photoOf(r)) + '" alt="" onerror="this.src=\'' + PLACEHOLDER + '\'" />' + thumbs + "</div>" +
      '<div class="card-body pc-info">' +
        '<div class="popup-head"><span class="card-id">' + esc(r.incident_id) + "</span>" + badge(r) + "</div>" +
        '<div class="card-title">' + esc(r.species) + "</div>" +
       
                '<div class="info-rows">' +
          '<div><em style="' + LBL + '">Date</em><span>' + fmtDate(r.incident_date) + "</span></div>" +
          '<div><em style="' + LBL + '">Location</em><span>' + esc(r.municipality) + ", Ward " + esc(r.ward) + "</span></div>" +
          '<div class="pc-extra"><em style="' + LBL + '">Affected</em><span>' + esc(r.affected_person) + "</span></div>" +
          (r.crop ? '<div class="pc-extra"><em style="' + LBL + '">Crop</em><span>' + esc(r.crop) + "</span></div>" : "") +
          '<div class="pc-extra"><em style="' + LBL + '">Mitigation</em><span>' + esc(r.mitigation_status) + "</span></div>" +
        "</div>"  +
        '<div class="pc-tiles">' + tiles + "</div>" +
        '<button type="button" class="pc-more">More details ▾</button>' +
      "</div>" +
      '<div class="pc-foot">' + (r.description ? "<p>" + esc(r.description) + "</p>" : "") +
        "<small>Policy no. " + esc(r.policy_number) + (r.is_sample_data ? "" : "") + "</small></div>" +
    "</div>";    
  }
//Fictional sample record put inside ""

   function bindGallery(e) {
    var el = e.popup.getElement(), main = el.querySelector(".gallery-main");
    el.querySelectorAll("[data-gallery-thumb]").forEach(function (t) {
      t.addEventListener("click", function () {
        main.src = t.src;
        el.querySelectorAll("[data-gallery-thumb]").forEach(function (x) { x.classList.toggle("active", x === t); });
      });
    });

    var more = el.querySelector(".pc-more"), card = el.querySelector(".popup-card"),
        content = el.querySelector(".leaflet-popup-content");
    if (more) more.addEventListener("click", function (ev) {
      L.DomEvent.stopPropagation(ev);                       // never let this click reach the map
      var on = card.classList.toggle("expanded");
      more.textContent = on ? "Less ▴" : "More details ▾";
      // no popup.update() here: it rebuilds the HTML and closes the popup
      content.style.maxHeight = (map.getSize().y - 100) + "px";   // scroll inside if taller than the map
      content.style.overflowY = "auto";
      setTimeout(function () {                              // keep the top of the popup in view
        var pr = el.getBoundingClientRect(), mr = map.getContainer().getBoundingClientRect();
        var over = (mr.top + 64) - pr.top;                  // 64px = space for the top buttons
        if (over > 0) map.panBy([0, -over]);
      }, 0);
    });
  }

  // ---- render ----
  function render(fit) {
    var list = filtered();
    pointLayer.clearLayers(); polyLayer.clearLayers(); markerById = {}; polyById = {};
    list.forEach(function (r) {
      var m, col = CAT_COLORS[r.damage_category];
if (r.damage_category === "Crop Damage") {
  // square marker for crop damage
  m = L.marker([r.lat, r.lng], {
    icon: L.divIcon({
      className: "",
      iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9],
      html: '<div style="box-sizing:border-box;width:16px;height:16px;' +
      'background:transparent;' +
      'border:2px solid ' + col + ';' +
      'border-radius:2px;' +
      'box-shadow:0 0 0 1px rgba(15,23,42,.25);"></div>'
    })
  });          
} else {
  m = L.circleMarker([r.lat, r.lng], { radius: 6, color: "#fff", weight: 3, fillColor: col, fillOpacity: 1 });
}
      m.bindPopup(popupHtml(r), { maxWidth: 280 }).on("popupopen", bindGallery);
      pointLayer.addLayer(m); markerById[r.incident_id] = m;
      if (r.polygon) {
        var p = L.geoJSON(r.polygon, { style: POLY_STYLE });
        p.bindPopup(popupHtml(r), { maxWidth: 280 }).on("popupopen", bindGallery);
        polyLayer.addLayer(p); polyById[r.incident_id] = p;
      }
    });
    renderList(list); renderStats(list); renderCharts(list);
    if (fit && list.length) map.fitBounds(pointLayer.getBounds().pad(0.2), { maxZoom: 18 });
  }

  function renderList(list) {
    document.getElementById("listings-count").textContent = list.length + (list.length === 1 ? " incident" : " incidents");
    var box = document.getElementById("listings-container");
    if (!list.length) { box.innerHTML = '<p class="modal-hint" style="padding:8px">No incidents match these filters. Reset a filter to see more.</p>'; return; }
    box.innerHTML = list.map(function (r) {
      return '<div class="property-card" data-id="' + r.incident_id + '"><img class="card-image card-thumb" src="' + esc(photoOf(r)) +
        '" alt="" loading="lazy" onerror="this.src=\'' + PLACEHOLDER + '\'" /><div class="card-body"><div class="card-top-row"><div class="card-title">' +
        esc(r.species) + "</div>" + badge(r) + '</div><div class="card-meta"><span class="card-id">' + esc(r.incident_id) +
        '</span><span class="dot"></span><span>' + fmtDate(r.incident_date) + '</span><span class="dot"></span><span>' + esc(r.municipality) + "-" + esc(r.ward) +
        '</span></div><div class="card-price">' + npr(r.economic_loss_npr) + "</div></div></div>";
    }).join("");
    box.querySelectorAll(".property-card").forEach(function (c) {
      c.addEventListener("click", function () {
        var m = markerById[c.dataset.id]; if (!m) return;
        box.querySelectorAll(".card-active").forEach(function (x) { x.classList.remove("card-active"); });
        c.classList.add("card-active");
        map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.8 });
        map.once("moveend", function () { m.openPopup(); });
        if (window.innerWidth <= 860) document.getElementById("map-wrapper").scrollIntoView({ block: "nearest" });
      });
    });
  }

  function renderStats(list) {
    var deaths = list.filter(function (r) { return r.damage_category === "Death"; }).length;
    var inj = list.filter(function (r) { return r.damage_category === "Human Injury"; }).length;
    var ha = list.reduce(function (s, r) { return s + areaOf(r); }, 0);
    var loss = list.reduce(function (s, r) { return s + r.economic_loss_npr; }, 0);
    var items = [[list.length, "Incidents"], [deaths, "Human deaths"], [inj, "Human injuries"],
      [ha.toFixed(2) + " ha", "Crop area damaged"], [npr(loss).replace("NPR ", "NPR\u00a0"), "Estimated loss"]];
    document.getElementById("stats").innerHTML = items.map(function (i) {
      return '<div class="stat"><b>' + i[0] + "</b><span>" + i[1] + "</span></div>";
    }).join("");
  }

  function renderCharts(list) {
    var sp = {}, yr = {};
    list.forEach(function (r) { sp[r.species] = (sp[r.species] || 0) + 1; yr[r.year] = (yr[r.year] || 0) + 1; });
    var sl = Object.keys(sp), years = uniq("year", true);
    var ys = years.map(function (y) { return yr[y] || 0; });
    var opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } };
    if (!speciesChart) {
      speciesChart = new Chart(document.getElementById("chart-species"), { type: "bar",
        data: { labels: sl, datasets: [{ data: sl.map(function (k) { return sp[k]; }), backgroundColor: "#27374D", borderRadius: 6 }] }, options: opts });
      yearChart = new Chart(document.getElementById("chart-year"), { type: "line",
        data: { labels: years, datasets: [{ data: ys, borderColor: "#10B981", backgroundColor: "rgba(16,185,129,.15)", fill: true, tension: 0.3, pointRadius: 4 }] }, options: opts });
    } else {
      speciesChart.data.labels = sl; speciesChart.data.datasets[0].data = sl.map(function (k) { return sp[k]; }); speciesChart.update();
      yearChart.data.labels = years; yearChart.data.datasets[0].data = ys; yearChart.update();
    }
  }
})();
