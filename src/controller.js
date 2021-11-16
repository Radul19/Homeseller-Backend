const db = require("./database")
const bcrypt = require("bcrypt")
const { v4 } = require('uuid');
const fs = require('fs')
require("dotenv")
// const urlServer = "localhost:4000/"
// const urlServer = "home-seller-back.herokuapp.com/"

const cloudinary = require("cloudinary").v2
cloudinary.config({
    cloud_name: "homesellerapp",
    api_key: 317699299852547,
    api_secret: "8MwOkn2RLuQxxJ7gOzDKuif2ofs",
})

/// const result = await db.query('SELECT * FROM users WHERE id = $1', [id])
/// res.send(result.rows[0])

const controller = {}


controller.login = async (req, res) => {
    const { email, password } = req.params
    let result = {}
    try {
        let bool = false
        const result1 = await db.query("SELECT * FROM users WHERE email = $1 ", [email])
        if (result1.rows[0] === undefined) {
            const result2 = await db.query("SELECT * FROM company WHERE email = $1 ", [email])
            if (result2.rows[0] === undefined) {
                return res.status(401).json({
                    ok: false,
                    msg: "No hay usuario registrado con ese email"
                })
            } else {
                result = result2.rows[0]
                bool = true
            }
        } else {
            result = result1.rows[0]
            bool = true
        }
        if (bool) {
            const passwordValidator = bcrypt.compareSync(password, result.password)
            if (passwordValidator) {
                return res.json({
                    ok: true,
                    username: result.name,
                    id: result.id,
                    type: result.type
                })
            } else {
                return res.status(401).json({
                    ok: false,
                    msg: "Contraseña incorrecta"
                })
            }
        }
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }


}

controller.register = async (req, res) => {
    // setTimeout(async() => {
    const { email, username, password } = req.body

    //User or Company
    let type = "users"
    let boolType = true
    if (!req.body.type) {
        type = "company"
        boolType = false
    }

    /// Verify Username & Email

    const verifyEmail = await db.query(`SELECT * FROM users FULL JOIN company ON users.email = company.email WHERE users.email = $1 OR company.email = $1 `, [email])
    const verifyName = await db.query(`SELECT * FROM users FULL JOIN company ON users.name = company.name WHERE users.name = $1 OR company.name = $1`, [username])

    if (verifyEmail.rowCount > 0) {
        if (verifyName.rowCount > 0) {
            return res.status(406).json({
                ok: false,
                msg: "El nombre de usuario y correo ya estan en uso"
            })
        } else {
            return res.status(406).json({
                ok: false,
                msg: "El correo ya esta en uso"
            })
        }
    } else if (verifyName.rowCount > 0) {
        return res.status(406).json({
            ok: false,
            msg: "El nombre de usuario ya esta en uso"
        })
    } else {
        ///Start register
        /// Encriptar contrasena
        const salt = bcrypt.genSaltSync()
        const cryptPassword = bcrypt.hashSync(password, salt)

        const id = v4()

        const result = await db.query(`INSERT INTO ${type} (email,name,password,id,type) VALUES ($1, $2, $3, $4 ,$5  )`, [email, username, cryptPassword, id, boolType])
        if (result.rowCount > 0) {
            res.json({
                username,
                id,
                type: boolType
            })
        } else {
            res.status(599).json({
                ok: false,
                msg: "No se han podido registrar los datos porfavor intentar nuevamente"
            })
        }
    }
}

controller.getUser = async (req, res) => {

    try {
        // console.log(req.params.id)
        const result = await db.query(`SELECT * FROM users WHERE id = $1 `, [req.params.id])
        // console.log(result.rows[0])
        if (result.rows[0] === undefined) {
            const result2 = await db.query(`SELECT * FROM company WHERE id = $1 `, [req.params.id])
            const result3 = await db.query(`SELECT * FROM posts WHERE owner = $1 `, [req.params.id])
            if (result2.rows[0] === undefined) {
                res.status(404).json({
                    ok: false,
                    msg: "No se ha encontrado el usuario que busca"
                })
            } else {
                let posts = result3.rows
                // console.log(result3)
                if (result3.rows[0] === undefined) {
                    posts = []
                }
                const { email, id, name, description } = result2.rows[0]
                res.json({
                    email, id, name, description, posts
                })
            }
        } else {
            const { email, id, name, description } = result.rows[0]
            res.json({
                email, id, name, description
            })
        }
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

controller.getAllCards = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM place WHERE title OR description = $1`, [req.params.text])
        res.status().json({})
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

controller.getItem = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM place WHERE id = $1`, [req.params.id])
        res.status().json({})
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

controller.getComments = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM comments WHERE id = $1`, [req.params.id])
        res.status().json({})
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

controller.editData = async (req, res) => {
    const { email, name, description, id } = req.body.data
    try {
        let result
        if (req.body.type) {
            result = await db.query(`UPDATE users SET name = $1 , email = $2 WHERE id = $3`, [name, email, id])
        } else {
            result = await db.query(`UPDATE company SET name = $1 , email = $2 , description = $3 WHERE id = $4`, [name, email, description, id])
        }
        console.log(result)
        if (result.rowCount > 0) {
            res.json({
                ok: true
            })
        } else {
            res.status(400).json({
                ok: false,
                msg: 'Ha ocurrido un error al intentar actualizar los datos, intente nuevamente'
            });
        }
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

controller.createItem = async (req, res) => {
    console.log("trying")
    try {
        const { title, price, generaldescription, type, owner } = req.body
        let aux = JSON.parse(req.body.aux)
        const comments = JSON.stringify([])
        console.log(comments)
        const id = v4()


        ///Cloudinary
        // aux.map(async (item, index) => {
        //     const result = await cloudinary.uploader.upload(req.files[index].path)
        //     item.url = result.url
        //     console.log(result)
        // })
        console.log("//////////////////////////////////////////////////")
        await Promise.all(
            aux.map(async (item, index) => {
                const {path} = req.files[index]
                console.log(path)
                const result = await cloudinary.uploader.upload(path)
                item.url = result.url
                fs.unlinkSync(path)
                console.log(result)
                return 0
            })
        )
        console.log("//////////////////////////////////////////////////")

        // aux.map((item, index) => {
        //     item.url = urlServer + "uploads/" + req.files[index].filename
        // })

        // const a = await cloudinary.uploader.upload(req.files[0].path)
        // console.log(a)

        aux = JSON.stringify(aux)
        const result = await db.query(`INSERT INTO posts (title , generaldescription , price ,id ,  comments , images,type,owner) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) `,
            [title, generaldescription, parseInt(price), id, comments, aux, type, owner])
        if (result.rowCount > 0) {
            res.json({
                ok: true,
                id,
            })
        } else {
            req.files.forEach(element => {
                fs.unlinkSync(element.path)
            });
            res.status(400).json({
                ok: false,
                msg: 'Ha ocurrido un error al insertar los datos, intente nuevamente'
            });
        }

    }
    catch (err) {
        console.log(err)
        req.files.forEach(element => {
            fs.unlinkSync(element.path)
        });
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }

}

controller.getItem = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM posts WHERE id = $1', [req.params.id])
        if (result.rows[0] !== undefined) {
            // console.log(result.rows[0])
            res.json({
                ok: true,
                item: result.rows[0]
            })
        } else {
            res.status(404).json({
                ok: false,
                msg: "No se ha encontrado la publicacion que busca"
            })
        }
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

controller.getAllItem = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM posts ')
        // console.log(result.rows)
        if (result.rows[0] !== undefined) {
            // console.log(result.rows[0])
            res.json({
                ok: true,
                items: result.rows
            })
        } else {
            res.status(404).json({
                ok: false,
                msg: "No se ha encontrado la publicacion que busca"
            })
        }
    } catch (err) {

    }
}

module.exports = controller