const express = require('express');
const router = express.Router();
const pool = require('../db'); // connexion PostgreSQL
const jwt = require('jsonwebtoken');

// ----------------------
// GET /login → Affiche le formulaire
// ----------------------
router.get('/login', (req, res) => {
  res.render('pages/login', { error: null });
});

// ----------------------
// POST /login → Vérifie les infos et renvoie un JWT
// ----------------------
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  try {
    // Chercher l'utilisateur par téléphone
    const result = await pool.query(
      `SELECT userid, name, phone, password, vehicule_name FROM users WHERE phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.render('pages/login', { error: "Numéro non enregistré" });
    }

    const user = result.rows[0];

    // Vérification mot de passe (⚠️ en vrai il faut hasher avec bcrypt)
    if (user.password !== password) {
      return res.render('pages/login', { error: "Mot de passe incorrect" });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { userid: user.userid, name: user.name, phone: user.phone, vehiculeid: user.vehiculeid },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: '1h' }
    );

    // Stocker éventuellement en session si besoin (optionnel)
    req.session.user = user;
    req.session.token = token;

    console.log("✅ Utilisateur connecté :", user);

    // Redirection vers dashboard
    res.redirect('/dashboard'); // si dashboard nécessite JWT, tu peux l’envoyer via session ou cookie

  } catch (err) {
    console.error("❌ Erreur login:", err.message);
    res.render('pages/login', { error: "Erreur serveur, réessayez" });
  }
});

module.exports = router;