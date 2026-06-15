const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    console.log('Начало инициализации реляционных таблиц СУБД...');

    // Таблица меню
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        category TEXT NOT NULL,
        desc TEXT,
        img TEXT
    )`);

    // Таблица заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client TEXT NOT NULL,
        details TEXT NOT NULL,
        total INTEGER NOT NULL,
        courier TEXT,
        status TEXT NOT NULL,
        created_at TEXT
    )`);

    // Таблица столов
    db.run(`CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY,
        capacity INTEGER NOT NULL,
        status TEXT NOT NULL
    )`);

    // Таблица отзывов
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        text TEXT NOT NULL,
        approved INTEGER DEFAULT 0
    )`);

    // Очистка старых данных перед наполнением, чтобы избежать дублирования
    db.run('DELETE FROM menu');
    db.run('DELETE FROM tables');

    // Наполнение меню (Спид-сидинг)
    const menuInsert = db.prepare('INSERT INTO menu (name, price, category, desc, img) VALUES (?, ?, ?, ?, ?)');
    
    // Супы
    menuInsert.run('Рамен Классический', 450, 'soups', 'Пшеничная лапша, насыщенный свинной бульон, чашу, яйцо нитамаго.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500');
    menuInsert.run('Кимчи Тиге', 420, 'soups', 'Острый суп с ферментированной капустой кимчи, тофу и свининой.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500');
    menuInsert.run('Том Ям по-сеульски', 520, 'soups', 'Корейская интерпретация с морепродуктами и острым пастой кочудян.', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500');
    
    // Горячее
    menuInsert.run('Пибимпаб с говядиной', 490, 'main', 'Рис, овощные закуски панчхан, маринованная говядина, яйцо, соус кочудян.', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500');
    menuInsert.run('Пулькоги из мраморной говядины', 550, 'main', 'Тонкие ломтики говядины, обжаренные в сладком соевом маринаде.', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500');
    menuInsert.run('Ттокпокки в огненном соусе', 380, 'main', 'Рисовые брусочки в соусе кочудян с добавлением рыбных пластин омук.', 'https://images.unsplash.com/photo-1623341214825-9f4f97120187?w=500');
    
    // Закуски
    menuInsert.run('Манду со свининой', 340, 'snacks', 'Корейские жареные дамплинги с начинкой из фермерской свинины.', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500');
    menuInsert.run('Сет Корейских Салатов Панчхан', 290, 'snacks', 'Традиционный набор: кимчи, битые огурцы, маринованный дайкон.', 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500');
    
    // Десерты
    menuInsert.run('Моти Матча-Клубника', 250, 'desserts', 'Нежное рисовое тесто с кремом на основе чая матча.', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500');
    
    // Напитки
    menuInsert.run('Юдзу Лимонад крафтовый', 190, 'drinks', 'Освежающий цитрусовый напиток на основе оригинального корейского юдзу.', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500');
    
    menuInsert.finalize();

    // Сидинг столов
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