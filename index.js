(function() {

	// Online OSM (used for demo purposes)
	var osmUrl2 = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		osmAttrib = "OSM",
		online_osm = L.tileLayer(osmUrl2, {
			minZoom: 2,
			maxZoom: 20,
			attribution: osmAttrib
		});

	// Custom red marker, make this unique to nominatim
	var NominatimIcon = L.Icon.extend({
		options: {
			iconUrl: 'images/nominatim.png',
			iconSize: [25, 70],
			iconAnchor: [12, 70],
			popupAnchor: [0, - 60]
		}
	});
	var nominatimMarker = new NominatimIcon;

	// Custom orange marker, make this unique to pelias
	var PeliasIcon = L.Icon.extend({
		options: {
			iconUrl: 'images/pelias.png',
			iconSize: [25, 70],
			iconAnchor: [12, 70],
			popupAnchor: [0, - 60]
		}
	});
	var peliasMarker = new PeliasIcon;

	var ghIcon = L.Icon.extend({
		options: {
			iconUrl: 'images/gh.png',
			iconSize: [25, 70],
			iconAnchor: [12, 70],
			popupAnchor: [0, - 60]
		}
	});
	var ghMarker = new ghIcon;

	// Custom green marker, make this unique to google
	// Google was just used for demo purposes
	var GoogleIcon = L.Icon.extend({
		options: {
			iconUrl: 'images/google.png',
			iconSize: [25, 70],
			iconAnchor: [12, 70],
			popupAnchor: [0, - 60]
		}
	});
	var googleMarker = new GoogleIcon;

	// Initial geocoder search provider
	var searchProvider = "";

	// Add a geocoder layer group for each geocoder
	var nominatim = new L.LayerGroup();

	var pelias = new L.LayerGroup();

	var google = new L.LayerGroup();


	var waypoints = [];

	// Setup map with geocoders
	var map = L.map('map', {

		// automatic full screen
		fullscreenControl: true,

		// turn on geocoder markers at start
		layers: [online_osm,nominatim,pelias,google],

		//drawControl: false,

		// turn off zoom buttons
		zoomControl: false,
		minZoom: 2,
		maxZoom: 20,

		// Set the view over Ottawa at zoom level 11
		}).setView([45.4,-75.7], 11),
	
		// call geocoders from L.Control.Geocoder.____ (Leaflet Control Geocoder plug-in)
		geocoders = {

			// Nominatim: http://localhost/nominatim/
			'Nominatim': L.Control.Geocoder.nominatim(), // Document that we changed the URL in the original control.geocoder.js source, not the best
			
			// Pelias API: http://localhost:3100/v1/
			'Pelias': L.Control.Geocoder.mapzen('search-5gFFq7I'),
			
			// Google geocoder needs an API key, this is not apart of the open source geocoders, just here for demo purposes
			'Google': L.Control.Geocoder.google('AIzaSyDlmsdr-wCDaHNbaBM6N9JljQLIjRllCl8')

		},

		drawnItems = new L.FeatureGroup(),

		//selector = L.DomUtil.get('geocode-selector'),

		control = new L.Control.Geocoder({

			geocoder: null,

			position: 'topleft'

		}),

		btn, selection, marker;

	// add the zoom slider control
	map.addControl(new L.Control.Zoomslider());

	// add all of the controls to the map
	control.addTo(map);

	// geoLayer and geoList needed for overpass api
	var geoLayer = L.geoJson().addTo(map);
	
	var geoList = L.control.geoJsonSelector(geoLayer, {
		listItemBuild: function(layer) {
			var props = layer.feature.properties,
				tags = props.tags,
				html = 'ID: '+props.id+'<br>';
			
			for(var p in tags)
				html += p+': '+tags[p]+'<br>';

			return html;
		}
	});

	// Queries for overpass api
	var overpass = geoList.on('click', function(e) {
		$('#selection').text( JSON.stringify(e.layers[0].feature.properties) );
	}).addTo(map);

	// This is for a map popup
	var popup = L.popup();

	// Hashing for sending specific area links ie. http://....#10/45.2512/-75.8009
	var hash = new L.Hash(map);

	// Bottom right scale
	var scale = L.control.scale({
		position: 'bottomleft',
		maxWidth: 250
	});

	// Add scale to map
	scale.addTo(map);
	
	// Default starting geocoder
	select(geocoders['Nominatim'], 'Nominatim');

	// Geocoder switcher between nominatim, pelias, google
	var geocoderSwitcher = L.easyButton({
		id: 'animated-marker-toggle',
		states: [{
			stateName: 'nominatim',
			title: 'Search with Nominatim',
			icon: '<span>N</span>',
			onClick: function(control) {
				select(geocoders['Pelias'], 'Pelias');
				control.state('pelias');
			}
		}, {
			stateName: 'pelias',
			title: 'Search with Pelias',
			icon: '<span>P</span>',
			onClick: function(control) {
				select(geocoders['Google'], 'Google');
				control.state('google');
			}
		}, {
			stateName: 'google',
			title: 'Search with Google',
			icon: '<span>G</span>',
			onClick: function(control) {
				select(geocoders['Nominatim'], 'Nominatim');
				control.state('nominatim');
			}
		}]
	});

	// add the geocoder switcher to the map
	geocoderSwitcher.addTo(map);

	// Call empty Layer group
	var none = L.layerGroup();

	// File load labels for SRTM DEM feature
	L.Control.FileLayerLoad.TITLE = 'Load local BIL file (.zip)';
	L.Control.FileLayerLoad.LABEL = '<img src="images/folder.png" width="20px"' + 
					' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">';

	// Initalize the SRTM DEM file loader
	var fileLayer = L.Control.fileLayerLoad({
		// File size limit in kb (default: 1024) ?
		fileSizeLimit: 100 * 1024,
		// Restrict accepted file formats (default: .geojson, .kml, and .gpx) ?
		formats: ['.zip'],
		parsers: {
			'zip': fileParser
		},
		binaryFormats: ['zip']
	}).addTo(map);

	var optionsControl = new L.OptionsControl();

	map.on('overlayadd', function(e) {
		optionsControl.addLayer(e.layer);
	});

	map.on('overlayremove', function(e) {
		optionsControl.removeLayer(e.layer);
	});

	fileLayer.loader.on('data:loaded', function(e) {
		layerSwitcher.addOverlay(e.layer, e.filename);
		optionsControl.addLayer(e.layer);
	});

	fileLayer.loader.on('data:error', function(e) {
		console.error(e.error.stack);
	});

	// Console logs for the geocoder selected
	function select(geocoder, name) {
		searchProvider = name;
		console.log(name);
		control.options.geocoder = geocoder;
	}

	// Mark the geocode marker on the map
	control.markGeocode = function(result) {

		// Bounding box for the geocode result
		console.log(searchProvider);
		map.fitBounds(result.bbox);

		// This is where we define the icons for each search provider
		if (searchProvider == "Nominatim") {
			var markerLocation = new L.latLng(result.center)
			L.marker(markerLocation, {
				icon: nominatimMarker
			}).bindPopup(result.html || result.name).addTo(map).addTo(nominatim).openPopup();
		} else if (searchProvider == "Pelias") {
			var markerLocation = new L.latLng(result.center)
			L.marker(markerLocation, {
				icon: peliasMarker
			}).bindPopup(result.html || result.name).addTo(map).addTo(pelias).openPopup();
		} else if (searchProvider == "Google") {
			var markerLocation = new L.latLng(result.center)
			L.marker(markerLocation, {
				icon: googleMarker
			}).bindPopup(result.html || result.name).addTo(map).addTo(google).openPopup();
		}
	};

	// Grouping the geocoders together for the radio buttons
	var geocoders_group = {
		"Nominatim": nominatim,
		"Pelias": pelias,
		"Google": google
	};

	// Create a Leaflet buttons for GraphHopper
	// Reserve waypoints button
	function createReverseButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Reverse waypoints";
	    return btn;
	}

	// Google search button
	function createGoogleButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Search with Google";
	    return btn;
	}

	// Nominatim search button
	function createNominatimButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Search with Nominatim";
	    return btn;
	}

	// Pelias search button
	function createPeliasButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Search with Pelias";
	    return btn;
	}

	// GraphHopper foot/walk button
	function createWalkButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Walking route";
	    return btn;
	}

	// GraphHopper bike button
	function createBikeButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Biking route";
	    return btn;
	}

	//  GraphHopper car button
	function createCarButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Car route";
	    return btn;
	}

	// Create a plan for the routing engine
	// This plan will create specific geocoding buttons
	// Extend L.Routing.Plan to create a custom plan for GraphHopper
	var geoPlan = L.Routing.Plan.extend({


		createGeocoders: function() {
			var container = L.Routing.Plan.prototype.createGeocoders.call(this),

				// Create a reverse waypoints button			
				reverseButton = createReverseButton('<img src="images/reverse.png" width="15px"'
							+  
						       ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">'
						, container);

				// Create a button for google geocoding
				googleButton = createGoogleButton('<font color="green">G</font>', container);

				// Create a button for nominatim geocoding
				nominatimButton = createNominatimButton('<font color="red">N</font>', container);

				// Create a button for pelias geocoding
				peliasButton = createPeliasButton('<font color="orange">P</font>', container);

				//http://gis.stackexchange.com/questions/193235/leaflet-routing-machine-how-to-dinamically-change-router-settings

				// Create a button for walking routes
				walkButton = createWalkButton('<img src="images/walk.png" width="15px"'+ 

						    ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">', container);

				// Create a button for biking routes
				bikeButton = createBikeButton('<img src="images/bike.png" width="17px"'+ 
						    ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">', container);

				// Create a button for driving routes
				carButton = createCarButton('<img src="images/car.png" width="15px"'+ 
						    ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">', container);

			// Event to reverse the waypoints
			L.DomEvent.on(reverseButton, 'click', function() {
				var waypoints = this.getWaypoints();
				this.setWaypoints(waypoints.reverse());
				console.log("Waypoints reversed");
			    	}, this);

			// Event to geocode with google
			L.DomEvent.on(googleButton, 'click', function() {
				graphHopperRouting.getPlan().options.geocoder = new L.Control.Geocoder.Google('AIzaSyDlmsdr-wCDaHNbaBM6N9JljQLIjRllCl8');
				graphHopperRouting.spliceWaypoints(graphHopperRouting.getWaypoints());
				console.log("Google route search");
				}, this);

			// Event to geocode with nominatim
			L.DomEvent.on(nominatimButton, 'click', function() {
				graphHopperRouting.getPlan().options.geocoder = new L.Control.Geocoder.Nominatim();
				graphHopperRouting.setWaypoints(graphHopperRouting.getWaypoints());
				console.log("Nominatim route search");	
				}, this);

			// Event to geocode with pelias
			L.DomEvent.on(peliasButton, 'click', function() {
				graphHopperRouting.getPlan().options.geocoder = new L.Control.Geocoder.Mapzen();
				graphHopperRouting.setWaypoints(graphHopperRouting.getWaypoints());
				console.log("Pelias route search");
				}, this);

			// Event to generate walking routes
			L.DomEvent.on(walkButton, 'click', function() {
				graphHopperRouting.getRouter().options.urlParameters.vehicle = 'foot';
				graphHopperRouting.route();
				graphHopperRouting.setWaypoints(graphHopperRouting.getWaypoints());
				console.log("Walking route");	
				}, this);

			// Event to generate biking routes
			L.DomEvent.on(bikeButton, 'click', function() {
				graphHopperRouting.getRouter().options.urlParameters.vehicle = 'bike';
				graphHopperRouting.route();
				graphHopperRouting.setWaypoints(graphHopperRouting.getWaypoints());
				console.log("Biking route");	
				}, this);

			// Event to generate driving routes
			L.DomEvent.on(carButton, 'click', function() {
				graphHopperRouting.getRouter().options.urlParameters.vehicle = 'car';
				graphHopperRouting.route();
				graphHopperRouting.setWaypoints(graphHopperRouting.getWaypoints());
				console.log("Driving route");	
				}, this);
	
			return container;
		    }
	});

	// Initialise the FeatureGroup to store editable layers
	var drawnItems = new L.FeatureGroup().addTo(map);
	map.addLayer(drawnItems);

	// Initialise the draw control and pass it the FeatureGroup of editable layers
	var drawControl = new L.Control.Draw({
		draw: {
			position: 'topleft',
			// Shape parameters
			polygon: {
				title: 'Draw a polygon',
				allowIntersection: false,
				drawError: {
					color: '#b00b00',
					timeout: 1000
				},
				shapeOptions: {
					color: '#1f4ffb'
				},
				showArea: true
			},
			polyline: {
				metric: true,
				shapeOptions: {
					color: '#fb1f1f'
				}
			},
			circle: {
				shapeOptions: {
					color: '#662d91'
				}
			}
		},
		edit: {
			featureGroup: drawnItems,
		}
	});
	//map.addControl(drawControl);

	map.on('draw:created', function (event) {
		var layer = event.layer;
		drawnItems.addLayer(layer);

	});

	map.on('draw:edited', function(e) {
		var layers = e.layers;
		var countOfEditedLayers = 0;
		layers.eachLayer(function(layer) {
			countOfEditedLayers++;
		});
		console.log("Edited " + countOfEditedLayers + " layers");
	});

	// variables for grid lines
        var graticule = L.grid({
                //redraw: 'moveend'
        });

        // Leaflet grid lines
        var graticule1deg = L.graticule({
                interval: 1
        });

	// Bottom left radio buttons
        var layerSwitcher = L.control.layers({
                'OSM': online_osm,
		'None': none
        }, {
		'Drawn Items' : drawnItems,
                'Graticule 1°': graticule1deg,
                'Graticule (-z10)': graticule,
               	'Nominatim': nominatim,
                'Pelias': pelias,
                'Google': google,
        }, {
            	collapsed: true,
                position: 'bottomleft'
        });

	// File parser for SRTM DEM file
        function fileParser(content, format) {
                var layer = new L.BilDem();
                layer.addTo(map);
                layer.addZip(content);
                return layer;
        }
	layerSwitcher.addTo(map);

	// Create a toggle button using the easy button plug-in for the drawing toolbar
	var toggle = L.easyButton({
		id: 'animated-toolbar',
		position: 'topleft',
		states: [{
			stateName: 'add-draw',
			icon: 'fa-paint-brush',
			title: 'Open drawing toolbar',
				onClick: function(control) {
					map.addControl(drawControl);
					control.state('remove-draw');
				}
	},{
	    icon: 'fa-minus',
	    stateName: 'remove-draw',
	    onClick: function(control) {
	      map.removeControl(drawControl);
	      control.state('add-draw');
	    },
	    title: 'Hide drawing toolbar'
	  }]
	});

	// Add drawing toolbar plugin toggle to map
	toggle.addTo(map);

	// Adds the drawn shape as a layer
	map.on('draw:created', function(e) {
		var type = e.layerType,
			layer = e.layer;

		if (type === 'marker') {
			layer.bindPopup('A popup!');
		}

		drawnItems.addLayer(layer);
	});

	// Enable editing of the drawn shapes
	map.on('draw:edited', function(e) {
		var layers = e.layers;
		var countOfEditedLayers = 0;
		layers.eachLayer(function(layer) {
			countOfEditedLayers++;waypoints
		});
		console.log("Edited " + countOfEditedLayers + " layers");
	});

	// Create a plan for the routing
	var plan = new geoPlan(

		// Empty waypoints
		[],

		{
			// Create a custom marker for GraphHopper routing
			createMarker: function(i, wp) {

				return L.marker(wp.latLng, {
					draggable: true,
					icon: ghMarker
				}).addTo(map);

			},

			// Default geocoder
			geocoder: new L.Control.Geocoder.Nominatim(),

			// Create routes while dragging markers
			routeWhileDragging: true,
		}),

		// Call the GH routing engine
		graphHopperRouting = L.Routing.control({

			// Empty waypoints
			waypoints: [],

			// Positioning of the routing engine in the window
			position: 'bottomleft',

			// Draggable routes
			routeWhileDragging: true,

			// Online GH routing
			router: L.Routing.graphHopper('9fb6dd59-4e36-4dbe-a0cb-71d58a048bd1', {
				urlParameters: {
					vehicle: 'car'
				}
			}),

			// Use the created plan for GH routing
			plan: plan,

			// Show the routing icon on a reloaded window
			show: false,

			// Enable the box to be collapsed
			collapsible: true,

			// Collapse button which opens the routing icon (mouse over)
			// Fix this so the routing box closes when mouse leaves the routing window rather than the window "X"
			collapseBtn: function(itinerary) {
				var collapseBtn = L.DomUtil.create('span', itinerary.options.collapseBtnClass);
				L.DomEvent.on(collapseBtn, 'click', itinerary._toggle, itinerary);
				itinerary._container.insertBefore(collapseBtn, itinerary._container.firstChild);
			},

			//showAlternatives: true,

			// Alternative line styles
			altLineOptions: {
			styles: [{
				color: 'black',
				opacity: 0.15,
				weight: 9

			}, {
				color: 'white',

				opacity: 0.8,
				weight: 6
			}, {
				color: 'blue',
				opacity: 0.5,
				weight: 2
			}]
			}
	});

	map.addControl(graphHopperRouting);

	var removeRoute = graphHopperRouting.spliceWaypoints(0, 2);

	// Create a series of buttons for right click functionality

	// GraphHopper select start location button
	function startButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Start route location";
	    return btn;
	}

	// GraphHopper select end location button
	function destButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "End route location";
	    return btn;
	}

	// Get coordinates here button
	function latlonButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Get coordinates";
	    return btn;
	}

	// Overpass popup button
	function infoButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Location information";
	    return btn;
	}

	// Clear map of features button
	function removeButton(label, container) {
	    var btn = L.DomUtil.create('button', '', container);
	    btn.setAttribute('type', 'button');
	    btn.innerHTML = label;
	    btn.title = "Clear All Markers";
	    return btn;
	}

	// Label the buttons for right click features
	map.on('contextmenu', function(e) {
		var container = L.DomUtil.create('div'),

			// Set a starting location for GraphHopper router
			startBtn = startButton('<img src="images/start.png" width="18px"'+ 
						    ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">', container),

			// Set a destination location for GraphHopper router
			destBtn = destButton('<img src="images/end.png" width="18px"'+ 
						    ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">', container),

			//switchBtn = createButton('Reverse Route', container),

			// Grab the Lat/Lon of this particular point clicked
			revBtn = latlonButton('<img src="images/latlon.png" width="18px"'+ 
						    ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">', container);

			// General info
			infoBtn = infoButton('<img src="images/question.png" width="18px"'+ 
						    ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">', container);

			// Clear the entire map of marker and shape objects
			remove = removeButton('<img src="images/erase.png" width="18px"'+ 
						    ' style="-webkit-clip-path: inset(0 0 5px 0); -moz-clip-path: inset(0 0 5px 0); clip-path: inset(0 0 5px 0);">', container);

			//route = createButton('Clear Route', container); // Clear the entire map of all objects


		// Create a start location for the GraphHopper router right click
		L.DomEvent.on(startBtn, 'click', function() {
			graphHopperRouting.spliceWaypoints(0, 1, e.latlng);
			map.closePopup();
		});

		// Create a destination location for the GraphHopper router click click
		L.DomEvent.on(destBtn, 'click', function() {
			graphHopperRouting.spliceWaypoints(graphHopperRouting.getWaypoints().length - 1, 1, e.latlng);
			map.closePopup();
		});

		// Create a reverse geocoding button for the GraphHopper right click
		L.DomEvent.on(revBtn, 'click', function() {
			//alert("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng)
			//map.closePopup();
			popup.setLatLng(e.latlng).setContent(e.latlng.toString()).openOn(map);
		});

		var revSrv = L.Control.Geocoder.nominatim(); // Reverse search only uses nominatim for now

		// Create an information button for the right click
		L.DomEvent.on(infoBtn, 'click', function() {
		$.ajax({
			data: 'data=[out:json];(node(around:10,'+e.latlng.lat+','+e.latlng.lng+');way(around:10,'+e.latlng.lat+','+e.latlng.lng+'));(._;>;);out;relation(around:10,'+e.latlng.lat+','+e.latlng.lng+');(._;>;);out;',
			type: 'post',
			dataType: 'json',
			url: 'http://overpass-api.de/api/interpreter',
			success: function(json) {
				//overpass.addTo(map);

				map.removeLayer(geoLayer);

                                var geojson = osmtogeojson(json);

                                geoLayer = L.geoJson(geojson).addTo(map);

                                map.fitBounds( geoLayer.getBounds() );

                                geoList.reload( geoLayer );

				map.closePopup();

			}
		});
		})

		// This event clears the entire map of objects (markers, shapes)
		// map.removeLayer() removes map "layers"
		// map.removeControl() removes map "controls"
		L.DomEvent.on(remove, 'click', function() {
			graphHopperRouting.getPlan().setWaypoints({latLng: L.latLng([0, 0])});
			pelias.clearLayers();
			nominatim.clearLayers();
			google.clearLayers();
			drawnItems.clearLayers();
			map.closePopup();
		});

		L.popup().setContent(container).setLatLng(e.latlng).openOn(map);
	});

	var toggle_overpass = L.easyButton({
		id: 'animated-overpass',
		position: 'bottomright',
		states: [{
			stateName: 'remove-overpass',
			icon: 'fa-eraser',
			title: 'Erase overpass',
				onClick: function(control) {
					overpass.removeFrom(map);
					geoLayer.clearLayers();
					overpass.addTo(map);
					control.state('add-overpass');
				}
	  }]
	});

	toggle_overpass.addTo(map);
})();
