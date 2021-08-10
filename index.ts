// Import stylesheets
import './style.css';
import { routes } from './routes';
import { updatedRoutes } from './updated-routes';
import { findIndex, slice, concat } from 'lodash';
var L = require('leaflet');
L.GeometryUtil = require('leaflet-geometryutil');

import './MovingMarker.js';

var map = L.map('map').setView([48.855688, 2.348158], 11);
var markersLayer = new L.LayerGroup();
let layers: any[];
let cars: any[];

const timeouts = [13000, 10000, 6000, 13000, 5000, 12000];
let started = false;

const colors = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#FFC300',
  '#8E44AD',
  '#D35400'
];

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const start = () => {
  layers = [];
  cars = [];

  routes.forEach((route, index) => {
    const layer = L.geoJSON(route, {
      style: { color: colors[index], weight: 5 },
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: colors[index]
        });
      }
    });
    const coordinates = JSON.parse(
      JSON.stringify(
        route.features[route.features.length - 1].geometry.coordinates
      )
    );
    updateRoute(coordinates, index, layer, route, timeouts[index]);
    cars.push(
      L.Marker.movingMarker(
        coordinates.map(coordinate => coordinate.reverse()),
        20000
      )
    );
    markersLayer.addLayer(cars[index]);
    markersLayer.addLayer(layer);

    layers.push(layer);
  });
  map.addLayer(markersLayer);
};

document.querySelectorAll('.form-check-input').forEach((input, index) => {
  input.addEventListener('change', event => {
    event.stopPropagation();
    if ((event.target as HTMLInputElement).checked) {
      map.addLayer(layers[index]);
      return;
    }

    map.removeLayer(layers[index]);
  });
});

const playPauseBtn = document.querySelector('#play-pause');

playPauseBtn.addEventListener('click', () => {
  const icon = playPauseBtn.querySelector('i');
  if (icon.classList.contains('bi-play-circle-fill')) {
    if (!started) {
      started = true;
      start();
    }
    icon.classList.remove('bi-play-circle-fill');
    icon.classList.add('bi-pause-circle-fill');
    cars.forEach(car => {
      if (car.isPaused()) {
        car.resume();
      } else {
        car.start();
      }
    });
    return;
  }

  icon.classList.remove('bi-pause-circle-fill');
  icon.classList.add('bi-play-circle-fill');
  cars.forEach(car => car.pause());
});

const restartBtn = document.querySelector('#refresh');

restartBtn.addEventListener('click', () => {
  started = false;
  const icon = document.querySelector('#play-pause i');
  if (icon.classList.contains('bi-pause-circle-fill')) {
    icon.classList.remove('bi-pause-circle-fill');
    icon.classList.add('bi-play-circle-fill');
  }
  markersLayer.clearLayers();
  map.removeLayer(markersLayer);
});

const updateRoute = (coordinates, i, layer, route, timeout) => {
  setTimeout(() => {
    const closest = L.GeometryUtil.closest(
      map,
      coordinates,
      cars[i].getLatLng(),
      true
    );
    const index = findIndex(
      coordinates,
      coord => coord[0] === closest.lat && coord[1] === closest.lng
    );

    const startingPoint = JSON.parse(
      JSON.stringify(updatedRoutes[i].features[0].geometry.coordinates)
    ).reverse();
    const startingPointIndex = findIndex(
      coordinates,
      coord => coord[0] === startingPoint[0] && coord[1] === startingPoint[1]
    );

    const remainingPts = slice(coordinates, index, startingPointIndex).map(
      (coord: any) => coord.reverse()
    );
    const updatedRoute =
      updatedRoutes[i].features[updatedRoutes[i].features.length - 1].geometry
        .coordinates;

    markersLayer.removeLayer(layer);
    const x = updatedRoutes[i];

    x.features[x.features.length - 1].geometry.coordinates = concat(
      remainingPts,
      updatedRoute
    ) as any;
    markersLayer.addLayer(
      L.geoJSON(x, {
        style: { color: colors[i], weight: 5 },
        pointToLayer: function(feature, latlng) {
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: colors[i]
          });
        }
      })
    );
    markersLayer.removeLayer(cars[i]);
    cars[i] = L.Marker.movingMarker(
      (concat(remainingPts, updatedRoute) as any).map(coordinate =>
        coordinate.reverse()
      ),
      15000,
      { autostart: true }
    );
    markersLayer.addLayer(cars[i]);
  }, timeout);
};
