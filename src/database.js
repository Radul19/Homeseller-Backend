const {Pool} = require("pg")

///Configuracion para Pool de Postgresql

const config = {
    user: 'postgres',
    host: 'localhost',
    password: "123123",
    database: 'homeseller',
    port:'5432',
}

// const config = {
//     user: 'uaklxadebgjtbw',
//     host: 'ec2-34-198-189-252.compute-1.amazonaws.com',
//     password: "3ef1d753908f01ad91990def65c06d3a93d91326060645ca1c716bb469d6a3cb",
//     database: 'ddfq44vngru7o5',
//     port:'5432',
//     ssl: {
//     rejectUnauthorized: false,
//   },
// }

const pool = new Pool(config)

module.exports = pool