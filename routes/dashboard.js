const express = require('express'); 
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../auth/verifyToken');

router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const user = req.user; // récupéré depuis verifyToken (doit contenir user.userid)

    // Tous les véhicules de l'utilisateur
    const vehiculesRes = await pool.query(
      'SELECT vehiculeid, vehicule_name, plate_number FROM vehicules WHERE userid = $1',
      [user.userid]
    );
    const allVehicules = vehiculesRes.rows;

    // Véhicule sélectionné depuis le menu déroulant (query string ?v=xxx)
    const selectedVehicule = req.query.v || 'all';

    // Filtrer les véhicules si un véhicule spécifique est sélectionné
    let vehicules = allVehicules;
    if (selectedVehicule !== 'all') {
      vehicules = allVehicules.filter(v => v.vehiculeid == selectedVehicule);
    }

    // Récupérer les 5 dernières positions pour les véhicules filtrés
    const positions = [];
    for (const v of vehicules) {
      const posRes = await pool.query(
        'SELECT * FROM positions WHERE vehiculeid = $1 ORDER BY timestamp DESC LIMIT 5',
        [v.vehiculeid]
      );
      positions.push(...posRes.rows);
    }

    // Rendu vers la vue
    res.render('pages/dashboard', {
      user,
      vehicules: allVehicules, // pour le menu déroulant
      selectedVehicule,
      positions,
      error: positions.length === 0 ? 'Aucune position trouvée.' : null
    });

  } catch (err) {
    console.error('❌ Erreur dashboard:', err.message);
    res.render('pages/dashboard', {
      user: req.user,
      vehicules: [],
      selectedVehicule: null,
      positions: [],
      error: 'Erreur de chargement des données.'
    });
  }
});

module.exports = router;
