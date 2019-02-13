var renderer;
var lastCall = 0;
var theTempLayer;

require([
"esri/map",
"esri/InfoTemplate",
"esri/tasks/GeometryService",
"esri/layers/ArcGISDynamicMapServiceLayer",
"esri/tasks/BufferParameters",
"esri/symbols/SimpleFillSymbol",
"esri/symbols/SimpleLineSymbol",
"esri/symbols/PictureMarkerSymbol",

"esri/tasks/IdentifyTask",
"esri/tasks/IdentifyParameters",
"esri/dijit/Popup",
"esri/layers/FeatureLayer",

"esri/graphic",
"esri/geometry/normalizeUtils",
"esri/geometry/Point",


"esri/symbols/SimpleMarkerSymbol",
"esri/symbols/SimpleLineSymbol",
"esri/symbols/SimpleFillSymbol",

"esri/tasks/query",
"dojo/_base/array",
"esri/Color",
"esri/layers/ImageParameters",
"esri/dijit/BasemapToggle",
"esri/renderers/SimpleRenderer",
"esri/SpatialReference",

"dojo/dom-construct",
"dojo/query",
"dojo/_base/connect",
"dojo/domReady!"
], function (
Map, infoTemplate, GeometryService, ArcGISDynamicMapServiceLayer,
BufferParameters,SimpleFillSymbol,SimpleLineSymbol, PictureMarkerSymbol, IdentifyTask,
IdentifyParameters, Popup, FeatureLayer, Graphic, normalizeUtils, Point,
SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol,
Query, array,
Color, ImageParameters, BasemapToggle, SimpleRenderer, SpatialReference, domConstruct,
query, domReady, connect
) {

  esriConfig.defaults.geometryService = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
  // esriConfig.defaults.geometryService = new esri.tasks.GeometryService("//sfplanninggis.org/arcgis/rest/services/Utilities/Geometry/GeometryServer");
  esriConfig.defaults.io.proxyUrl = "/proxy/";
  esriConfig.defaults.io.alwaysUseProxy = false;

  var map = new Map("map", {
    basemap: "gray-vector",
    center: [-122.45, 37.76],
    zoom: 12,
  });

  initializeMap();

  // var toggle = new BasemapToggle({
  //   map: map,
  //   basemap: "satellite"
  //   }, "BasemapToggle");
  // toggle.startup();
  //
  // symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0,0,255]), 4), new dojo.Color([0,0,0,0.25]));
  //
  // renderer = new SimpleRenderer(symbol);

  $('#addressInput').on("keyup", function(event){
    // MIGHT NEED TO EDIT AND DELETE KEYUP
    event.preventDefault();
    if(event.keyCode === 13) throttleSubmit($('#addressInput').val())
  });


  $('#layer0CheckBox').on("change", updateLayerVisibility)
  $('#layer3CheckBox').on("change", updateLayerVisibility)


  dojo.connect(map, "onClick", handleClick);

  /**
  *  Handle unchecking and checking checkbox to remove/add dynamic layers
  */
  function handleClick(event){
    var pointGeometry, symbol, pointGraphic

    if (theTempLayer) map.removeLayer(theTempLayer)
    pointGeometry = new Point(event.mapPoint.x, event.mapPoint.y , new SpatialReference({wkid: 102100}));
    drawBuffer(pointGeometry)
  }

  /**
  *  Initialize Map with dynamic layers
  */
  function initializeMap(){
    imageParameters = new ImageParameters();
    imageParameters.layerIds = [0,1,2,3];
    imageParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;

    dynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer("//54.83.57.240/arcgiswa/rest/services/Tobacco/MapServer", {
      "opacity" : 0.75,
      "imageParameters" : imageParameters
    });

    map.addLayer(dynamicMapServiceLayer);
  }

  /**
  *  Handle unchecking and checking checkbox to remove/add dynamic layers
  */
  function updateLayerVisibility(){
    var temp = $('.list_item')
    var inputs = query(temp)

    var inputCount = inputs.length;
    visibleLayerIds = [0,1,2,3];

    for (var i = 0; i < inputCount; i++) {
      if (!inputs[i].checked) {
        theLayerID=parseInt(inputs[i].value)
        visibleLayerIds.splice(visibleLayerIds.indexOf(theLayerID), 1);
      }
    }
    if (visibleLayerIds.length === 0) {
      visibleLayerIds.push(-1);
    }
    dynamicMapServiceLayer.setVisibleLayers(visibleLayerIds);
  }

  /**
  *  limits the searches to once every 3 seconds, otherwise they can stack up
  */
  function throttleSubmit(myAdd) {
    if (new Date() - lastCall < 3000) return false;
    else {
      lastCall = new Date();
      showAddress(myAdd)
    }
  }

  function showAddress(address) {
    geocodeSF(address);
  }

  function showAddress(address) {
    geocodeSF(address);
  }

  function geocodeSF(address){
    if (theTempLayer) map.removeLayer(theTempLayer)

    var url = 'http://sfplanninggis.org/cpc_geocode/?search=';

    $.get(url + address, function(data){
      jsonData = JSON.parse(data);
      if (data['error']) {
          console.error('Geocode failed: ' + data['error'].message);
          return;
      }
      if (jsonData.features && jsonData.features.length > 0) {
        addTempLayer(jsonData);
      } else {
          alert("Sorry, I can't find "+address+".  ");
      }
    }).fail(function(){
        console.log("Error");
        alert("Sorry, there has been an error.  If this continues please email mike.wynne@sfgov.org and include the website's URL and what you searched for.");
      });
  }

  /**
  * Add new feature layer based on search string and result
  */
  function addTempLayer(data){
    var newFeature = new esri.tasks.FeatureSet();
    var features = [];
    newFeature.features = features;

    // Handle point
    if(data.mapPoint){
      features.push(data.mapPoint);
      newFeature.geometryType = "esriGeometryPoint";
      theTempLayer = new esri.layers.FeatureLayer({
        layerDefinition:{
          geometryType: "esriGeometryPoint",
          fields: "blank",
        },
        featureSet:{
          features: data.mapPoint,
          geometryType: "esriGeometryPoint",
          spatialReference: data.mapPoint.spatialReference
        }
      });
    } else {
      for(var i = 0; i < data.features.length; i++){
        console.log("pushing...")
        console.log(data.features[i])
        features.push(data.features[i]);
      }
      newFeature.geometryType = data.geometryType;
      if(newFeature.features.length > 0){
        theTempLayer = new esri.layers.FeatureLayer({
          layerDefinition:{
            geometryType: data.geometryType,
            fields: data.fields,
          },
          featureSet:{
            features: newFeature.features,
            geometryType: data.geometryType,
            spatialReference: data.spatialReference
          }
        });
        // Does not work when newFeature.features[0].geometry is declared to a variable
        // but works when given
        drawBuffer(newFeature.features[0].geometry);
      }
      map.addLayer(theTempLayer)
    }
  }

  /**
  * Handles drawing the buffer. Parameter is geometry data
  */
  function drawBuffer(geoData){
    var params;
    var symbol;
    var bufferDistance = ["500"];
    var geometry = geoData;

    var graphic = new Graphic(geometry, symbol);
    graphic.attributes = "buffer";
    // console.log(graphic)
    map.graphics.add(graphic);

    params = new BufferParameters();
    params.distances = bufferDistance;
    params.outSpatialReference = map.spatialReference;
    params.unit = esri.tasks.GeometryService.UNIT_FOOT;

    normalizeUtils.normalizeCentralMeridian([geometry]).then(function(normalizedGeometries){
      var normalizedGeometry = normalizedGeometries[0];
        //if geometry is a polygon then simplify polygon.  This will make the user drawn polygon topologically correct.
      esriConfig.defaults.geometryService.simplify([normalizedGeometry], function(geometries) {
        params.geometries = geometries;
        esriConfig.defaults.geometryService.buffer(params, showBuffer);
      });
    });
  }

  /*
  * call back function to draw the actual buffer
  */
  function showBuffer(bufferedGeometries) {
    if(map){
      map.graphics.clear();
    }
    // console.log(bufferedGeometries)
    var symbol = new SimpleLineSymbol(
      SimpleLineSymbol.STYLE_SOLID,
      new Color([66,134,244]),
      2
    );
    var bufferedGeometry =[];
    array.forEach(bufferedGeometries, function(geometry) {
      var graphic = new Graphic(geometry, symbol);
      bufferedGeometry.push(graphic)
      // map.graphics.add(graphic);
    });
    map.graphics.add(bufferedGeometry[0]);
    map.setExtent(bufferedGeometry[0].geometry.getExtent().expand(2))
  }
});
