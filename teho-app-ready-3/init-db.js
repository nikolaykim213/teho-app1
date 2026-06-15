const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    console.log('Начало инициализации реляционных таблиц СУБД...');

    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, price INTEGER NOT NULL, category TEXT NOT NULL,
        desc TEXT, img TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client TEXT NOT NULL, details TEXT NOT NULL, total INTEGER NOT NULL,
        courier TEXT, status TEXT NOT NULL, user_phone TEXT, courier_id INTEGER, created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY, capacity INTEGER NOT NULL, status TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, rating INTEGER NOT NULL, text TEXT NOT NULL,
        approved INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
        bonuses INTEGER DEFAULT 100, created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vacancy TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
        age TEXT, experience TEXT, message TEXT, created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS couriers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
        status TEXT DEFAULT 'free', created_at TEXT
    )`);

    db.run('DELETE FROM menu');
    db.run('DELETE FROM tables');

    const menuInsert = db.prepare('INSERT INTO menu (name, price, category, desc, img) VALUES (?, ?, ?, ?, ?)');

    // Супы
    menuInsert.run('Рамен Классический', 450, 'soups', 'Пшеничная лапша, насыщенный свиной бульон, чашу, яйцо нитамаго.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500');
    menuInsert.run('Кимчи Тиге', 420, 'soups', 'Острый суп с ферментированной капустой кимчи, тофу и свининой.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500');
    menuInsert.run('Том Ям по-сеульски', 520, 'soups', 'Корейская интерпретация с морепродуктами и острой пастой кочудян.', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500');
    menuInsert.run('Сундубу Чигэ', 460, 'soups', 'Кипящий острый суп с нежным тофу сундубу, яйцом и морепродуктами.', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500');
    menuInsert.run('Камджатан', 540, 'soups', 'Наваристый суп на свином хребте с картофелем и зеленью перилла.', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500');
    // Горячее
    menuInsert.run('Пибимпаб с говядиной', 490, 'main', 'Рис, овощные закуски панчхан, маринованная говядина, яйцо, соус кочудян.', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500');
    menuInsert.run('Пулькоги из мраморной говядины', 550, 'main', 'Тонкие ломтики говядины, обжаренные в сладком соевом маринаде.', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500');
    menuInsert.run('Ттокпокки в огненном соусе', 380, 'main', 'Рисовые брусочки в соусе кочудян с добавлением рыбных пластин омук.', 'https://images.unsplash.com/photo-1623341214825-9f4f97120187?w=500');
    menuInsert.run('Чапче', 470, 'main', 'Стеклянная лапша из батата, обжаренная с говядиной и овощами.', 'https://images.unsplash.com/photo-1583224994076-ae951d3f0e0c?w=500');
    menuInsert.run('Корейская жареная курица (Чикин)', 590, 'main', 'Хрустящие крылья в глазури из соевого соуса, чеснока и мёда.', 'https://images.unsplash.com/photo-1626082927389-6cd097cee6a6?w=500');
    menuInsert.run('Даккальби', 560, 'main', 'Острая курица, обжаренная с овощами, ттоком и плавленым сыром.', 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=500');
    // Закуски
    menuInsert.run('Манду со свининой', 340, 'snacks', 'Корейские жареные дамплинги с начинкой из фермерской свинины.', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500');
    menuInsert.run('Сет Корейских Салатов Панчхан', 290, 'snacks', 'Традиционный набор: кимчи, битые огурцы, маринованный дайкон.', 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500');
    menuInsert.run('Кимбап', 310, 'snacks', 'Корейские роллы с рисом, овощами и говядиной в листе нори.', 'https://images.unsplash.com/photo-1607301405390-d831c242f59b?w=500');
    menuInsert.run('Острые куриные крылья Янним', 360, 'snacks', 'Крылышки во фритюре в липком сладко-остром соусе янним.', 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500');
    menuInsert.run('Сырный Ток-кочиз', 330, 'snacks', 'Рисовые палочки тток, запечённые в тягучем сырном соусе.', 'https://images.unsplash.com/photo-1635363638580-c2809d049eee?w=500');
    // Десерты
    menuInsert.run('Моти Матча-Клубника', 250, 'desserts', 'Нежное рисовое тесто с кремом на основе чая матча.', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500');
    menuInsert.run('Бинсу с манго', 380, 'desserts', 'Колотый лёд с молоком, кусочками манго и сгущёнкой.', 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?w=500');
    menuInsert.run('Хоттоки', 220, 'desserts', 'Тёплые сладкие блинчики с начинкой из орехов и корицы.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500');
    // Напитки
    menuInsert.run('Юдзу Лимонад крафтовый', 190, 'drinks', 'Освежающий цитрусовый напиток на основе корейского юдзу.', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500');
    menuInsert.run('Сикхе', 170, 'drinks', 'Традиционный сладкий рисовый напиток, подаётся охлаждённым.', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500');
    menuInsert.run('Матча Латте', 240, 'drinks', 'Японский чай матча со вспененным молоком, подаётся со льдом.', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500');
    menuInsert.run('Корейский Персиковый Чай', 180, 'drinks', 'Холодный чай с кусочками спелого персика и лёгкой кислинкой.', 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=500');
    menuInsert.finalize();

    const tableInsert = db.prepare('INSERT INTO tables (id, capacity, status) VALUES (?, ?, ?)');
    tableInsert.run(1, 2, 'available');
    tableInsert.run(2, 4, 'occupied');
    tableInsert.run(3, 2, 'available');
    tableInsert.run(4, 6, 'available');
    tableInsert.run(5, 4, 'available');
    tableInsert.run(6, 2, 'occupied');
    tableInsert.finalize();

    console.log('База данных успешно создана, схемы развернуты, сидинг завершен!');
});

db.close();
