import express from "express";
import mysql from "mysql2/promise";

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
    database: "userdb",
    connectionLimit: 5
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
    res.set("Cache-Control", "no-store");
    const {userName, userPassword} = req.body;
    
    if (!userName || !userPassword) {
        return res.status(400).json({ message: "Заполни все поля!" });
    }

    try {
        await pool.query(
            "INSERT INTO users_pass (userName, userPassword) VALUES (?, ?)",
            [userName, userPassword]
        );

        res.json({ message: `Ваши данные ${userName} успешно сохранены на БД!` });
    } catch (err) {
        console.error("Ошибка при записи в БД:", err);
        res.status(500).json({ message: "Ошибка базы данных" });
    }
});

app.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
});