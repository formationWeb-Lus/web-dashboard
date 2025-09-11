// middlewares/requireLogin.js

function requireLogin(req, res, next) {
  // Si l'utilisateur est authentifié (via session)
  if (req.session && req.session.user) {
    return next();
  }

  // Si l'utilisateur n'est pas connecté
  res.redirect('/login'); // redirige vers la page de login
}

module.exports = requireLogin;
