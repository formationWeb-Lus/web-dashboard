// app.js ou server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mainRoutes = require('./routes/main');

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use('/', mainRoutes);

app.listen(4000, () => console.log('✅ Serveur lancé sur http://localhost:4000'));
