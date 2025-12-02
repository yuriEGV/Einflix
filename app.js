const express = require('express');
const app = express();
const path = require('path');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'api/uploads')));

// Rutas
const routes = require('./api/routes');
app.use('/api', routes);

module.exports = app;
