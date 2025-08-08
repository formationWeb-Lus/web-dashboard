const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Middleware de sécurité
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Route /dashboard
router.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const user = req.session.user;
    const selectedVehicule = req.query.v || 'all';
    const phone = user.phone;

    console.log('✅ Utilisateur connecté :', user);

    // 🔄 Requête vers /api/positions/user avec le phone
    const response = await axios.post('https://gps-device-server.onrender.com/api/positions/user', {
      phone
    });

    const { vehiculeids } = response.data;

    console.log('🚗 Véhicules associés (IDs) :', vehiculeids);

    // 🔄 Requête pour récupérer toutes les positions associées à ces vehiculeids
    const allPositions = [];

    for (const vehiculeid of vehiculeids) {
      try {
        const posRes = await axios.get(`https://gps-device-server.onrender.com/api/positions/vehicule/${vehiculeid}`);
        allPositions.push(...posRes.data);
      } catch (err) {
        console.error(`❌ Erreur récupération positions pour véhicule ${vehiculeid} :`, err.message);
      }
    }

    console.log('✅ Positions totales reçues :', allPositions.length);

    // 🎯 Filtrage des positions selon véhicule sélectionné
    let filteredPositions = allPositions;
    if (selectedVehicule.toLowerCase() !== 'all') {
      filteredPositions = allPositions.filter(p => p.vehiculeid.toLowerCase() === selectedVehicule.toLowerCase());
    }

    console.log(`📍 Positions après filtre pour "${selectedVehicule}" :`, filteredPositions.length);

    // ✅ Ne garder que les 5 dernières positions
    filteredPositions = filteredPositions.slice(-5);

    // 🌍 Géocodage enrichi
    const enrichedPositions = await Promise.all(
      filteredPositions.map(async (p) => {
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
          console.error("❌ Erreur géocodage :", geoErr.message);
          return {
            ...p,
            adresse: "Erreur géocodage"
          };
        }
      })
    );

    // 🖥️ Rendu de la vue
    res.render('pages/dashboard', {
      user,
      vehicules: vehiculeids, // ici, ce sont des noms/id bruts
      selectedVehicule,
      positions: enrichedPositions,
      error: null
    });

  } catch (err) {
    console.error('❌ Erreur dashboard :', err.message);
    res.render('pages/dashboard', {
      user: req.session.user,
      vehicules: [],
      selectedVehicule: null,
      positions: [],
      error: "Erreur de chargement des données. Veuillez réessayer plus tard."
    });
  }
});

module.exports = router;
