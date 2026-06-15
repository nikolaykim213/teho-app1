const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Мидлвары
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к файлу базы данных
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Ошибка подключения к БД:', err.message);
    else console.log('Успешное сопряжение с базой данных SQLite.');
});

// Хелпер для асинхронных запросов к БД (предотвращает callback hell)
const dbQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

// ==========================================
// API ЭНДПОИНТЫ (RESTful API)
// ==========================================

// 1. Меню: Получение всех блюд
app.get('/api/menu', async (req, res) => {
    try {
        const menu = await dbQuery('SELECT * FROM menu');
        res.json(menu);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Меню: Изменение цены (Админка)
app.put('/api/menu/:id', async (req, res) => {
    const { price } = req.body;
    const { id } = req.params;
    try {
        await dbRun('UPDATE menu SET price = ? WHERE id = ?', [price, id]);
        res.json({ success: true, message: `Цена блюда ${id} обновлена до ${price}₽` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Заказы: Оформление нового заказа
app.post('/api/orders', async (req, res) => {
    const { client, details, total, courier, status } = req.body;
    try {
        const result = await dbRun(
            `INSERT INTO orders (client, details, total, courier, status, created_at) 
             VALUES (?, ?, ?, ?, ?, DATETIME('now', 'localtime'))`,
            [client, details, total, courier, status]
        );
        res.status(201).json({ success: true, orderId: result.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Заказы: Получение списка для диспетчера
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await dbQuery('SELECT * FROM orders ORDER BY id DESC');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Заказы: Смена статуса (Админка)
app.put('/api/orders/:id', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
        await dbRun('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Столы: Получение карты зала
app.get('/api/tables', async (req, res) => {
    try {
        const tables = await dbQuery('SELECT * FROM tables');
        res.json(tables);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Столы: Бронирование / Освобождение
app.put('/api/tables/:id', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
        await dbRun('UPDATE tables SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Отзывы: Получение одобренных для клиентов ИЛИ всех для админа
app.get('/api/reviews', async (req, res) => {
    const { all } = req.query;
    const sql = all === 'true' ? 'SELECT * FROM reviews' : 'SELECT * FROM reviews WHERE approved = 1';
    try {
        const reviews = await dbQuery(sql);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Отзывы: Добавление нового (на премодерацию)
app.post('/api/reviews', async (req, res) => {
    const { name, rating, text } = req.body;
    try {
        await dbRun('INSERT INTO reviews (name, rating, text, approved) VALUES (?, ?, ?, 0)', [name, rating, text]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Отзывы: Одобрение отзыва (Админка)
app.put('/api/reviews/:id/approve', async (req, res) => {
    try {
        await dbRun('UPDATE reviews SET approved = 1 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер бэк-офиса ТЭХО успешно запущен на http://localhost:${PORT}`);
});