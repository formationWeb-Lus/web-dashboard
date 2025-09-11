// public/js/map.js

export function initVehicleMap(vehicules, positions, mapElementId, distanceInfoId, vehSelectId) {
  let map, userMarker, userPolyline;
  let markers = [];
  let polylines = [];

  function initMap(selectedVehicule = 'all') {
    const filteredVehs = selectedVehicule === 'all'
      ? vehicules
      : vehicules.filter(v => v.vehiculeid === selectedVehicule);

    const filteredPositions = positions.filter(p =>
      selectedVehicule === 'all' ? true : p.vehiculeid === selectedVehicule
    );

    if (!filteredPositions.length) {
      document.getElementById(mapElementId).innerHTML = "<p>Aucune position disponible.</p>";
      return;
    }

    const lastPos = filteredPositions[0];
    map = new google.maps.Map(document.getElementById(mapElementId), {
      center: { lat: parseFloat(lastPos.latitude), lng: parseFloat(lastPos.longitude) },
      zoom: 13
    });

    filteredVehs.forEach(v => {
      const vehPositions = filteredPositions
        .filter(p => p.vehiculeid === v.vehiculeid)
        .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

      if (!vehPositions.length) return;

      const pathCoords = vehPositions.map(p => ({
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude)
      }));

      const polyline = new google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
      });
      polylines.push(polyline);

      const last = pathCoords[pathCoords.length - 1];
      const marker = new google.maps.Marker({
        position: last,
        map: map,
        title: '🚗 ' + v.vehiculeid
      });
      markers.push(marker);
    });
  }

  function locateMe() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        if (userMarker) userMarker.setMap(null);
        if (userPolyline) userPolyline.setMap(null);

        userMarker = new google.maps.Marker({
          position: { lat: userLat, lng: userLng },
          map,
          title: '👤 Vous êtes ici',
          icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        });

        const selectedVehId = document.getElementById(vehSelectId).value;
        const vehPos = positions.filter(p => selectedVehId === 'all' ? true : p.vehiculeid === selectedVehId)
                                .slice(-1)[0];
        if (!vehPos) return;

        userPolyline = new google.maps.Polyline({
          path: [
            { lat: parseFloat(vehPos.latitude), lng: parseFloat(vehPos.longitude) },
            { lat: userLat, lng: userLng }
          ],
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 3,
          map: map
        });

        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(userLat, userLng));
        bounds.extend(new google.maps.LatLng(parseFloat(vehPos.latitude), parseFloat(vehPos.longitude)));
        map.fitBounds(bounds);

        const distance = getDistanceInMeters(parseFloat(vehPos.latitude), parseFloat(vehPos.longitude), userLat, userLng);
        document.getElementById(distanceInfoId).innerText =
          `📏 Distance entre vous et le véhicule : ${distance.toFixed(2)} mètres`;
      });
    } else {
      document.getElementById(distanceInfoId).innerText = "Géolocalisation non supportée par ce navigateur.";
    }
  }

  function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
  }

  // Initialisation
  initMap();
  document.getElementById(vehSelectId).addEventListener('change', function() {
    markers.forEach(m => m.setMap(null));
    polylines.forEach(l => l.setMap(null));
    markers = [];
    polylines = [];
    initMap(this.value);
    locateMe();
  });

  // Expose locateMe pour le bouton
  window.locateMe = locateMe;
}
