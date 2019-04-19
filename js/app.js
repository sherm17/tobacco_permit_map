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
"esri/dijit/PopupTemplate",

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
"esri/tasks/query",
"esri/tasks/QueryTask",

"dojo/dom-construct",
"dojo/query",
"dojo/_base/connect",
"dojo/domReady!"
], function (
Map, InfoTemplate, GeometryService, ArcGISDynamicMapServiceLayer,
BufferParameters,SimpleFillSymbol,SimpleLineSymbol, PictureMarkerSymbol, IdentifyTask,
IdentifyParameters, Popup, PopupTemplate, FeatureLayer, Graphic, normalizeUtils, Point,
SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, LabelClass, Print, PrintTask, PrintParameters, Color, TextSymbol,
Query, arrayUtils, array,
ImageParameters, BasemapToggle, SimpleRenderer, SpatialReference, query, QueryTask, domConstruct,
query, domReady, connect
) {
  var identifyTask, identifyParams, apiReturnAddresss, isParcel, popup, map, tobaccoPointLayer, schoolLayer, infoTemplate;

 // esriConfig.defaults.geometryService = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
  // esriConfig.defaults.geometryService = new esri.tasks.GeometryService("//sfplanninggis.org/arcgis/rest/services/Utilities/Geometry/GeometryServer");
  esriConfig.defaults.geometryService = new esri.tasks.GeometryService("https://"+ theServerName +"/arcgiswa/rest/services/Utilities/Geometry/GeometryServer");
  esri.config.defaults.io.alwaysUseProxy = false;

	esriConfig.defaults.io.proxyRules.push({
		urlPrefix: theServerName +"/arcgiswa/rest/services",
		proxyUrl: "//" + theServerName + "/proxy/DotNet/proxy.ashx"
  });
  
  popup = new Popup({
    fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 0, 0]), 2), new Color([125, 125, 125, 0.25]))
  }, domConstruct.create("div"));

  map = new Map("map", {
    basemap: "gray-vector",
    center: [-122.45, 37.76],
    zoom: 12,
    showLabels: true,
    infoWindow: popup,
  });

  initializeMap();

  $('#map').on("mousedown", function() {
    map.enableMapNavigation();
  })

  $('#addressInput').on("keyup", function(event){
    event.preventDefault();
    if(event.keyCode === 13) {
      throttleSubmit($('#addressInput').val());
    }
  });

  $(".list_item").on("change", updateLayerVisibility)


  map.on("load", mapReady);

  var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_NULL, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0,0,255]), 4), new dojo.Color([0,0,0,0.25]));
  renderer = new SimpleRenderer(symbol);

  map.on("extent-change", function() {
    map.infoWindow.hide();
  });

  dynamicMapServiceLayer.on("update-start", function() {
    callLoadSpinner();
  });

  dynamicMapServiceLayer.on("update-end", function() {
    cancelSpinner();
  })

  /**
  *  Initialize Map with dynamic layers
  */
  function initializeMap(){
    map.disableKeyboardNavigation();
    
    imageParameters = new ImageParameters();
    imageParameters.layerIds = [0,1,2,3,4,5,6,7,8,9];
    imageParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;

    dynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer("https://" + theServerName + "/arcgiswa/rest/services/Tobacco/MapServer", {
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

    var parcelsURL = "https://" + theServerName + "/arcgiswa/rest/services/Tobacco/MapServer"
    identifyTask = new IdentifyTask(parcelsURL);

    identifyParams = new IdentifyParameters;
    identifyParams.tolerance = 4;
    identifyParams.returnGeometry = true;
    identifyParams.layerIds = [0, 1, 2, 3];
    identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
    identifyParams.width = map.width;
    identifyParams.height = map.height;
  }

  function executeIdentifyTask(clickEvent) {
    identifyParams.geometry = clickEvent.mapPoint;
    identifyParams.mapExtent = map.extent;
    callLoadSpinner();

    identifyTask.execute(identifyParams, function(results) {

      if (results.length !== 0) {
        if (results[0].layerName === "Parcels") {
          var parcelValue = results[0].value;
          showAddress(parcelValue)
        } else if(results[0].layerName !== "Tobacco_Permit_Parcel" ) {
              var deferred = identifyTask
              .execute(identifyParams)
              .addCallback(function (response) {
                for (var i = 0; i < response.length; i++) {
                  var currentResult = response[i];
                  var feature = currentResult.feature;
                  layerName = currentResult.layerName;
                  if (layerName === "SchoolsPublicPrivateDec2015") {
                    clickedOnTobaccoPoint = true;
                    var thePopUp = new InfoTemplate("School",
                    "SCHOOL NAME: ${CAMPUS_NAME}");
                    feature.setInfoTemplate(thePopUp);
                    break;
                  } else if (layerName === "Tobacco Permit Points") {
                    clickedOnTobaccoPoint = true;
                    var thePopUp = new InfoTemplate("Tobacco Permit Location",
                    "TRADE NAME: ${Trade_Name} <br> ADDRESS: ${ARC_Street}");
                    feature.setInfoTemplate(thePopUp);
                    break;
                  } 
                }
                cancelSpinner();
                return [feature]; 
              });
              map.infoWindow.setFeatures([deferred]);
              map.infoWindow.show(clickEvent.mapPoint);
        } else if (results[0].layerName === "Tobacco_Permit_Parcel") {
          var parcelValue = results[0].feature.attributes.blklot;
          // console.log(results[0])
          showAddress(parcelValue)
        } 
      } else {
        cancelSpinner()
        map.infoWindow.setTitle("Try again");
        map.infoWindow.setContent("Nothing to identify here, please try another location");
        map.infoWindow.show(clickEvent.mapPoint, map.getInfoWindowAnchor(clickEvent.screenPoint));
      }
    }); 
  }


  /**
  *  Handle unchecking and checking checkbox to remove/add dynamic layers
  */
  function updateLayerVisibility(event){

    var temp = $('.list_item')
    var inputs = query(temp)
    var inputCount = inputs.length;
    var visibleLayerIds = [0,1,2,3,4,5,6,7,8,9];

    for (var i = 0; i < inputCount; i++) {
      if (!inputs[i].checked) {
        theLayerID=parseInt(inputs[i].value)
        
        if(theLayerID === 0){
          // remove tobacco parcel and tobacco point label layers
          visibleLayerIds.splice(visibleLayerIds.indexOf(1), 1);
          visibleLayerIds.splice(visibleLayerIds.indexOf(9), 1);
        }
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
    map.infoWindow.hide();

    $.get(url + address, function (data){
      cancelSpinner();

      jsonData = JSON.parse(data);
      if (data['error']) {
          console.error('Geocode failed: ' + data['error'].message);
          return;
      }
      if (jsonData.features && jsonData.features.length > 0) {

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
        // No result from CPC_Geocoder: Do an additional search with the data they provided us
        var capitalizeAddress = address.toUpperCase().trim();

        if (!capitalizeAddress.match(/[a-zA-Z]/g)) {
          alert("Sorry, I can't find the location clicked or entered");
          return;
        } else {
          var itemsToRemoveFromAddress = [', SF', ', SAN FRANCISCO, CA', ', SAN FRANCISCO CA', ' SAN FRANCISCO CA', ', CALIFORNIA',
            ', CA', ',', ' SAN FRANCISCO CA', ' SAN FRANCISCO', ' STREET', ' CA', ' SF'];

          itemsToRemoveFromAddress.forEach(function (item) {
            capitalizeAddress = capitalizeAddress.replace(item, '');
          });

          var tobaccoParcelLayerURL = "http://sfplanninggis.org/arcgiswa/rest/services/Tobacco/MapServer/1";
          var queryTask = new QueryTask(
            tobaccoParcelLayerURL
          )
          console.log("Cleaned address is " + capitalizeAddress)
          var query = new Query();
          query.where = "Situs_Loca LIKE '" + capitalizeAddress + "%'";
          query.returnGeometry = true;
          queryTask.execute(query, function (returnData) {
            if (returnData.features.length > 0) {
              addTempLayer(returnData)
            } else {
              alert("Sorry, I can't find the location clicked or entered");
            }
          });
        }
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
    for(var i = 0; i < data.features.length; i++){
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

    map.addLayer(theTempLayer)
  }

  /**
  * Handles drawing the buffer. Parameter is geometry data
  */
  function drawBuffer(geoData){
    var bufferDistance;
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
  	var theprintparams = new esri.tasks.PrintParameters();
  	theprintparams.map = map;

  	var theprinturl="https://sfplanninggis.org/arcgiswa/rest/services/SecurePrinting5/GPServer/Export%20Web%20Map";
  	var theprintTask = new esri.tasks.PrintTask(theprinturl);

  	var ptemplate = new esri.tasks.PrintTemplate();
  	ptemplate.preserveScale = true;
  	ptemplate.showAttribution = false;

  	ptemplate.exportOptions = {width: 750, height: 750, dpi: 96  };
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
      printHTML+= "<b> Retail Tobacco Sales Permit Density - ";
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
      printHTML+="<div id='key-phrase-1'>Public or Private School</div>"
      printHTML+="</div>"

      printHTML+="<br />"
      printHTML+="<div class='legend-element'>"
      printHTML+= "<div id='key-symbol-2'>"
      printHTML+= "<div class='dot-inside'>"

      printHTML+= "</div>"
      printHTML+= "</div>"
      printHTML+= "<div id='key-phrase-2'>"
      printHTML+=   "Active Tobacco Sales Permit"
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
      printHTML+=   "500-foot radius"
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
