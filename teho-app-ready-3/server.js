const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');
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

// Хелперы для асинхронных запросов к БД
const dbQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes });
    });
});

// ==========================================
// АВТО-МИГРАЦИЯ СХЕМЫ (безопасно при каждом старте)
// ==========================================
db.serialize(() => {
    // Таблица пользователей (авторизация по телефону + пароль)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        bonuses INTEGER DEFAULT 100,
        created_at TEXT
    )`);

    // Таблица анкет-откликов на вакансии
    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vacancy TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        age TEXT,
        experience TEXT,
        message TEXT,
        created_at TEXT
    )`);

    // Привязка заказов к пользователю — добавляем колонку, если её ещё нет
    db.run(`ALTER TABLE orders ADD COLUMN user_phone TEXT`, (err) => {
        // Ошибка "duplicate column" означает, что колонка уже есть — это нормально
    });

    // Таблица курьеров
    db.run(`CREATE TABLE IF NOT EXISTS couriers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'free',
        created_at TEXT
    )`);

    // Привязка заказа к курьеру (id назначенного курьера)
    db.run(`ALTER TABLE orders ADD COLUMN courier_id INTEGER`, (err) => {
        // Колонка уже есть — это нормально
    });
});

// ==========================================
// ХЕЛПЕРЫ ПАРОЛЕЙ (встроенный crypto, без сторонних библиотек)
// ==========================================
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
    try {
        const [salt, hash] = stored.split(':');
        const test = crypto.scryptSync(password, salt, 64).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
    } catch (e) { return false; }
}

// ==========================================
// API: ПОЛЬЗОВАТЕЛИ (РЕГИСТРАЦИЯ И ВХОД)
// ==========================================

// Регистрация
app.post('/api/users/register', async (req, res) => {
    let { phone, password } = req.body;
    phone = (phone || '').trim();
    if (phone.length < 5 || !password || password.length < 4) {
        return res.status(400).json({ error: 'Укажите телефон и пароль (минимум 4 символа).' });
    }
    try {
        const existing = await dbGet('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existing) return res.status(409).json({ error: 'Пользователь с таким номером уже зарегистрирован.' });

        await dbRun(
            `INSERT INTO users (phone, password, bonuses, created_at) VALUES (?, ?, 100, DATETIME('now','localtime'))`,
            [phone, hashPassword(password)]
        );
        res.status(201).json({ success: true, user: { phone, bonuses: 100 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Вход
app.post('/api/users/login', async (req, res) => {
    let { phone, password } = req.body;
    phone = (phone || '').trim();
    try {
        const user = await dbGet('SELECT * FROM users WHERE phone = ?', [phone]);
        if (!user || !verifyPassword(password || '', user.password)) {
            return res.status(401).json({ error: 'Неверный номер телефона или пароль.' });
        }
        res.json({ success: true, user: { phone: user.phone, bonuses: user.bonuses } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Заказы конкретного пользователя
app.get('/api/my-orders/:phone', async (req, res) => {
    try {
        const orders = await dbQuery(
            'SELECT * FROM orders WHERE user_phone = ? ORDER BY id DESC',
            [req.params.phone]
        );
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// API: МЕНЮ
// ==========================================
app.get('/api/menu', async (req, res) => {
    try { res.json(await dbQuery('SELECT * FROM menu')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/menu/:id', async (req, res) => {
    try {
        await dbRun('UPDATE menu SET price = ? WHERE id = ?', [req.body.price, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API: ЗАКАЗЫ
// ==========================================
app.post('/api/orders', async (req, res) => {
    const { client, details, total, courier, status, user_phone } = req.body;
    try {
        const result = await dbRun(
            `INSERT INTO orders (client, details, total, courier, status, user_phone, created_at)
             VALUES (?, ?, ?, ?, ?, ?, DATETIME('now', 'localtime'))`,
            [client, details, total, courier, status, user_phone || null]
        );
        res.status(201).json({ success: true, orderId: result.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    try { res.json(await dbQuery('SELECT * FROM orders ORDER BY id DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        await dbRun('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API: СТОЛЫ
// ==========================================
app.get('/api/tables', async (req, res) => {
    try { res.json(await dbQuery('SELECT * FROM tables')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tables/:id', async (req, res) => {
    try {
        await dbRun('UPDATE tables SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API: ОТЗЫВЫ
// ==========================================
app.get('/api/reviews', async (req, res) => {
    const sql = req.query.all === 'true' ? 'SELECT * FROM reviews' : 'SELECT * FROM reviews WHERE approved = 1';
    try { res.json(await dbQuery(sql)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reviews', async (req, res) => {
    const { name, rating, text } = req.body;
    try {
        await dbRun('INSERT INTO reviews (name, rating, text, approved) VALUES (?, ?, ?, 0)', [name, rating, text]);
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/reviews/:id/approve', async (req, res) => {
    try {
        await dbRun('UPDATE reviews SET approved = 1 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// НОВОЕ: удаление отзыва
app.delete('/api/reviews/:id', async (req, res) => {
    try {
        await dbRun('DELETE FROM reviews WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API: АНКЕТЫ НА ВАКАНСИИ
// ==========================================
app.post('/api/applications', async (req, res) => {
    const { vacancy, name, phone, age, experience, message } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Имя и телефон обязательны.' });
    try {
        await dbRun(
            `INSERT INTO applications (vacancy, name, phone, age, experience, message, created_at)
             VALUES (?, ?, ?, ?, ?, ?, DATETIME('now','localtime'))`,
            [vacancy || 'Не указана', name, phone, age || '', experience || '', message || '']
        );
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/applications', async (req, res) => {
    try { res.json(await dbQuery('SELECT * FROM applications ORDER BY id DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// API: КУРЬЕРЫ
// ==========================================

// Список курьеров (для админки и назначения)
app.get('/api/couriers', async (req, res) => {
    try {
        res.json(await dbQuery('SELECT id, name, phone, status FROM couriers ORDER BY id'));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Добавить курьера (админка)
app.post('/api/couriers', async (req, res) => {
    let { name, phone, password } = req.body;
    name = (name || '').trim(); phone = (phone || '').trim();
    if (!name || phone.length < 5 || !password || password.length < 4) {
        return res.status(400).json({ error: 'Укажите имя, телефон и пароль (минимум 4 символа).' });
    }
    try {
        const existing = await dbGet('SELECT id FROM couriers WHERE phone = ?', [phone]);
        if (existing) return res.status(409).json({ error: 'Курьер с таким телефоном уже есть.' });
        await dbRun(
            `INSERT INTO couriers (name, phone, password, status, created_at) VALUES (?, ?, ?, 'free', DATETIME('now','localtime'))`,
            [name, phone, hashPassword(password)]
        );
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Удалить курьера (админка)
app.delete('/api/couriers/:id', async (req, res) => {
    try {
        await dbRun('DELETE FROM couriers WHERE id = ?', [req.params.id]);
        // Снимаем назначение с его заказов
        await dbRun('UPDATE orders SET courier_id = NULL, courier = ? WHERE courier_id = ?', ['Ожидает назначения', req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Вход курьера
app.post('/api/couriers/login', async (req, res) => {
    let { phone, password } = req.body;
    phone = (phone || '').trim();
    try {
        const courier = await dbGet('SELECT * FROM couriers WHERE phone = ?', [phone]);
        if (!courier || !verifyPassword(password || '', courier.password)) {
            return res.status(401).json({ error: 'Неверный телефон или пароль.' });
        }
        res.json({ success: true, courier: { id: courier.id, name: courier.name, phone: courier.phone, status: courier.status } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Назначить курьера на заказ (админка)
app.put('/api/orders/:id/assign', async (req, res) => {
    const { courier_id } = req.body;
    try {
        if (!courier_id) {
            // Снять назначение
            await dbRun('UPDATE orders SET courier_id = NULL, courier = ? WHERE id = ?', ['Ожидает назначения', req.params.id]);
            return res.json({ success: true });
        }
        const courier = await dbGet('SELECT name FROM couriers WHERE id = ?', [courier_id]);
        if (!courier) return res.status(404).json({ error: 'Курьер не найден.' });
        await dbRun('UPDATE orders SET courier_id = ?, courier = ? WHERE id = ?', [courier_id, courier.name, req.params.id]);
        await dbRun(`UPDATE couriers SET status = 'busy' WHERE id = ?`, [courier_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Заказы конкретного курьера (его кабинет)
app.get('/api/courier-orders/:courier_id', async (req, res) => {
    try {
        const orders = await dbQuery('SELECT * FROM orders WHERE courier_id = ? ORDER BY id DESC', [req.params.courier_id]);
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Курьер меняет статус заказа (В пути / Доставлен)
app.put('/api/courier-orders/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await dbRun('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        // Если доставлен — освобождаем курьера, когда у него не осталось активных заказов
        if (status === 'Доставлен') {
            const order = await dbGet('SELECT courier_id FROM orders WHERE id = ?', [req.params.id]);
            if (order && order.courier_id) {
                const active = await dbGet(
                    `SELECT COUNT(*) AS cnt FROM orders WHERE courier_id = ? AND status != 'Доставлен'`,
                    [order.courier_id]
                );
                if (active && active.cnt === 0) {
                    await dbRun(`UPDATE couriers SET status = 'free' WHERE id = ?`, [order.courier_id]);
                }
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер бэк-офиса ТЭХО успешно запущен на http://localhost:${PORT}`);
});
