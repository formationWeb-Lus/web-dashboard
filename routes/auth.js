const express = require('express');
const router = express.Router();
const pool = require('../db'); // connexion PostgreSQL

// ----------------------
// POST /auth/register → Inscription
// ----------------------
router.post('/register', async (req, res) => {
  const { firstname, lastname, phone, plan, vehicleCount } = req.body;

  if (!firstname || !lastname || !phone || !plan || !vehicleCount) {
    return res.render('pages/register', { error: "Veuillez remplir tous les champs" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO pending (firstname, lastname, phone, plan, vehicle_count)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [firstname, lastname, phone, plan, vehicleCount]
    );

    console.log('✅ Nouvel utilisateur en attente enregistré :', result.rows[0]);
    res.redirect('/merci-pour-linscription');

  } catch (err) {
    console.error('❌ Erreur enregistrement pending :', err.message);
    res.render('pages/register', { error: "Erreur lors de l'inscription. Réessayez." });
  }
});

// ----------------------
// Ici tu peux ajouter d'autres routes auth, ex: /login
// router.get('/login', ...)
// router.post('/login', ...)
// ----------------------

module.exports = router; // 🔑 obligatoire
