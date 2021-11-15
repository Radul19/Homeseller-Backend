const {Router} = require("express")
const multer = require("multer")

const { login, register, getUser, editData, createItem, getItem, getAllItem } = require("./controller")

const router = Router()


///// Middleware Multer
const itemStorageConfig = multer.diskStorage({
    destination: (req,file,cb) =>{
        cb(null,"./public/uploads")
    },
    filename: (req,file,cb)=>{
        cb(null,Date.now() + "--" + file.originalname )
    }
})

const uploadItem = multer ({storage: itemStorageConfig})

router.get("/login/:email/:password",login)
router.post("/register",register)

router.get("/user/:id",getUser)

router.post("/edit",editData)

router.post("/createItem", uploadItem.array("images",10) ,createItem)
// router.post("/createItem", uploadItem.single("image") ,createItem)

router.get("/getItem/:id",getItem)

router.get("/getAllItems",getAllItem)

router.get("/",(req,res)=>{
    res.send("working")
})

module.exports = router