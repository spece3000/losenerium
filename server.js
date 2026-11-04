import express from "express";
import mysql from "mysql2/promise";
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path'; 

const app = express();

app.use(express.json()); 
app.use(express.static("public", {
    maxAge: "1h",
    etag: true,
    lastModified: true,
}));

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "losenerium",
    connectionLimit: 5
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img/products/');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        const uniqueSuffix = baseName + '-' + Math.round(Math.random() * 1E9) + ext; 
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error("Можно загружать только изображения в формате PNG!")); 
        }
    }
});

pool.getConnection()
    .then(conn => {
        console.log("База данных MySQL подключена!");
        conn.release();
    })
    .catch(err => {
        console.error("Ошибка подключения к MySQL:", err.message);
    });

app.post("/menu", async function(req, res) {
    const { sort, pag, quan } = req.body;
    
    const page = parseInt(pag) || 1;
    const quantityType = parseInt(quan) || 3;


    const limit = (quantityType === 4) ? 16 : 9; 
    const offset = (page - 1) * limit;

    let orderBy = 'ProductId ASC';
    
    if (sort === 'up_price') {
        orderBy = 'ProductPrice ASC';
    } else if (sort === 'down_price') {
        orderBy = 'ProductPrice DESC';
    }

    try {
        const [result] = await pool.query(
            `SELECT ProductId, ProductName, ProductPrice, ProductImage 
             FROM products 
             ORDER BY ${orderBy} 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        res.json(result);
        
    } catch (err) {
        console.error("Ошибка при вырисовывании меню:", err);
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

const saltRounds = 10;

app.post("/registration", async function(req, res) {
    const {username, password, email, address} = req.body;

    if (!username || !password || !email || !address) {
        return res.status(400).json({ message: "Заполни все поля!" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await pool.query(
            "INSERT INTO users (UserName, Password, UserEmail, UserAddress) VALUES (?, ?, ?, ?)",
            [username, hashedPassword, email, address]
        );
        res.json({ message: `Ваши данные ${username} успешно сохранены на БД!` });
    } catch (err) {
        console.error("Ошибка при записи в БД:", err);
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/login", async function(req, res) {
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Заполни все поля!" });
    }

    try {
        const [profil] = await pool.query(
            "SELECT * FROM users WHERE UserName = ?",
            [username]
        );

        if (profil.length === 0) {
            return res.status(401).json({ message: "Неверное имя или пароль" });
        }

        let userFromDB = profil[0];

        const isMatch = await bcrypt.compare(password, userFromDB.Password);

        if (!isMatch) {
            return res.status(401).json({ message: "Неверное имя или пароль" });
        }

        res.json({ message: `Вы успешно вошли ${username}` });
    } catch (err) {
        console.error("Ошибка при чтении из БД:", err); 
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/get-profile", async function(req, res) {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ message: "Не передан логин" });
    }

    try {
        const [users] = await pool.query(
            "SELECT UserName, UserAddress, UserEmail FROM users WHERE UserName = ?",
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        res.json(users[0]); 
    } catch (err) {
        console.error("Ошибка при получении профиля:", err);
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/delete-profile", async function(req, res) {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ message: "Не передан логин" });
    }

    try {
        const [users] = await pool.query("SELECT UserId FROM users WHERE UserName = ?", [username]);

        if (users.length === 0) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const userId = users[0].UserId;

        await pool.query("DELETE FROM users WHERE UserId = ?", [userId]);

        res.json({ message: "Аккаунт успешно удален. До свидания!" });
        
    } catch (err) {
        console.error("Ошибка при удалении пользователя:", err);
        res.status(500).json({ message: "Ошибка базы данных при удалении" });
    }
});

app.get("/admin-users", async function(req, res) {
    try {
        const [users] = await pool.query("SELECT UserName FROM users WHERE UserName != 'admin'");
        res.json(users);
    } catch (err) {
        console.error("Ошибка при получении списка юзеров:", err);
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/add-product", (req, res) => {
    upload.single('productImage')(req, res, async function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: "Файл слишком большой. Максимум 2 МБ." });
            }
            return res.status(400).json({ message: err.message });
        }

        const { ProductName, ProductPrice } = req.body;
        const file = req.file;

        if (!ProductName || !ProductPrice || !file) {
            return res.status(400).json({ message: "Заполните все поля и выберите фото!" });
        }

        try {
            const imagePath = `/img/products/${file.filename}`;
            await pool.query(
                "INSERT INTO products (ProductName, ProductPrice, ProductImage) VALUES (?, ?, ?)",
                [ProductName, ProductPrice, imagePath]
            );
            res.json({ message: "Товар успешно добавлен!" });
        } catch (err) {
            console.error("Ошибка при добавлении товара:", err);
            res.status(500).json({ message: "Ошибка базы данных" });
        }
    });
});

app.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
});