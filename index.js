const express = require('express');
const app = express()
const routes = require('./src/routes')
const cors = require("cors")

/// Configuracion de CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


/// Carpeta publica estatica
app.use(express.static('public'))
/// Permitir archivos mediante Express
app.use(express.urlencoded({extended: true}));
/// Leer los archivos JSON enviados desde el front
app.use(express.json())
/// Usar las rutas
app.use(routes)
/// Permitir CORS (Cross-origin resource sharing) que permite recibir peticiones desde otra app o desde el front
app.use(cors())

///Puerto 4000 en caso de no tener variable de entorno
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`App listening on ${PORT}`))