const express = require('express');
const router = express.Router();
const pool = require('../db'); // connexion PostgreSQL
const bcrypt = require('bcryptjs');

// ----------------------
// GET /settings → formulaire inscription
// ----------------------
router.get('/', (req, res) => {
  res.render('pages/register', { error: null }); // 🔹 variable error définie
});

// ----------------------
// POST /settings → traitement inscription
// ----------------------
router.post('/', async (req, res) => {
  const { firstName, lastName, phone, password, selectedPlan, vehicleCount } = req.body;

  // Vérification des champs obligatoires
  if (!firstName || !lastName || !phone || !password || !selectedPlan || !vehicleCount) {
    return res.render('pages/register', { error: 'Veuillez remplir tous les champs' });
  }

  try {
    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calcul du prix
    const unitPrice = selectedPlan === 'mensuel' ? 10 : 100;
    const total = unitPrice * Number(vehicleCount);

    // Insertion dans PostgreSQL
    const query = `
      INSERT INTO registrations
      (first_name, last_name, phone, password, selected_plan, vehicle_count, unit_price, total)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;
    const values = [firstName, lastName, phone, hashedPassword, selectedPlan, vehicleCount, unitPrice, total];
    const result = await pool.query(query, values);

    console.log('✅ Utilisateur enregistré :', result.rows[0]);

    // Redirection vers une page de confirmation ou login
    res.redirect('/merci-pour-linscription');

  } catch (err) {
    console.error('❌ Erreur serveur :', err.message);
    res.render('pages/register', { error: 'Erreur serveur, veuillez réessayer' });
  }
});

module.exports = router; // 🔑 impératif pour app.js
