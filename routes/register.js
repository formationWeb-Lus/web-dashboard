const express = require('express');
const pool = require('../db'); // ton pool PostgreSQL
const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('pages/register', { error: null });
});

router.post('/', async (req, res) => {
  const { firstName, lastName, phone, password, selectedPlan, vehicleCount } = req.body;

  if (!firstName || !lastName || !phone || !password || !selectedPlan || !vehicleCount) {
    return res.render('pages/register', { error: 'Veuillez remplir tous les champs' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const unitPrice = selectedPlan === 'mensuel' ? 10 : 100;
    const total = unitPrice * Number(vehicleCount);

    const query = `
      INSERT INTO registrations
      (first_name, last_name, phone, password, selected_plan, vehicle_count, unit_price, total)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;
    const values = [firstName, lastName, phone, hashedPassword, selectedPlan, vehicleCount, unitPrice, total];

    await pool.query(query, values);

    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.render('pages/register', { error: 'Erreur serveur, veuillez réessayer' });
  }
});

module.exports = router; // ← impératif
