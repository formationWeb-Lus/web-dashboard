const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Middleware : sécurise l'accès
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const token = req.session.token;
    const vehiculeid = req.session.user.vehiculeid;

    // 🔁 Requête API pour récupérer les positions
    const response = await axios.get('https://gps-device-server.onrender.com/api/positions', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    let positions = Array.isArray(response.data) ? response.data : [];

    // 🔎 Filtrer par véhicule et garder les 5 dernières
    positions = positions
      .filter(p => p.vehiculeid === vehiculeid)
      .slice(-5);

    // 🗺️ Géocodage inverse avec OpenCage
    const enrichedPositions = await Promise.all(
      positions.map(async (p) => {
        try {
          const geoRes = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
            params: {
              key: process.env.OPENCAGE_API_KEY,
              q: `${p.latitude},${p.longitude}`,
              language: 'fr',
              no_annotations: 1
            }
          });

          const result = geoRes.data.results[0];
          const comps = result?.components || {};

          const adresse = result?.formatted || "Adresse inconnue";

          return {
            ...p,
            adresse,
            quartier: comps.suburb || comps.village || comps.city_district || '',
            ville: comps.city || comps.town || '',
            territoire: comps.county || '',
            province: comps.state || '',
            pays: comps.country || ''
          };

        } catch (geoErr) {
          console.error("Erreur géocodage :", geoErr.message);
          return { ...p, adresse: "Erreur géocodage" };
        }
      })
    );

    res.render('pages/dashboard', {
      user: req.session.user,
      positions: enrichedPositions,
      error: null
    });

  } catch (err) {
    console.error("Erreur dashboard :", err.message);
    res.render('pages/dashboard', {
      user: req.session.user,
      positions: [],
      error: "Erreur de chargement des données"
    });
  }
});

module.exports = router;
