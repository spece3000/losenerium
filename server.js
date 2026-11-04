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
    database: "losenerium",
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

app.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000');
});