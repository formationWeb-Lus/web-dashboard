const express = require('express');
const router = express.Router();
const pool = require('../db');

// Affichage du formulaire
router.get('/register', (req, res) => {
  res.render('pages/register', { error: null });
});

// Soumission du formulaire
router.post('/register', async (req, res) => {
  const { firstname, lastname, phone, plan, vehicle_Count } = req.body;

  try {
    await pool.query(
      `INSERT INTO pending (firstname, lastname, phone, plan, vehicle_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [firstname, lastname, phone, plan, vehicle_Count]
    );

    res.send('<h2>Inscription réussie !</h2><a href="/register">Retour</a>');
  } catch (error) {
    console.error('Erreur enregistrement :', error.message);
    res.render('pages/register', {
      error: 'Erreur lors de l’enregistrement. Vérifiez les informations.'
    });
  }
});

module.exports = router;
