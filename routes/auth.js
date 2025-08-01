const express = require('express');
const router = express.Router();
const pool = require('../db'); // ton fichier de connexion PostgreSQL

router.post('/register', async (req, res) => {
  const { firstname, lastname, phone, plan, vehicleCount } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO pending (firstname, lastname, phone, plan, vehicle_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [firstname, lastname, phone, plan, vehicleCount]
    );

    console.log('✅ Nouveau utilisateur en attente :', result.rows[0]);
    res.redirect('/merci-pour-linscription'); // ou afficher un message de confirmation
  } catch (err) {
    console.error('❌ Erreur enregistrement pending :', err.message);
    res.render('register', { error: "Erreur lors de l'inscription. Réessayez." });
  }
});

module.exports = router;
