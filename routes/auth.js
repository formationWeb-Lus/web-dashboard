const express = require('express');
const router = express.Router();
const pool = require('../db'); // connexion PostgreSQL

// === Route POST pour l'inscription d'un nouvel utilisateur ===
router.post('/register', async (req, res) => {
  const { firstname, lastname, phone, plan, vehicleCount } = req.body;

  try {
    // Insertion dans la table pending
    const result = await pool.query(
      `INSERT INTO pending (firstname, lastname, phone, plan, vehicle_count)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [firstname, lastname, phone, plan, vehicleCount]
    );

    console.log('✅ Nouvel utilisateur en attente enregistré :', result.rows[0]);

    // Redirection vers une page de confirmation
    res.redirect('/merci-pour-linscription');

  } catch (err) {
    console.error('❌ Erreur enregistrement pending :', err.message);
    
    // Affichage du formulaire avec message d'erreur
    res.render('pages/register', { error: "Erreur lors de l'inscription. Réessayez." });
  }
});

module.exports = router;

