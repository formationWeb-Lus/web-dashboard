const express = require('express');
const router = express.Router();
const requireLogin = require('../middlewares/requireLogin');

router.get('/settings', requireLogin, (req, res) => {
  const user = req.session.user;
  res.render('pages/settings', { user });
});

module.exports = router;
