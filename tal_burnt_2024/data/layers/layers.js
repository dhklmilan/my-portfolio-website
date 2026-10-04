ol.proj.proj4.register(proj4);
//ol.proj.get("EPSG:4326").setExtent([79.921914, 26.405494, 85.646666, 29.476634]);
var wms_layers = [];

var lyr_Reclassification_dNBR_0 = new ol.layer.Image({
        opacity: 1,
        
    title: 'Reclassification_dNBR<br />\
    <img src="styles/legend/Reclassification_dNBR_0_0.png" /> Enhanced Regrowth<br />\
    <img src="styles/legend/Reclassification_dNBR_0_1.png" /> Enhanced Regrowth, low<br />\
    <img src="styles/legend/Reclassification_dNBR_0_2.png" /> Unburned<br />\
    <img src="styles/legend/Reclassification_dNBR_0_3.png" /> Low severity<br />\
    <img src="styles/legend/Reclassification_dNBR_0_4.png" /> Moderate Low severity<br />\
    <img src="styles/legend/Reclassification_dNBR_0_5.png" /> Moderate High severity<br />\
    <img src="styles/legend/Reclassification_dNBR_0_6.png" /> High severity<br />' ,
        
        
        source: new ol.source.ImageStatic({
            url: "./layers/Reclassification_dNBR_0.png",
            attributions: ' ',
            projection: 'EPSG:4326',
            alwaysInRange: true,
            imageExtent: [80.058217, 26.744643, 85.510362, 29.137485]
        })
    });

lyr_Reclassification_dNBR_0.setVisible(true);
var layersList = [lyr_Reclassification_dNBR_0];
