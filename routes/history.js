const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware pour vérifier la session
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Historique du véhicule
router.get('/history', requireLogin, async (req, res) => {
  try {
    const user = req.session.user;

    // Tous les véhicules de l'utilisateur
    const vehiculesRes = await pool.query(
      'SELECT vehiculeid, vehicule_name FROM vehicules WHERE userid=$1',
      [user.userid]
    );
    const vehicules = vehiculesRes.rows;

    // Véhicule sélectionné (query ou par défaut)
    const selectedVehicule = req.query.vehicule || user.vehicule_name || 'all';

    // Récupérer toutes les positions du véhicule sélectionné
    const positionsQuery = selectedVehicule === 'all'
      ? 'SELECT * FROM positions WHERE userid=$1 ORDER BY timestamp ASC'
      : 'SELECT * FROM positions WHERE userid=$1 AND vehiculeid=$2 ORDER BY timestamp ASC';

    const positionsParams = selectedVehicule === 'all' ? [user.userid] : [user.userid, selectedVehicule];
    const positionsRes = await pool.query(positionsQuery, positionsParams);
    const positions = positionsRes.rows;

    // Construire l’historique à partir des positions
    const history = [];
    let prevPos = null;

    positions.forEach(pos => {
      const currentTime = new Date(pos.timestamp);

      if (!prevPos) {
        history.push({
          type: 'start',
          vehiculeid: pos.vehiculeid,
          timestamp: currentTime,
          lat: pos.latitude,
          lng: pos.longitude,
        });
        prevPos = pos;
        return;
      }

      const prevTime = new Date(prevPos.timestamp);
      const diffMinutes = (currentTime - prevTime) / 1000 / 60;
      const distance = getDistanceInMeters(prevPos.latitude, prevPos.longitude, pos.latitude, pos.longitude);

      if (diffMinutes >= 7) {
        // Arrêt détecté
        history.push({
          type: 'stop',
          vehiculeid: pos.vehiculeid,
          timestamp: prevTime,
          lat: prevPos.latitude,
          lng: prevPos.longitude,
        });

        // Départ après arrêt
        history.push({
          type: 'resume',
          vehiculeid: pos.vehiculeid,
          timestamp: currentTime,
          lat: pos.latitude,
          lng: pos.longitude,
          distance: distance.toFixed(2)
        });
      }

      prevPos = pos;
    });

    res.render('pages/history_map', { user, vehicules, history, selectedVehicule });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Fonction Haversine pour calculer la distance entre deux points GPS
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // rayon Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;
