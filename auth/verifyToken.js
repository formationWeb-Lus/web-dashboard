const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  let token = req.headers['authorization'];

  // Si token pas dans le header, regarder la session
  if (!token && req.session) {
    token = req.session.token;
  }

  if (!token) return res.status(401).json({ error: "Accès refusé, token manquant" });

  if (token.startsWith("Bearer ")) token = token.slice(7, token.length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide" });
  }
}

module.exports = verifyToken;
