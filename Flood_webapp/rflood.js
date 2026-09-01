/* first config*/
const CONFIG = {
  data: {
    // Post-flood NDWI PNG generated from QQ
    // The PNG itself has no georeferencing, so its EPSG:3857
    // extent is defined below in the raster section.
    postNDWI: 'data/postNDWI_0.png',
    settlements: 'data/settlement.shp',
    mudslide: 'data/origin_mudslide.shp'
  },

  // QGIS2Web image extent, EPSG:3857 
  postNDWIExtent: [
    9388600.000000,
    3206223.220274,
    9537220.000000,
    3310060.056961
  ],

  map: {
    center: [27.97266, 85.18517],
    zoom: 15,
    minZoom: 4,
    maxZoom: 20
  }
};


/* basemaps */
const BASEMAPS = {
  googleSat: L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '© Google'
  }),

  googleHybrid: L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '© Google'
  }),

  esriSat: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: '© Esri'
    }
  ),

  osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  })
};


let currentBasemap = null;

function setBasemap(map, key) {
  const next = BASEMAPS[key];

  if (next) {
    if (currentBasemap) {
      map.removeLayer(currentBasemap);
    }

    next.addTo(map);
    next.setZIndex(0);
    currentBasemap = next;
  }
}


/* second map initialization*/
const map = L.map('map', {
  center: CONFIG.map.center,
  zoom: CONFIG.map.zoom,
  minZoom: CONFIG.map.minZoom,
  maxZoom: CONFIG.map.maxZoom,
  zoomControl: false
});

L.control.zoom({
  position: 'bottomright'
}).addTo(map);

L.control.scale({
  position: 'bottomleft',
  imperial: false
}).addTo(map);

setBasemap(map, 'googleHybrid');


/*
 * This keeps the NDWI independently above the basemap
 */
map.createPane('ndwiPane');
map.getPane('ndwiPane').style.zIndex = 350;


/* ui help */
const mapWrap = document.querySelector('.map-wrap');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

function showLoading(text) {
  loadingText.textContent = text || 'Loading…';
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

function removeBanner() {
  const el = document.getElementById('activeBanner');

  if (el) {
    el.remove();
  }
}

function showBanner(message, opts = {}) {
  const {
    type = 'info',
    timeout = 0
  } = opts;

  removeBanner();

  const icons = {
    info: 'ℹ',
    error: '⚠',
    success: '✓'
  };

  const el = document.createElement('div');

  el.className = 'map-banner ' + type;
  el.id = 'activeBanner';

  el.innerHTML = `
    <span>${icons[type] || ''} ${message}</span>
    <button aria-label="Dismiss">✕</button>
  `;

  el.querySelector('button').addEventListener('click', removeBanner);

  mapWrap.appendChild(el);

  if (timeout) {
    setTimeout(removeBanner, timeout);
  }
}



/*
 * QGIS2Web gives the raster extent in EPSG:3857:
 *
 * [xmin, ymin, xmax, ymax]
 *
 * Leaflet's L.imageOverlay() expects geographical
 * latitude/longitude bounds.
 *
 * Therefore we convert the four EPSG:3857 coordinates
 * to Leaflet LatLng coordinates before creating the overlay.
 */
function getPostNDWIBounds() {

  const extent = CONFIG.postNDWIExtent;

  const xmin = extent[0];
  const ymin = extent[1];
  const xmax = extent[2];
  const ymax = extent[3];

  const southwest = L.CRS.EPSG3857.unproject(
    L.point(xmin, ymin)
  );

  const northeast = L.CRS.EPSG3857.unproject(
    L.point(xmax, ymax)
  );

  return L.latLngBounds(
    southwest,
    northeast
  );
}


/*
 * Load the PNG first so that GitHub Pages 404 errors
 * can be detected before the layer is added to the map.
 */
function buildNdwiLayer() {

  return new Promise((resolve, reject) => {

    const image = new Image();

    image.onload = function () {

      const bounds = getPostNDWIBounds();

      const layer = L.imageOverlay(
        CONFIG.data.postNDWI,
        bounds,
        {
          opacity: 1,
          pane: 'ndwiPane',
          interactive: false
        }
      );

      resolve(layer);
    };

    image.onerror = function () {

      reject(
        new Error(
          `HTTP error while loading ${CONFIG.data.postNDWI}`
        )
      );
    };

   
    image.src = CONFIG.data.postNDWI;
  });
}


async function autoLoadPostNDWI() {

  showLoading(
    'Loading post-flood NDWI map…'
  );

async function autoLoadSettlements() {

  showLoading(
    'Loading settlement layer…'
  );

  try {
    const response = await fetch('data/settlements.zip');

    if (!response.ok) {
      throw new Error(`Failed to fetch settlements.zip (${response.status})`);
    }

    const buffer = await response.arrayBuffer();

    const geojson = await shp(buffer);

    settlementLayer = L.geoJSON(geojson, {
      style: {
        color: '#ff0000',
        weight: 1.5,
        fillColor: '#ff0000',
        fillOpacity: 0.15
      }
    }).addTo(map);

    console.log('Settlement layer loaded successfully.');

  } catch (error) {

    console.error('Settlement loading failed:', error);

    alert(
      'Settlement layer could not be loaded. ' +
      'Please check data/settlements.zip'
    );

  } finally {

    hideLoading();

  }
}





  try {

    const layer = await buildNdwiLayer();

    hideLoading();

    return layer;

  } catch (err) {

    hideLoading();

    throw err;
  }
}


/*ORIGIN*/

function buildMudslideLayer(geojson) {

  return L.geoJSON(geojson, {

    style: {
      color: '#f2545b',
      weight: 2,
      opacity: 0.9,
      fillColor: '#f2545b',
      fillOpacity: 0.18
    },

    onEachFeature: (feature, layer) => {

      const props = feature.properties;

      if (props && Object.keys(props).length) {

        const rows = Object.entries(props)
          .slice(0, 10)
          .map(
            ([k, v]) =>
              `<strong>${k}:</strong> ${v}`
          )
          .join('<br>');

        layer.bindPopup(rows);
      }
    }
  });
}


/* SETTLEMENTS */

function buildSettlementsLayer(geojson) {

  return L.geoJSON(geojson, {

    style: {
      color: '#f2a93b',
      weight: 2,
      opacity: 0.9,
      fillColor: '#f2a93b',
      fillOpacity: 0.12
    },

    onEachFeature: (feature, layer) => {

      const props = feature.properties;

      if (props && Object.keys(props).length) {

        const rows = Object.entries(props)
          .slice(0, 10)
          .map(
            ([k, v]) =>
              `<strong>${k}:</strong> ${v}`
          )
          .join('<br>');

        layer.bindPopup(rows);
      }
    }
  });
}


async function loadSettlementsAuto(baseUrl) {

  if (/\.zip$/i.test(baseUrl)) {

    const res = await fetch(baseUrl);

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status} for ${baseUrl}`
      );
    }

    const buf = await res.arrayBuffer();

    let geojson = await shp(buf);

    if (Array.isArray(geojson)) {
      geojson = geojson[0];
    }

    return geojson;
  }


  /*
   * A lone .shp has no attribute table.
   * Fetch the matching .dbf and .prj too.
   */
  const base = baseUrl.replace(/\.shp$/i, '');

  const shpRes = await fetch(base + '.shp');

  if (!shpRes.ok) {
    throw new Error(
      `HTTP ${shpRes.status} for ${base}.shp`
    );
  }

  const [dbfRes, prjRes] = await Promise.all([
    fetch(base + '.dbf').catch(() => null),
    fetch(base + '.prj').catch(() => null)
  ]);

  const shpBuf = await shpRes.arrayBuffer();

  const prjText =
    (prjRes && prjRes.ok)
      ? await prjRes.text()
      : undefined;

  const geometries =
    shp.parseShp(shpBuf, prjText);

  let properties = [];

  if (dbfRes && dbfRes.ok) {
    properties =
      shp.parseDbf(
        await dbfRes.arrayBuffer()
      );
  }

  return shp.combine([
    geometries,
    properties
  ]);
}


async function loadSettlementsFromFileList(fileList) {

  const files = Array.from(fileList);

  const zipFile =
    files.find(
      f => /\.zip$/i.test(f.name)
    );

  if (zipFile) {

    const buf =
      await zipFile.arrayBuffer();

    let geojson =
      await shp(buf);

    if (Array.isArray(geojson)) {
      geojson = geojson[0];
    }

    return geojson;
  }


  const shpFile =
    files.find(
      f => /\.shp$/i.test(f.name)
    );

  const dbfFile =
    files.find(
      f => /\.dbf$/i.test(f.name)
    );

  const prjFile =
    files.find(
      f => /\.prj$/i.test(f.name)
    );

  if (!shpFile) {
    throw new Error(
      'select a .zip shapefile, or at least a .shp file'
    );
  }

  const shpBuf =
    await shpFile.arrayBuffer();

  const prjText =
    prjFile
      ? await prjFile.text()
      : undefined;

  const geometries =
    shp.parseShp(
      shpBuf,
      prjText
    );

  let properties = [];

  if (dbfFile) {
    properties =
      shp.parseDbf(
        await dbfFile.arrayBuffer()
      );
  }

  return shp.combine([
    geometries,
    properties
  ]);
}


/* =========================================================
   LAYER STYLE
   ========================================================= */

const layerInstances = {};


async function setPostNDWIVisible(visible) {

  if (!visible) {

    if (layerInstances.postNDWI) {
      map.removeLayer(
        layerInstances.postNDWI
      );
    }

    updateSwipe();

    return;
  }


  if (layerInstances.postNDWI) {

    layerInstances.postNDWI.addTo(map);

    updateSwipe();

    return;
  }


  try {

    const layer =
      await autoLoadPostNDWI();

    layerInstances.postNDWI =
      layer;

    layer.addTo(map);


    /*
     * Zoom to the PNG's actual geographical extent.
     */
    const bounds =
      layer.getBounds();

    if (
      bounds &&
      bounds.isValid()
    ) {

      map.fitBounds(
        bounds,
        {
          padding: [20, 20]
        }
      );
    }

    updateSwipe();

  } catch (err) {

    document.getElementById(
      'togglePostNDWI'
    ).checked = false;

    showBanner(
      `Couldn't load the post-flood NDWI PNG from ${CONFIG.data.postNDWI} (${err.message}). Check that the PNG is hosted at that path.`,
      {
        type: 'error'
      }
    );
  }
}


async function setSettlementsVisible(visible) {

  if (!visible) {

    if (layerInstances.settlements) {

      map.removeLayer(
        layerInstances.settlements
      );
    }

    return;
  }


  if (layerInstances.settlements) {

    layerInstances.settlements.addTo(map);

    layerInstances.settlements.bringToFront();

    return;
  }


  try {

    showLoading(
      'Looking for ' +
      CONFIG.data.settlements +
      ' …'
    );

    const geojson =
      await loadSettlementsAuto(
        CONFIG.data.settlements
      );

    hideLoading();

    const layer =
      buildSettlementsLayer(
        geojson
      );

    layerInstances.settlements =
      layer;

    layer.addTo(map);

    layer.bringToFront();

  } catch (err) {

    hideLoading();

    document.getElementById(
      'toggleSettlements'
    ).checked = false;

    showBanner(
      `Couldn't load settlement boundaries from data/settlement.shp (${err.message}). Check that the files are hosted at that path.`,
      {
        type: 'error'
      }
    );
  }
}


async function setMudslideVisible(visible) {

  if (!visible) {

    if (layerInstances.mudslide) {

      map.removeLayer(
        layerInstances.mudslide
      );
    }

    return;
  }


  if (layerInstances.mudslide) {

    layerInstances.mudslide.addTo(map);

    layerInstances.mudslide.bringToFront();

    return;
  }


  try {

    showLoading(
      'Looking for ' +
      CONFIG.data.mudslide +
      ' …'
    );

    const geojson =
      await loadSettlementsAuto(
        CONFIG.data.mudslide
      );

    hideLoading();

    const layer =
      buildMudslideLayer(
        geojson
      );

    layerInstances.mudslide =
      layer;

    layer.addTo(map);

    layer.bringToFront();

  } catch (err) {

    hideLoading();

    document.getElementById(
      'toggleMudslide'
    ).checked = false;

    showBanner(
      `Couldn't load the mudflow/debris-flow layer from data/origin_mudslide.shp (${err.message}). Check that the files are hosted at that path.`,
      {
        type: 'error'
      }
    );
  }
}


/* layer toggles */

document
  .getElementById('togglePostNDWI')
  .addEventListener(
    'change',
    e =>
      setPostNDWIVisible(
        e.target.checked
      )
  );


document
  .getElementById('toggleSettlements')
  .addEventListener(
    'change',
    e =>
      setSettlementsVisible(
        e.target.checked
      )
  );


document
  .getElementById('toggleMudslide')
  .addEventListener(
    'change',
    e =>
      setMudslideVisible(
        e.target.checked
      )
  );


/* =========================================================
   SWIPER DIVIDER
   ========================================================= */

let swipePos = 50;

const swipeHandle =
  document.getElementById(
    'swipeHandle'
  );


function swipeShouldBeActive() {

  return (
    document.getElementById(
      'enableSwipe'
    ).checked &&

    !!layerInstances.postNDWI &&

    map.hasLayer(
      layerInstances.postNDWI
    )
  );
}


function positionHandle() {

  swipeHandle.style.left =
    swipePos + '%';
}


function applyClip() {

  const pane =
    map.getPane('ndwiPane');

  if (!pane) {
    return;
  }

  const size =
    map.getSize();

  const desiredScreenX =
    size.x *
    (swipePos / 100);

  const paneTransform =
    map._mapPane
      ? L.DomUtil.getPosition(
          map._mapPane
        )
      : {
          x: 0,
          y: 0
        };

  const localX =
    desiredScreenX -
    paneTransform.x;

  const BIG = 100000;

  pane.style.clipPath =
    `inset(-${BIG}px -${BIG}px -${BIG}px ${localX}px)`;
}


function updateSwipe() {

  const active =
    swipeShouldBeActive();

  swipeHandle.classList.toggle(
    'active',
    active
  );

  const pane =
    map.getPane('ndwiPane');

  if (!active) {

    if (pane) {
      pane.style.clipPath = '';
    }

    return;
  }

  positionHandle();

  applyClip();
}


map.on(
  'move zoom',
  () => {

    if (
      swipeShouldBeActive()
    ) {
      applyClip();
    }
  }
);


map.on(
  'resize',
  () => {

    if (
      swipeShouldBeActive()
    ) {
      applyClip();
    }
  }
);


document
  .getElementById('enableSwipe')
  .addEventListener(
    'change',
    updateSwipe
  );


let dragging = false;


swipeHandle.addEventListener(
  'pointerdown',
  e => {

    dragging = true;

    swipeHandle.setPointerCapture(
      e.pointerId
    );
  }
);


swipeHandle.addEventListener(
  'pointermove',
  e => {

    if (!dragging) {
      return;
    }

    const rect =
      document
        .getElementById('map')
        .getBoundingClientRect();

    let pct =
      (
        (e.clientX - rect.left) /
        rect.width
      ) * 100;

    pct =
      Math.min(
        100,
        Math.max(
          0,
          pct
        )
      );

    swipePos = pct;

    positionHandle();

    applyClip();
  }
);


[
  'pointerup',
  'pointercancel'
].forEach(
  evt =>
    swipeHandle.addEventListener(
      evt,
      () => {
        dragging = false;
      }
    )
);


/* =========================================================
   BASEMAP SWITCHING
   ========================================================= */

document
  .getElementById('basemapSelect')
  .addEventListener(
    'change',
    e => {
      setBasemap(
        map,
        e.target.value
      );
    }
  );


/* =========================================================
   HUD READOUT
   ========================================================= */

map.on(
  'mousemove',
  e => {

    document.getElementById(
      'hudLat'
    ).textContent =
      e.latlng.lat.toFixed(5);

    document.getElementById(
      'hudLng'
    ).textContent =
      e.latlng.lng.toFixed(5);
  }
);


map.on(
  'zoomend',
  () => {

    document.getElementById(
      'hudZoom'
    ).textContent =
      map.getZoom();
  }
);


document.getElementById(
  'hudZoom'
).textContent =
  map.getZoom();


/* =========================================================
   SIDEBAR TOGGLE
   ========================================================= */

const sidebar =
  document.getElementById(
    'sidebar'
  );


document
  .getElementById('sidebarToggle')
  .addEventListener(
    'click',
    () => {

      if (
        window.innerWidth <= 860
      ) {

        sidebar.classList.toggle(
          'open'
        );

      } else {

        sidebar.classList.toggle(
          'collapsed'
        );
      }
    }
  );


/* =========================================================
   INITIAL LOAD
   ========================================================= */

async function init() {

  try {

    const layer =
      await autoLoadPostNDWI();

    layerInstances.postNDWI =
      layer;

    layer.addTo(map);

    /*
     * Keep your original map center and zoom.
     * We don't automatically fit to the raster here.
     */
    map.setView(
      CONFIG.map.center,
      CONFIG.map.zoom
    );

  } catch (err) {

    map.setView(
      CONFIG.map.center,
      CONFIG.map.zoom
    );

    document.getElementById(
      'togglePostNDWI'
    ).checked = false;

    showBanner(
      `No post-flood NDWI PNG found automatically (${err.message}). Check that ${CONFIG.data.postNDWI} is hosted at that path.`,
      {
        type: 'error'
      }
    );
  }

  updateSwipe();
}


init();