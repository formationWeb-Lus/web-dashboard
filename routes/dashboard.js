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

    console.log('✅ Utilisateur connecté :', user);

    // 🔑 Récupération du token stocké dans la session (si tu le mets dans la session)
    const token = user.token; 

    // 🔄 Requête vers ton backend pour obtenir TOUS les véhicules de l’utilisateur
    const response = await axios.get(
      'https://gps-device-server.onrender.com/api/my-vehicles',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    let vehicules = response.data; // liste des véhicules + last_position

    console.log('🚗 Véhicules reçus :', vehicules.length);

    // 🎯 Filtrer si un véhicule est sélectionné
    if (selectedVehicule.toLowerCase() !== 'all') {
      vehicules = vehicules.filter(
        v => v.id.toString() === selectedVehicule.toString()
      );
    }

    // 🌍 Géocodage enrichi des dernières positions
    const enrichedVehicules = await Promise.all(
      vehicules.map(async (v) => {
        if (!v.last_position) return v;

        try {
          const geoRes = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
              key: process.env.GOOGLE_MAPS_API_KEY,
              latlng: `${v.last_position.latitude},${v.last_position.longitude}`,
              language: 'fr'
            }
          });

          const result = geoRes.data.results[0];
          const comps = result?.address_components || [];
          const adresse = result?.formatted_address || "Adresse inconnue";

          // fonction utilitaire
          function getComponent(type) {
            const c = comps.find(comp => comp.types.includes(type));
            return c ? c.long_name : '';
          }

          v.last_position = {
            ...v.last_position,
            adresse,
            quartier: getComponent("sublocality") || getComponent("neighborhood"),
            ville: getComponent("locality"),
            territoire: getComponent("administrative_area_level_2"),
            province: getComponent("administrative_area_level_1"),
            pays: getComponent("country"),
            code_postal: getComponent("postal_code")
          };

          return v;
        } catch (geoErr) {
          console.error("❌ Erreur géocodage :", geoErr.message);
          v.last_position.adresse = "Erreur géocodage";
          return v;
        }
      })
    );

    // 🖥️ Rendu de la vue
    res.render('pages/dashboard', {
      user,
      vehicules: enrichedVehicules,
      selectedVehicule,
      error: null
    });

  } catch (err) {
    console.error('❌ Erreur dashboard :', err.message);
    res.render('pages/dashboard', {
      user: req.session.user,
      vehicules: [],
      selectedVehicule: null,
      error: "Erreur de chargement des données. Veuillez réessayer plus tard."
    });
  }
});

module.exports = router;
