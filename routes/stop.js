// routes/stop.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const requireLogin = require('../middlewares/requireLogin');

// ----------------------
// Page HTML : /stops
// ----------------------
router.get('/', requireLogin, async (req, res) => {
  const user = req.session.user;
  try {
    // Récupérer les véhicules de l'utilisateur
    const vehRes = await pool.query(
      `SELECT vehicule_name AS vehiculeid FROM users_vehicules WHERE user_id = $1`,
      [user.id]
    );
    const vehicules = vehRes.rows || [];

    res.render('pages/stop', { user, vehicules });
  } catch (err) {
    console.error('❌ Erreur page stops:', err);
    res.render('pages/stop', { user, vehicules: [] });
  }
});

// ----------------------
// API : /stops/:vehiculeId
// Récupérer les arrêts du véhicule pour la journée
// ----------------------
router.get('/:vehiculeId', requireLogin, async (req, res) => {
  const { vehiculeId } = req.params;
  const userId = req.session.user.id;

  try {
    const result = await pool.query(
      `SELECT latitude, longitude, quartier, rue, numero, timestamp
       FROM historiques
       WHERE vehiculeid = $1 AND user_id = $2 AND DATE(timestamp) = CURRENT_DATE
       ORDER BY timestamp ASC`,
      [vehiculeId, userId]
    );

    const positions = result.rows;
    if (!positions.length) {
      return res.json({ vehiculeId, totalStops: 0, stops: [] });
    }

    const stops = [];
    let currentStop = null;

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1], curr = positions[i];
      const sameLocation = Math.abs(prev.latitude - curr.latitude) < 0.0001 &&
                           Math.abs(prev.longitude - curr.longitude) < 0.0001;

      if (sameLocation) {
        if (!currentStop) {
          currentStop = {
            start: prev.timestamp,
            end: curr.timestamp,
            quartier: prev.quartier,
            rue: prev.rue,
            numero: prev.numero
          };
        } else {
          currentStop.end = curr.timestamp;
        }
      } else {
        if (currentStop) {
          const duration = (new Date(currentStop.end) - new Date(currentStop.start)) / 60000;
          if (duration >= 10) stops.push({ ...currentStop, duration: duration.toFixed(1) });
          currentStop = null;
        }
      }
    }

    // Vérifier dernier stop
    if (currentStop) {
      const duration = (new Date(currentStop.end) - new Date(currentStop.start)) / 60000;
      if (duration >= 10) stops.push({ ...currentStop, duration: duration.toFixed(1) });
    }

    res.json({ vehiculeId, totalStops: stops.length, stops });
  } catch (err) {
    console.error('❌ Erreur API stops:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}); 

module.exports = router;
