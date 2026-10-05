
const CONFIG = { mainMap: {
    url: "data/layers/Reclassification_dNBR_0.png",
    bounds: [[26.738345, 80.0582174468], [29.131187, 85.5103624008]],
    attributions: ' ',
    projection: 'EPSG:4326',
    alwaysInRange: true,
    opacity: 0.85,
    },


  // Optional: initial view if bounds are not enough
 initialView: { center: [28.772, 82.784], 
                 zoom: 25 },



 
  // Checklist layers (top right). "checked" = shown when page opens.
  layers: [
    {
      id: "modis_fire",
      label: "MODIS fire incident (2024)",
      type: "shapefile",
      url: "data/MODIS_fire/TAL_Fire_Confidence_GE70_2024.shp",
      checked: false,
      color: "#d6402a"
    },
    {
      id: "modis_burnt",
      label: "MODIS burnt area (2024)",
      type: "raster",
      url: "data/MODIS_burnt area/MODIS_Burned_Area_TAL_2024.tif",
      checked: false,
      color: "#E63946"
    },
    {
      id: "viirs_fire",
      label: "VIIRS fire incident (2024)",
      type: "shapefile",
      url: "data/VIIRS_DATA/final_VIIRS_2024.shp",
      checked: false,
      color: "#00B4D8"
    },
     {
    id: "Tal",
    label: "Terai Arc Landscape",
    type: "shapefile",
    url: "data/tal_shape/talline.shp",
    checked: true,
    color: "#f09a1a"
    
}
  ],

  // Legend: severity name: color swatch PNG in data/legend/
  legend: [
    { label: "Enhanced regrowth, high (post-fire)", img: "Reclassification_dNBR_0_0.png" },
    { label: "Enhanced regrowth, low (post-fire)",  img: "Reclassification_dNBR_0_1.png" },
    { label: "Unburned",                            img: "Reclassification_dNBR_0_2.png" },
    { label: "Low severity",                        img: "Reclassification_dNBR_0_3.png" },
    { label: "Moderate-low severity",               img: "Reclassification_dNBR_0_4.png" },
    { label: "Moderate-high severity",              img: "Reclassification_dNBR_0_5.png" },
    { label: "High severity",                       img: "Reclassification_dNBR_0_6.png" }
  ],
  legendFolder: "data/legend/"
};
