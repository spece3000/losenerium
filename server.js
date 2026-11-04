import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json()); 
app.use(express.static("public", {
    maxAge: "1h",
    etag: true,
    lastModified: true,
}));

let db;

async function initDB() {
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.run("PRAGMA foreign_keys = ON;");

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            UserId INTEGER PRIMARY KEY AUTOINCREMENT,
            UserName TEXT UNIQUE,
            UserAddress TEXT,
            UserEmail TEXT UNIQUE,
            Password TEXT
        );

        CREATE TABLE IF NOT EXISTS products (
            ProductId INTEGER PRIMARY KEY AUTOINCREMENT,
            ProductName TEXT,
            ProductPrice REAL,
            ProductImage TEXT
        );

        CREATE TABLE IF NOT EXISTS branches (
            BranchId INTEGER PRIMARY KEY AUTOINCREMENT,
            BranchEmail TEXT,
            BranchAddress TEXT,
            BranchPhone TEXT
        );

        CREATE TABLE IF NOT EXISTS CartItems (
            CartId INTEGER PRIMARY KEY AUTOINCREMENT,
            UserId INTEGER,
            ProductId INTEGER,
            QuantityCart INTEGER,
            UnitPriceCart REAL,
            UNIQUE(UserId, ProductId),
            FOREIGN KEY(UserId) REFERENCES users(UserId) ON DELETE CASCADE,
            FOREIGN KEY(ProductId) REFERENCES products(ProductId) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS Orders (
            OrderId INTEGER PRIMARY KEY AUTOINCREMENT,
            UserId INTEGER,
            BranchId INTEGER,
            Status TEXT,
            FOREIGN KEY(UserId) REFERENCES users(UserId) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS OrderItems (
            ItemId INTEGER PRIMARY KEY AUTOINCREMENT,
            OrderId INTEGER,
            ProductId INTEGER,
            QuantityOrder INTEGER,
            UnitPriceCart REAL,
            FOREIGN KEY(OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE,
            FOREIGN KEY(ProductId) REFERENCES products(ProductId)
        );
    `);

    const admin = await db.get("SELECT * FROM users WHERE UserName = 'admin'");
    if (!admin) {
        const hash = await bcrypt.hash('123', 10);
        await db.run("INSERT INTO users (UserName, Password, UserEmail, UserAddress) VALUES ('admin', ?, 'admin@mail.ru', 'admin')", [hash]);
    }

    const branchCount = await db.get("SELECT COUNT(*) as count FROM branches");
    if (branchCount.count === 0) {
        await db.run("INSERT INTO branches (BranchEmail, BranchAddress, BranchPhone) VALUES ('msk@mail.ru', 'г. Москва, ул. Тверская, д. 15', '+7 (999) 111-22-33')");
        await db.run("INSERT INTO branches (BranchEmail, BranchAddress, BranchPhone) VALUES ('spb@mail.ru', 'г. Санкт-Петербург, Невский пр., д. 50', '+7 (812) 444-55-66')");
        await db.run("INSERT INTO branches (BranchEmail, BranchAddress, BranchPhone) VALUES ('kzn@mail.ru', 'г. Казань, ул. Баумана, д. 10', '+7 (843) 777-88-99')");
    }

    console.log("База данных SQLite готова!");
}
initDB();

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
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'image/png') cb(null, true);
        else cb(new Error("Можно загружать только изображения в формате PNG!")); 
    }
});

app.post("/menu", async function(req, res) {
    const { sort, pag, quan } = req.body;
    const page = parseInt(pag) || 1;
    const quantityType = parseInt(quan) || 3;
    const limit = (quantityType === 4) ? 16 : 9; 
    const offset = (page - 1) * limit;

    let orderBy = 'ProductId ASC';
    if (sort === 'up_price') orderBy = 'ProductPrice ASC';
    else if (sort === 'down_price') orderBy = 'ProductPrice DESC';

    try {
        const result = await db.all(
            `SELECT ProductId, ProductName, ProductPrice, ProductImage 
             FROM products ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/registration", async function(req, res) {
    const {username, password, email, address} = req.body;
    if (!username || !password || !email || !address) return res.status(400).json({ message: "Заполни все поля!" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            "INSERT INTO users (UserName, Password, UserEmail, UserAddress) VALUES (?, ?, ?, ?)",
            [username, hashedPassword, email, address]
        );
        res.json({ message: `Ваши данные ${username} успешно сохранены!` });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ message: "Этот логин или почта уже заняты!" });
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/login", async function(req, res) {
    const {username, password} = req.body;
    if (!username || !password) return res.status(400).json({ message: "Заполни все поля!" });

    try {
        const user = await db.get("SELECT * FROM users WHERE UserName = ?", [username]);
        if (!user) return res.status(401).json({ message: "Неверное имя или пароль" });

        const isMatch = await bcrypt.compare(password, user.Password);
        if (!isMatch) return res.status(401).json({ message: "Неверное имя или пароль" });

        res.json({ message: `Вы успешно вошли ${username}` });
    } catch (err) {
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/get-profile", async function(req, res) {
    const { username } = req.body;
    try {
        const user = await db.get("SELECT UserName, UserAddress, UserEmail FROM users WHERE UserName = ?", [username]);
        if (!user) return res.status(404).json({ message: "Пользователь не найден" });
        res.json(user); 
    } catch (err) {
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/delete-profile", async function(req, res) {
    const { username } = req.body;
    try {
        await db.run("DELETE FROM users WHERE UserName = ?", [username]);
        res.json({ message: "Аккаунт успешно удален. До свидания!" });
    } catch (err) {
        res.status(500).json({ message: "Ошибка базы данных при удалении" });
    }
});

app.get("/admin-users", async function(req, res) {
    try {
        const users = await db.all("SELECT UserName FROM users WHERE UserName != 'admin'");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/add-product", (req, res) => {
    upload.single('productImage')(req, res, async function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: "Файл слишком большой. Максимум 2 МБ." });
            return res.status(400).json({ message: err.message });
        }

        const { ProductName, ProductPrice } = req.body;
        const file = req.file;

        if (!ProductName || !ProductPrice || !file) return res.status(400).json({ message: "Заполните все поля и выберите фото!" });

        try {
            const imagePath = `/img/products/${file.filename}`;
            await db.run(
                "INSERT INTO products (ProductName, ProductPrice, ProductImage) VALUES (?, ?, ?)",
                [ProductName, ProductPrice, imagePath]
            );
            res.json({ message: "Товар успешно добавлен!" });
        } catch (err) {
            res.status(500).json({ message: "Ошибка базы данных" });
        }
    });
});

app.post("/add-to-cart", async function(req, res) {
    const { username, productId } = req.body;
    try {
        const user = await db.get("SELECT UserId FROM users WHERE UserName = ?", [username]);
        if (!user) return res.status(404).json({ message: "Пользователь не найден" });
        
        const product = await db.get("SELECT ProductPrice FROM products WHERE ProductId = ?", [productId]);
        if (!product) return res.status(404).json({ message: "Товар не найден" });

        await db.run(
            `INSERT INTO CartItems (UserId, ProductId, QuantityCart, UnitPriceCart) 
             VALUES (?, ?, 1, ?) 
             ON CONFLICT(UserId, ProductId) DO UPDATE SET QuantityCart = QuantityCart + 1`,
            [user.UserId, productId, product.ProductPrice]
        );

        res.json({ message: "Товар добавлен в корзину!" });
    } catch (err) {
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.post("/get-cart", async function(req, res) {
    const { username } = req.body;
    try {
        const cart = await db.all(`
            SELECT c.CartId, c.QuantityCart, c.UnitPriceCart, p.ProductName, p.ProductImage
            FROM CartItems c
            JOIN users u ON c.UserId = u.UserId
            JOIN products p ON c.ProductId = p.ProductId
            WHERE u.UserName = ?
        `, [username]);
        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: "Ошибка БД" });
    }
});

app.post("/clear-cart", async function(req, res) {
    const { username } = req.body;
    try {
        await db.run(`
            DELETE FROM CartItems 
            WHERE UserId = (SELECT UserId FROM users WHERE UserName = ?)
        `, [username]);
        res.json({ message: "Корзина очищена" });
    } catch (err) {
        res.status(500).json({ message: "Ошибка БД" });
    }
});

app.post("/checkout", async function(req, res) {
    const { username } = req.body;
    try {
        const user = await db.get("SELECT UserId FROM users WHERE UserName = ?", [username]);
        if (!user) return res.status(404).json({ message: "Юзер не найден" });

        const cart = await db.all("SELECT * FROM CartItems WHERE UserId = ?", [user.UserId]);
        if (cart.length === 0) return res.status(400).json({ message: "Корзина пуста" });

        const randomBranchId = Math.floor(Math.random() * 3) + 1;

        const orderResult = await db.run(
            "INSERT INTO Orders (UserId, BranchId, Status) VALUES (?, ?, 'Обработан')", 
            [user.UserId, randomBranchId]
        );
        const orderId = orderResult.lastID;

        for (let item of cart) {
            await db.run(
                "INSERT INTO OrderItems (OrderId, ProductId, QuantityOrder, UnitPriceCart) VALUES (?, ?, ?, ?)",
                [orderId, item.ProductId, item.QuantityCart, item.UnitPriceCart]
            );
        }

        await db.run("DELETE FROM CartItems WHERE UserId = ?", [user.UserId]);
        res.json({ message: "Заказ успешно оформлен!" });
    } catch (err) {
        res.status(500).json({ message: "Ошибка при оформлении заказа" });
    }
});

app.post("/admin-orders", async function(req, res) {
    const { username } = req.body;
    try {
        const orders = await db.all(`
            SELECT o.OrderId, b.BranchAddress, p.ProductName, oi.QuantityOrder, oi.UnitPriceCart
            FROM Orders o
            JOIN users u ON o.UserId = u.UserId
            JOIN OrderItems oi ON o.OrderId = oi.OrderId
            JOIN products p ON oi.ProductId = p.ProductId
            JOIN branches b ON o.BranchId = b.BranchId
            WHERE u.UserName = ?
            ORDER BY o.OrderId DESC
        `, [username]);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
});