const db = require("./database")
const bcrypt = require("bcrypt")
const { v4 } = require('uuid');
const fs = require('fs')
require("dotenv")

/// Configuracion de cloudinary para subir imagenes
const cloudinary = require("cloudinary").v2
cloudinary.config({
    cloud_name: "homesellerapp",
    api_key: 317699299852547,
    api_secret: "8MwOkn2RLuQxxJ7gOzDKuif2ofs",
})

/// Constante objeto donde se almacenaran todas las funciones para las rutas
const controller = {}

///////////////// EXPLICACION GENERAL /////////////////
/* Todas las funciones tienen un try -> catch
Significa que ejecuta todo lo que esta dentro de "try" y si algo falla atrapa el error en "catch"

Dentro de todos los query a la BD vas a ver res.status(###).json
Si hubo algun error que conocemos el motivo, manda un "http status code" al front para saber que paso, y alla se mostrara el mensaje correspondiente
Ejemplo: no hay usuario registrado con este email,

aqui te dejo un link para que los veas https://www.restapitutorial.com/httpstatuscodes.html

*/

///Login
controller.login = async (req, res) => {
    const { email, password } = req.params
    let result = {}
    try {
        let bool = false
        ////Busca un usuario con el email
        const result1 = await db.query("SELECT * FROM users WHERE email = $1 ", [email])
        if (result1.rows[0] === undefined) {
            ///Si no se encontro ningun usuario prueba con un email
            const result2 = await db.query("SELECT * FROM company WHERE email = $1 ", [email])
            if (result2.rows[0] === undefined) {
                ///En caso de no enconrtar ninguno, manda un mensaje al front y un
                return res.status(404).json({
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
    const { email, username, password } = req.body

    //Define que tipo de usuario se va a registrar
    let type = "users"
    let boolType = true
    if (!req.body.type) {
        type = "company"
        boolType = false
    }


    /// Verificar que no se esten usando el Username o el Email en otra cuenta
    const verifyEmail = await db.query(`SELECT * FROM users FULL JOIN company ON users.email = company.email WHERE users.email = $1 OR company.email = $1 `, [email])
    const verifyName = await db.query(`SELECT * FROM users FULL JOIN company ON users.name = company.name WHERE users.name = $1 OR company.name = $1`, [username])

    ///Si se encontro un email
    if (verifyEmail.rowCount > 0) {
        ///Y si se encontro tambien un usuario
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
        ///Si solo se encontro un usuario
    } else if (verifyName.rowCount > 0) {
        return res.status(406).json({
            ok: false,
            msg: "El nombre de usuario ya esta en uso"
        })
    } else {
        /// En caso de estar todo bien, comienza el registro
        /// Se genera primero la "salt" que es como el algoritmo con el que se va a encriptar
        const salt = bcrypt.genSaltSync()
        /// Y luego se mezcla con la contraseña
        const cryptPassword = bcrypt.hashSync(password, salt)
        /// Creamos el ID del usuario
        const id = v4()
        /// Lo insertamos en la BD
        const result = await db.query(`INSERT INTO ${type} (email,name,password,id,type) VALUES ($1, $2, $3, $4 ,$5  )`, [email, username, cryptPassword, id, boolType])
        ///Si todo salio bien enviamos los datos al front
        if (result.rowCount > 0) {
            res.json({
                username,
                id,
                type: boolType
            })
            ///En caso de un error
        } else {
            res.status(500).json({
                ok: false,
                msg: "No se han podido registrar los datos porfavor intentar nuevamente"
            })
        }
    }
}

/// Conseguir un usuario por ID
controller.getUser = async (req, res) => {
    try {
        /// Busca usuarios con la ID
        const result = await db.query(`SELECT * FROM users WHERE id = $1 `, [req.params.id])
        if (result.rows[0] === undefined) {
            const result2 = await db.query(`SELECT * FROM company WHERE id = $1 `, [req.params.id])
            const result3 = await db.query(`SELECT * FROM posts WHERE owner = $1 `, [req.params.id])
            if (result2.rows[0] === undefined) {
                res.status(404).json({
                    ok: false,
                    msg: "No se ha encontrado el usuario que busca"
                })
            } else {
                /// Copia los resultados de las publicaciones encontradas
                let posts = result3.rows
                if (result3.rows[0] === undefined) {
                    /// Si no se encontro ninguna publicacion deja un array vacio
                    posts = []
                }
                ///Envia los datos de la compañia al front
                const { email, id, name, description, profilepic } = result2.rows[0]
                res.json({
                    email, id, name, description, posts, profilepic
                })
            }
        } else {
            ///Envia los datos del usuario al front
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

/// Editar Datos
controller.editData = async (req, res) => {
    const { email, name, description, id } = req.body.data
    try {
        let result
        ///Edita los datos dependiendo de el tipo de cuenta, si es usuario o compañia
        if (req.body.type) {
            result = await db.query(`UPDATE users SET name = $1 , email = $2 WHERE id = $3`, [name, email, id])
        } else {
            result = await db.query(`UPDATE company SET name = $1 , email = $2 , description = $3 WHERE id = $4`, [name, email, description, id])
        }
        ///Envia que todo salio bien
        console.log(result)
        if (result.rowCount > 0) {
            res.json({
                ok: true
            })
        } else {
            ///Envia el error
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

/// Crea una publicacion
controller.createItem = async (req, res) => {
    /* Aqui hay muchos detalles a tomar en cuenta, como estas enviando un conjunto de imagenes, se reciben en req.file gracias a Multer
    pero para enviar toda esta informacion, necesitas hacer una variable "FormData" desde el front y enviarla, asi separas la info de las imagenes
    */
    try {
        /// Extrae todos los datos del req.body
        const { title, price, generaldescription, type, owner } = req.body
        /// Extrae la informacion de las imagenes , y como son un array[{object}], se necesita hacer un JSON.parse() para que
        /// los datos de los objetos no se pierdan
        let copyData = JSON.parse(req.body.copyData)
        const comments = JSON.stringify([])
        const id = v4()
        await Promise.all(
            copyData.map(async (item, index) => {
                const { path } = req.files[index]
                console.log(path)
                const result = await cloudinary.uploader.upload(path)
                item.url = result.url
                item.public_id = result.public_id
                fs.unlinkSync(path)
                console.log(result)
                return 0
            })
        )
        copyData = JSON.stringify(copyData)
        const result = await db.query(`INSERT INTO posts (title , generaldescription , price ,id ,  comments , images,type,owner,views) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) `,
            [title, generaldescription, parseInt(price), id, comments, copyData, type, owner, 0])
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

        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }

}
/// Seleccionar una publicacion por ID
controller.getItem = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM posts WHERE id = $1', [req.params.id])
        if (result.rows[0] !== undefined) {
            // console.log(result.rows[0])
            res.json(result.rows[0])
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
            res.json(result.rows)
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

///Borrar una publicacion
controller.deleteItem = async (req, res) => {
    try {
        const { id, images } = req.body
        ///Borra el posts de la BD
        const result = await db.query('DELETE FROM posts WHERE id = $1 ', [id])
        /// Si se borró la publicacion
        if (result.rowCount > 0) {
            /// Promesa para borrar todas las imagenes de cloudinary
            await Promise.all(
                images.map(async (item, index) => {
                    const result2 = await cloudinary.uploader.destroy(item.public_id)
                    console.log(result2)
                    return 0
                })
            )
            res.json({
                ok: true,
                msg: "Se ha borrado corractamente la publicacion",
            })
        } else {
            res.status(404).json({
                ok: false,
                msg: "No se ha encontrado la publicacion que desea eliminar"
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

///Añadir foto de perfil
controller.updateProfilePic = async (req, res) => {
    try {
        const { id } = req.body
        const { path } = req.file
        ///Una vez subida la imagen a cloudinary inserta el url en la BD
        const result = await cloudinary.uploader.upload(path)
        const resultdb = await db.query("UPDATE company SET profilepic = $1 , profilepic_id = $2 WHERE id = $3", [result.url, result.public_id, id])
        fs.unlinkSync(path)
        if (resultdb.rowCount > 0) {
            res.json({
                ok: true
            })
        } else {
            /// Si no se pudo registrar el url borra la foto en cloudinary
            await cloudinary.uploader.destroy(result.public_id)
            res.status(404).json({
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

///Registrar comentario en una publicacion por ID
controller.sendComment = async (req, res) => {
    const { id } = req.body
    /// Los comentarios son un objeto asi que se pasan a String para poder ser insertados
    const comment = JSON.stringify(req.body.comment)
    try {
        const result = await db.query("UPDATE posts SET comments = $1 WHERE id = $2 ", [comment, id])
        if (result.rowCount > 0) {
            res.json({
                ok: true
            })
        } else {
            res.status(400).json({
                ok: false,
                msg: 'Ha ocurrido un error al intentar registrar el comentario, porfavor intentelo nuevamente'
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

///Busqueda de publicaciones
controller.search = async (req, res) => {
    try {
        /// Selecciona todas las publicaciones que tengan descripcion general o titulo referente a los parametros
        const result = await db.query("SELECT * FROM posts WHERE generaldescription ~ $1 OR title ~ $1 ", [req.params.data])
        res.json(result.rows)
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

/// Cada vez que una publicacion se renderiza, añade +1 a la vista
controller.plusView = async (req, res) => {
    const { id } = req.params
    try {
        const result = await db.query("UPDATE posts SET views = views + 1 WHERE id = $1", [id])
        console.log(result)
        res.json({
            ok: true
        })
    } catch (err) {
        console.log(err);
        res.status(599).json({
            ok: false,
            msg: 'Por favor hable con el administrador'
        });
    }
}

module.exports = controller