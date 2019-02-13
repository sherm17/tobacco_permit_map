var renderer;
var lastCall = 0;
var theTempLayer;
var hostName = window.location.origin;
var theServerName = window.location.host;
if (window.location.protocol == "https:") {
   theProtocol= "https";
}
var test;

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
"esri/layers/LabelClass",

"esri/dijit/Print",
"esri/tasks/PrintTask",
"esri/tasks/PrintParameters",

"esri/Color",
"esri/symbols/TextSymbol",

"esri/tasks/query",
"dojo/_base/array",
"dojo/_base/array",




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
SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, LabelClass, Print, PrintTask, PrintParameters, Color, TextSymbol,
Query, arrayUtils, array,
ImageParameters, BasemapToggle, SimpleRenderer, SpatialReference, domConstruct,
query, domReady, connect
) {
  var identifyTask, identifyParams, apiReturnAddresss, isParcel;

 // esriConfig.defaults.geometryService = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
  // esriConfig.defaults.geometryService = new esri.tasks.GeometryService("//sfplanninggis.org/arcgis/rest/services/Utilities/Geometry/GeometryServer");
  esriConfig.defaults.geometryService = new esri.tasks.GeometryService("https://"+ theServerName +"/arcgiswa/rest/services/Utilities/Geometry/GeometryServer");
  esri.config.defaults.io.alwaysUseProxy = false;

	esriConfig.defaults.io.proxyRules.push({
		urlPrefix: theServerName +"/arcgiswa/rest/services",
		proxyUrl: "//" + theServerName + "/proxy/DotNet/proxy.ashx"
	});

  var map = new Map("map", {
    basemap: "gray-vector",
    center: [-122.45, 37.76],
    zoom: 12,
    showLabels: true
  });

  initializeMap();

  $('#addressInput').on("keyup", function(event){
    event.preventDefault();
    if(event.keyCode === 13) throttleSubmit($('#addressInput').val())
  });


  $('#layer0CheckBox').on("change", updateLayerVisibility)
  $('#layer3CheckBox').on("change", updateLayerVisibility)

  map.on("load", mapReady);

  var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_NULL, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0,0,255]), 4), new dojo.Color([0,0,0,0.25]));
  renderer = new SimpleRenderer(symbol);


  /**
  *  Initialize Map with dynamic layers
  */
  function initializeMap(){
    $('input').focus(function () {
        map.disableMapNavigation();
    });

    $('input').blur(function () {
        map.enableMapNavigation();
    });
    imageParameters = new ImageParameters();
    imageParameters.layerIds = [0,1,2,3];
    imageParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;

    dynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer("https://sfplanninggis.org/arcgiswa/rest/services/Tobacco/MapServer", {
      "opacity" : 0.75,
      "imageParameters" : imageParameters
    });

    map.addLayer(dynamicMapServiceLayer);
  }

  /*
  *   Handle clicks on map
  */
  function mapReady() {
    map.on("click", executeIdentifyTask);
    var parcelsURL = "https://sfplanninggis.org/arcgiswa/rest/services/Tobacco/MapServer"
    identifyTask = new IdentifyTask(parcelsURL);

    identifyParams = new IdentifyParameters;
    identifyParams.tolerance = 0;
    identifyParams.returnGeometry = true;
    identifyParams.layerIds = [2];
    identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
    identifyParams.width = map.width;
    identifyParams.height = map.height;
  }

  function executeIdentifyTask(clickEvent) {
    callLoadSpinner();

    var pointGeometry, symbol, pointGraphic

    identifyParams.geometry = clickEvent.mapPoint;
    identifyParams.mapExtent = map.extent;

    var deferred = identifyTask
      .execute(identifyParams, function (response) {
        var idResults = response;

        for (var i = 0; i < idResults.length; i++) {
          var result = idResults[i];
          var parcelValue = result.value;
          if (result.layerName === "Parcels") {
            isParcel = true;
            break;
          }
        }
        showAddress(parcelValue);
      });
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
    // Boolean to check if clicking or parcel or entering a address in the input box
    if (new Date() - lastCall < 3000) return false;
    else {
      lastCall = new Date();
      callLoadSpinner();
      showAddress(myAdd)
    }
  }

  function showAddress(address) {
    geocodeSF(address);
  }

  function geocodeSF(address){

    var url = 'https://sfplanninggis.org/cpc_geocode/?search=';

    $.get(url + address, function (data){
      cancelSpinner();

      jsonData = JSON.parse(data);
      if (data['error']) {
          console.error('Geocode failed: ' + data['error'].message);
          return;
      }
      if (jsonData.features && jsonData.features.length > 0) {
        var currAddress = jsonData.features[0].attributes.ADDRESSSIMPLE;

        if (theTempLayer) map.removeLayer(theTempLayer)
        if (jsonData.fieldAliases.ADDRESSSIMPLE) {
          isParcel = false;
          apiReturnAddresss = jsonData.features[0].attributes.ADDRESSSIMPLE;
        } else {
          apiReturnAddresss = jsonData.features[0].attributes.blklot;
          isParcel = true;
        }

        addTempLayer(jsonData);
      } else {
          alert("Sorry, I can't find the location clicked or entered" );
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

    // console.log(data)
    var newFeature = new esri.tasks.FeatureSet();
    var features = [];
    newFeature.features = features;

    for(var i = 0; i < data.features.length; i++){
      // console.log(data.feature[i])
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
          spatialReference: data.spatialReference,
        },
        outFields: ["*"]
      });

      // Does not work when newFeature.features[0].geometry is declared to a variable
      // but works when given
      drawBuffer(newFeature.features[0].geometry);
    }
    var statesColor = new Color("#000000");
    var parcelLabel = new TextSymbol().setColor(statesColor);
    parcelLabel.font.setSize("18pt");
    parcelLabel.font.setFamily("arial");

    var json = {
      "labelExpressionInfo": {"value": "{ADDRESSSIMPLE}"},
    };
    var labelClass = new LabelClass(json);
    labelClass.symbol = parcelLabel;

    theTempLayer.setLabelingInfo([labelClass]);

    // theTempLayer.setRenderer(renderer)
    map.addLayer(theTempLayer)
  }

  /**
  * Handles drawing the buffer. Parameter is geometry data
  */
  function drawBuffer(geoData){
    var bufferDistance;
    var correctionFactor;
    var correctedBufferDistance = bufferDistance * correctionFactor;
    var params;
    var symbol;
    var bufferDistance = ["634.5"];
    var geometry = geoData;

    var graphic = new Graphic(geometry, symbol);
    graphic.attributes = "buffer";
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
    var symbol = new SimpleLineSymbol(
      SimpleLineSymbol.STYLE_SOLID,
      new Color([66,134,244]),
      5
    );
    var bufferedGeometry =[];
    array.forEach(bufferedGeometries, function(geometry) {
      var graphic = new Graphic(geometry, symbol);
      bufferedGeometry.push(graphic)
    });
    map.graphics.add(bufferedGeometry[0]);
    map.setExtent(bufferedGeometry[0].geometry.getExtent().expand(3))
  }

  $('#print').on('click', function() {
    callLoadSpinner();
	  //console.log(dynamicMap.visibleLayers)
  	var theprintparams = new esri.tasks.PrintParameters();
  	theprintparams.map =map;

  	var theprinturl="https://sfplanninggis.org/arcgiswa/rest/services/SecurePrinting5/GPServer/Export%20Web%20Map";
  	var theprintTask = new esri.tasks.PrintTask(theprinturl);

  	var ptemplate = new esri.tasks.PrintTemplate();
  	ptemplate.preserveScale = true;
  	ptemplate.showAttribution=false;
    var maxWidth = screen.width;
    var maxHeight = screen.height;
  	ptemplate.exportOptions = {width: 750, height: 750, dpi: 96  };

  	//var printMapHeight=$('#map_container').height();
  	//var printMapWidth=$('#map_container').width();
  	//ptemplate.exportOptions = {width: printMapWidth, height: printMapHeight, dpi: 96  };
    theprintparams.template = ptemplate;
  	theprintTask.execute(theprintparams, printResultCallback,printResultCallbackError);
  });
  function printResultCallback(result) {
    var returnURL = result.url;
    printHTML+="<img src='" + returnURL +"'>"

    var myWindow = window.open('', 'PRINT');
    var printHTML = "<!DOCTYPE html>";
      printHTML+="<html>"
      printHTML+="<head> "
      printHTML+="<meta charset='utf-8'>"
      printHTML+="<meta name='viewport' content='initial-scale=1, maximum-scale=1, user-scalable=no'>"
      // printHTML+="<title>Tobacco Permit Map</title>"
      printHTML+="<meta name='description' content='Tobacco Permit Map' - zones where retail tobacco may be permitted.'>"
      printHTML+="<link rel='stylesheet' href='https://js.arcgis.com/3.26/esri/css/esri.css'>"
      printHTML+="<script src='https://js.arcgis.com/3.26/'></script>"
      printHTML+="<link rel='stylesheet' type='text/css' href='style/style.css'>"
      printHTML+="<link rel='stylesheet' href='js/Messi-master/messi.min.css' />"
      printHTML+="</head>"

      printHTML+="<div id='printTitle'>"
      printHTML+= "<b> Tobacco Permit Map For - ";
      if (isParcel) {
        printHTML += "Block Lot "
      }
      printHTML+= apiReturnAddresss + "</b>";
      printHTML+="</div>"

      printHTML+="<div id='legend_2'>"
      printHTML+="<div id='legend-container'>"
      printHTML+="<div class='legend-element'>"
      printHTML+="<div id='key-symbol-1'>"
      printHTML+="</div>"
      printHTML+="<div id='key-phrase-1'>Public and Private Schools</div>"
      printHTML+="</div>"

      printHTML+="<br />"
      printHTML+="<div class='legend-element'>"
      printHTML+= "<div id='key-symbol-2'>"
      printHTML+= "</div>"
      printHTML+= "<div id='key-phrase-2'>"
      printHTML+=   "Tobacco Permitted Retail"
      printHTML+= "</div>"
      printHTML+="</div>"

      printHTML+="<br />"
      printHTML+="<div class='legend-element'>"
      printHTML+= "<div id='key-symbol-3'>"
      printHTML+= "</div>"
      printHTML+= "<div id='key-phrase-3'>"
      printHTML+=   "Proposed Retail Tobacco Location"
      printHTML+= "</div>"
      printHTML+="</div>"


      printHTML+="<br />"
      printHTML+="<div class='legend-element'>"
      printHTML+= "<div id='key-symbol-4'>"
      printHTML+=   "<hr>"
      printHTML+= "</div>"
      printHTML+= "<div id='key-phrase-4'>"
      printHTML+=   "500 feet radius"
      printHTML+= "</div>"
      printHTML+="</div>"


      printHTML+="</div>"
      printHTML+="</div>"
      printHTML+="</div>"
      printHTML+="<body>"
      printHTML+="<img src='" + returnURL +"'>"
      printHTML+="</body>"
      printHTML+="</html>"
    cancelSpinner();
    myWindow.document.write(printHTML)
    myWindow.document.close();
  }
});



function callLoadSpinner() {
  $('#spinnerLargeMap').show();
  $('#map').addClass('disabledDIV');
}
function cancelSpinner() {
  $('#spinnerLargeMap').hide();
  $('#map').removeClass('disabledDIV');
}
function printResultCallbackError(theError) {
	var txt=""
		//alert("Error")
		var theErrorSimple="Unknown"
		theErrorSimple = theError.name

		for (x in theError) {
			txt=txt+"Error Code: " + x+"n"
			txt=txt + theError[x] + "\n\n";
			theObj = theError[x];
			if (typeof theObj == 'object') {
				for (xx in theObj) {
					txt=txt+"  Error Code: " + xx+"\n"
					txt=txt +"  " + theObj[xx] + "\n\n";
					theObj2=theObj[xx]
					if (typeof theObj2 == 'object') {
						for (xxx in theObj2) {
							txt=txt+"    Error Code: " + xxx+"\n"
							txt=txt + "    "+ theObj2[xxx] + "\n\n";
						}
					}
				}
			}
		}
		console.log(txt)
}
