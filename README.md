# LIGARS

Leaflet Interactive Geocoding Application Routing System

LIGARS is an interactive mapping application capable of geocoding, routing and Overpass API requests. It was developed using the Leaflet Javascript mapping framework and a series of previously developed plug-ins.

## Getting Started

Edit the ```index.js``` file to your own person API keys.

API keys for the Mapzen, Google and Graphhopper applications can be requested at:
* [Mapzen](https://mapzen.com/developers/)
* [Google](https://developers.google.com/maps/documentation/geocoding/get-api-key)
* [Graphhopper](https://www.graphhopper.com/)

```
sudo nano index.js
```
Geocoders:
```javascript
geocoders = {
	'Nominatim': L.Control.Geocoder.nominatim(),
	'Pelias': L.Control.Geocoder.mapzen(' API KEY HERE '),
	'Google': L.Control.Geocoder.google(' API KEY HERE ')
}
```
Routing:
```javascript
router: L.Routing.graphHopper(' API KEY HERE ', {
		urlParameters: {
		vehicle: 'car'
	}
})
```

## Credits
This application uses open source components. You can find the source code of their open source projects along with license information below. I personally acknowledge and am grateful to these developers for their contributions to open source software in the GIS community.
* [perliedman/leaflet-routing-machine](https://github.com/perliedman/leaflet-routing-machine)
* [perleidman/lrm-graphhopper](https://github.com/perliedman/lrm-graphhopper)
* [perleidman/leaflet-control-geocoder](https://github.com/perliedman/leaflet-control-geocoder)
* [graphhopper/graphhopper](https://github.com/graphhopper/graphhopper)
* [Leaflet/leaflet](https://github.com/Leaflet/Leaflet)
* [CliffCloud/Leaflet.EasyButton](https://github.com/CliffCloud/Leaflet.EasyButton)
* [mleavans/leaflet-hash](https://github.com/mlevans/leaflet-hash)
* [tyrasd/osmtogeojson](https://github.com/tyrasd/osmtogeojson)
