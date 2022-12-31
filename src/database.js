const {Pool} = require("pg")

///Configuracion para Pool de Postgresql

// const config = {
//     user: 'postgres',
//     host: 'localhost',
//     password: "123123",
//     database: 'homeseller',
//     port:'5432',
// }

const config = {
    user: '#################',
    host: '##################',
    password: "########################################",
    database: '################',
    port:'5432',
    ssl: {
    rejectUnauthorized: false,
  },
}

const pool = new Pool(config)

module.exports = pool
