const API_BASE = '/api';

const APP_STATE = {
    menu: [],
    categories: { all: "Все", soups: "Супы", main: "Горячее", snacks: "Закуски", desserts: "Десерты", drinks: "Напитки" },
    cart: [],
    orders: [],
    tables: [],
    reviews: [],
    vacancies: [
        { title: "Повар горячего цеха (WOK)", salary: "от 65 000 ₽", desc: "Опыт работы на азиатской кухне приветствуется. График 2/2." },
        { title: "Курьер на авто", salary: "до 90 000 ₽", desc: "Развоз заказов по городу. Ежедневные выплаты." }
    ],
    currentUser: null,
    selectedTableId: null,
    discountPercent: 0,
    useBonuses: false,
    currentFilter: "all",
    searchQuery: ""
};

// Перевод статусов столов на русский для отображения
const TABLE_STATUS_RU = { available: 'Свободен', occupied: 'Занят' };
function tableStatusRu(status) { return TABLE_STATUS_RU[status] || status; }

// ==========================================
// СЕКРЕТНЫЕ ВХОДЫ ДЛЯ ПЕРСОНАЛА
// Бэк-офис:  https://ваш-сайт/#teho-office-2026
// Курьеры:   https://ваш-сайт/#teho-courier-2026
// Обычные посетители этих кнопок не видят.
// ==========================================
const ADMIN_SECRET_HASH = '#teho-office-2026';
const COURIER_SECRET_HASH = '#teho-courier-2026';
function checkAdminHash() {
    if (window.location.hash === ADMIN_SECRET_HASH) {
        if (sessionStorage.getItem('isAdmin') === 'true') Router.navigate('admin-dashboard');
        else Router.navigate('admin-login');
        return true;
    }
    if (window.location.hash === COURIER_SECRET_HASH) {
        if (sessionStorage.getItem('currentCourier')) Router.navigate('courier-dashboard');
        else Router.navigate('courier-login');
        return true;
    }
    return false;
}
window.addEventListener('hashchange', checkAdminHash);

// Фирменная картинка-заглушка (рисуется кодом, не зависит от интернета).
// Показывается, если фото блюда не загрузилось — вместо «битой» иконки.
const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='500' height='360'>" +
    "<rect width='500' height='360' fill='#1E1E1E'/>" +
    "<rect x='1.5' y='1.5' width='497' height='357' fill='none' stroke='#FF4D00' stroke-width='2'/>" +
    "<text x='250' y='168' fill='#FAF8F5' font-family='Montserrat,Arial,sans-serif' font-size='48' font-weight='bold' text-anchor='middle'>ТЭХО</text>" +
    "<text x='250' y='208' fill='#FF4D00' font-family='Arial,sans-serif' font-size='24' text-anchor='middle'>태호</text>" +
    "<text x='250' y='250' fill='#8E8E93' font-family='Arial,sans-serif' font-size='13' text-anchor='middle'>фото готовится</text>" +
    "</svg>"
);

// ==========================================
// СИСТЕМА РОУТИНГА (SPA NAVIGATION)
// ==========================================
const Router = {
    navigate(viewId) {
        if (viewId === 'admin-dashboard' && sessionStorage.getItem('isAdmin') !== 'true') {
            viewId = 'admin-login';
        }
        if (viewId === 'courier-dashboard' && !sessionStorage.getItem('currentCourier')) {
            viewId = 'courier-login';
        }

        // Переключаем видимость экранов
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const activeView = document.getElementById(`view-${viewId}`);
        if (activeView) activeView.classList.remove('hidden');

        // Подсвечиваем активную вкладку в меню навигации
        document.querySelectorAll('.nav-links .nav-item').forEach(a => a.classList.remove('active'));
        const activeLink = document.getElementById(`nav-${viewId}`);
        if (activeLink) activeLink.classList.add('active');

        // Запуск рендеринга модулей под каждый экран
        if (viewId === 'home') Menu.render();
        if (viewId === 'constructor') Constructor.init();
        if (viewId === 'booking') BookingEngine.render();
        if (viewId === 'reviews') ReviewsModule.render();
        if (viewId === 'profile') UserProfile.render();
        if (viewId === 'cart') Cart.render();
        if (viewId === 'career') CareerModule.render();
        if (viewId === 'admin-dashboard') Admin.renderDashboard();
        if (viewId === 'courier-dashboard') CourierAuth.renderDashboard();
        
        window.scrollTo(0, 0);
    }
};

// ==========================================
// МОДУЛЬ МЕНЮ КАТАЛОГА
// ==========================================
const Menu = {
    async render() {
        const grid = document.getElementById('menu-grid');
        const filters = document.getElementById('category-filters');

        filters.innerHTML = Object.entries(APP_STATE.categories).map(([key, val]) => `
            <button class="${APP_STATE.currentFilter === key ? 'active' : ''}" onclick="Menu.setFilter('${key}')">${val}</button>
        `).join('');

        try {
            const response = await fetch(`${API_BASE}/menu`);
            APP_STATE.menu = await response.json(); 

            const filtered = APP_STATE.menu.filter(item => {
                return (APP_STATE.currentFilter === 'all' || item.category === APP_STATE.currentFilter) &&
                       item.name.toLowerCase().includes(APP_STATE.searchQuery.toLowerCase());
            });

            if(filtered.length === 0) {
                grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted)">Блюда не найдены</p>`;
                return;
            }

            grid.innerHTML = filtered.map(item => `
                <div class="product-card">
                    <img src="${item.img}" class="product-img" loading="lazy" referrerpolicy="no-referrer" onerror="Menu.imgFallback(this)">
                    <div class="product-info">
                        <h3>${item.name}</h3>
                        <p style="font-size:12px; color:var(--text-muted); height:34px; overflow:hidden;">${item.desc}</p>
                        <div class="product-meta">
                            <span class="price">${item.price} ₽</span>
                            <button class="btn-primary" onclick="Cart.add(${item.id})">+ Купить</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--danger)">Не удалось загрузить меню. Проверьте сервер.</p>`;
        }
    },
    setFilter(cat) { APP_STATE.currentFilter = cat; this.render(); },
    handleSearch(q) { APP_STATE.searchQuery = q; this.render(); },
    imgFallback(img) { img.onerror = null; img.src = PLACEHOLDER_IMG; }
};

// ==========================================
// ИНТЕРАКТИВНЫЙ КОНСТРУКТОР WOK
// ==========================================
const Constructor = {
    init() {
        const bases = [{id:'egg', name:'Яичная лапша', price:150}, {id:'rice', name:'Рисовая лапша', price:160}, {id:'udon', name:'Лапша Удон', price:170}];
        const sauces = [{id:'teriyaki', name:'Терияки', price:0}, {id:'spicy', name:'Острый кочудян', price:0}, {id:'soy', name:'Соевый премиум', price:0}];
        const toppings = [{id:'chicken', name:'Куриное филе', price:120}, {id:'shrimp', name:'Тигровые креветки', price:180}, {id:'tofu', name:'Свежий Тофу', price:90}];

        document.getElementById('constructor-base').innerHTML = bases.map(b => `
            <label class="tile-label"><input type="radio" name="wok-base" value="${b.id}" data-price="${b.price}" data-name="${b.name}" onchange="Constructor.calculate()"> ${b.name} (+${b.price}₽)</label>
        `).join('');
        document.getElementById('constructor-sauce').innerHTML = sauces.map(s => `
            <label class="tile-label"><input type="radio" name="wok-sauce" value="${s.id}" data-price="${s.price}" data-name="${s.name}" onchange="Constructor.calculate()"> ${s.name}</label>
        `).join('');
        document.getElementById('constructor-toppings').innerHTML = toppings.map(t => `
            <label class="tile-label"><input type="checkbox" name="wok-topping" value="${t.id}" data-price="${t.price}" data-name="${t.name}" onchange="Constructor.calculate()"> ${t.name} (+${t.price}₽)</label>
        `).join('');
        this.calculate();
    },
    calculate() {
        const baseOpt = document.querySelector('input[name="wok-base"]:checked');
        const sauceOpt = document.querySelector('input[name="wok-sauce"]:checked');
        const toppingOpts = document.querySelectorAll('input[name="wok-topping"]:checked');

        let total = 0; let summary = [];
        if (baseOpt) { total += parseInt(baseOpt.dataset.price); summary.push(`Основа: ${baseOpt.dataset.name}`); }
        if (sauceOpt) { total += parseInt(sauceOpt.dataset.price); summary.push(`Соус: ${sauceOpt.dataset.name}`); }
        if (toppingOpts.length > 0) {
            let tops = []; toppingOpts.forEach(t => { total += parseInt(t.dataset.price); tops.push(t.dataset.name); });
            summary.push(`Топпинги: ${tops.join(', ')}`);
        }
        document.getElementById('constructor-summary').innerHTML = summary.length > 0 ? summary.join('<br>') : 'Выберите основу и соус лапши';
        document.getElementById('constructor-total-price').innerText = total;
    },
    addToCart() {
        const baseOpt = document.querySelector('input[name="wok-base"]:checked');
        if (!baseOpt) return alert('Выберите основу лапши!');
        const price = parseInt(document.getElementById('constructor-total-price').innerText);
        const desc = document.getElementById('constructor-summary').innerText.replace(/\n/g, ', ');

        const customItem = { id: Date.now(), name: `WOK Конструктор (${baseOpt.dataset.name})`, price: price, category: 'main', desc: desc, img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500' };
        APP_STATE.cart.push({ product: customItem, quantity: 1 });
        Cart.updateBadge();
        alert('Ваш кастомный WOK успешно добавлен в корзину!');
        Router.navigate('cart');
    }
};

// ==========================================
// БРОНИРОВАНИЕ СТОЛОВ
// ==========================================
const BookingEngine = {
    async render() {
        try {
            const res = await fetch(`${API_BASE}/tables`);
            APP_STATE.tables = await res.json();
            const grid = document.getElementById('restaurant-tables-grid');
            grid.innerHTML = APP_STATE.tables.map(t => `
                <div class="table-unit ${t.status} ${APP_STATE.selectedTableId === t.id ? 'selected' : ''}" onclick="BookingEngine.selectTable(${t.id}, '${t.status}')">
                    Стол #${t.id} <span style="display:block; font-size:11px; font-weight:400; margin-top:5px;">мест: ${t.capacity}</span>
                    <span style="display:block; font-size:11px; font-weight:600; margin-top:4px;">${tableStatusRu(t.status)}</span>
                </div>
            `).join('');
        } catch(e) { console.error(e); }
    },
    selectTable(id, status) {
        if (status === 'occupied') return alert('Этот стол забронирован.');
        APP_STATE.selectedTableId = (APP_STATE.selectedTableId === id) ? null : id;
        document.getElementById('selected-table-info').innerText = APP_STATE.selectedTableId ? `Выбран стол #${APP_STATE.selectedTableId}` : 'Стол не выбран';
        this.render();
    },
    async submitBooking() {
        if (!APP_STATE.selectedTableId) return alert('Выберите стол на схеме зала!');
        const date = document.getElementById('book-date').value;
        const time = document.getElementById('book-time').value;
        if (!date || !time) return alert('Укажите дату и время!');

        await fetch(`${API_BASE}/tables/${APP_STATE.selectedTableId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'occupied' })
        });
        APP_STATE.selectedTableId = null;
        alert('Бронирование закреплено за вами!');
        Router.navigate('home');
    }
};

// ==========================================
// ОТЗЫВЫ
// ==========================================
const ReviewsModule = {
    async render() {
        const container = document.getElementById('reviews-container');
        try {
            const res = await fetch(`${API_BASE}/reviews`);
            APP_STATE.reviews = await res.json();
            container.innerHTML = APP_STATE.reviews.map(r => `
                <div class="review-card">
                    <div class="review-header"><strong>${r.name}</strong><span class="rating-stars">${'★'.repeat(r.rating)}</span></div>
                    <p style="font-size:13px; color:var(--text-muted);">${r.text}</p>
                </div>
            `).join('');
        } catch(e) { container.innerHTML = 'Загрузка отзывов недоступна.'; }
    },
    async addReview(e) {
        e.preventDefault();
        const review = {
            name: document.getElementById('rev-name').value,
            rating: parseInt(document.getElementById('rev-rating').value),
            text: document.getElementById('rev-text').value
        };
        await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(review)
        });
        alert('Отзыв отправлен модератору компании.');
        e.target.reset();
    }
};

// ==========================================
// КОРЗИНА И РАСЧЕТЫ
// ==========================================
const Cart = {
    add(id) {
        const prod = APP_STATE.menu.find(x => x.id === id);
        const item = APP_STATE.cart.find(x => x.product.id === id);
        if (item) item.quantity++; else APP_STATE.cart.push({ product: prod, quantity: 1 });
        this.updateBadge();
        alert('Блюдо добавлено в корзину!');
    },
    updateBadge() {
        document.getElementById('cart-counter').innerText = APP_STATE.cart.reduce((a, b) => a + b.quantity, 0);
    },
    render() {
        const container = document.getElementById('cart-items-container');
        const bonusContainer = document.getElementById('bonus-burn-container');
        
        if (APP_STATE.cart.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--text-muted); grid-column: 1/-1; padding: 40px 0;">Корзина пуста</p>`;
            bonusContainer.innerHTML = '';
            this.recalculateTotal();
            return;
        }

        container.innerHTML = APP_STATE.cart.map(i => `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; background:var(--bg-surface); padding:15px; border-radius:6px; align-items:center;">
                <div><h4>${i.product.name}</h4><p style="font-size:11px; color:var(--text-muted);">${i.product.desc}</p></div>
                <strong>${i.product.price * i.quantity} ₽ (x${i.quantity})</strong>
            </div>
        `).join('');

        if (APP_STATE.currentUser && APP_STATE.currentUser.bonuses > 0) {
            bonusContainer.innerHTML = `<label><input type="checkbox" onchange="Cart.toggleBonuses(this.checked)"> Списать накопленные бонусы: ${APP_STATE.currentUser.bonuses} Б</label>`;
        } else { bonusContainer.innerHTML = ''; }
        this.recalculateTotal();
    },
    toggleBonuses(c) { APP_STATE.useBonuses = c; this.recalculateTotal(); },
    applyPromo() {
        if (document.getElementById('promo-input').value.toUpperCase() === 'TEHO2026') {
            APP_STATE.discountPercent = 15; alert('Промокод на 15% учтен.'); this.recalculateTotal();
        }
    },
    toggleDeliveryFields(val) {
        document.getElementById('delivery-zone-group').classList.toggle('hidden', val === 'pickup');
        document.getElementById('delivery-address-group').classList.toggle('hidden', val === 'pickup');
        APP_STATE.discountPercent = (val === 'pickup') ? 10 : 0;
        this.recalculateTotal();
    },
    recalculateTotal() {
        const itemsPrice = APP_STATE.cart.reduce((a, b) => a + (b.product.price * b.quantity), 0);
        const delType = document.getElementById('order-delivery-type')?.value || 'delivery';
        const zone = document.getElementById('order-zone')?.value || 'center';
        
        let delPrice = (delType === 'delivery') ? (zone === 'sleeping' ? 150 : zone === 'remote' ? 300 : 0) : 0;
        let discount = Math.round(itemsPrice * (APP_STATE.discountPercent / 100));
        let bonusPaid = (APP_STATE.useBonuses && APP_STATE.currentUser) ? Math.min(APP_STATE.currentUser.bonuses, Math.round((itemsPrice + delPrice - discount) * 0.5)) : 0;
        let finalPrice = itemsPrice + delPrice - discount - bonusPaid;

        if(document.getElementById('summary-items-price')) {
            document.getElementById('summary-items-price').innerText = itemsPrice;
            document.getElementById('summary-delivery-price').innerText = delPrice;
            document.getElementById('summary-discount-row').classList.toggle('hidden', discount === 0);
            document.getElementById('summary-discount-value').innerText = discount;
            document.getElementById('summary-bonus-row').classList.toggle('hidden', bonusPaid === 0);
            document.getElementById('summary-bonus-value').innerText = bonusPaid;
            document.getElementById('summary-total-price').innerText = finalPrice;
        }
    },
    async handleCheckout(e) {
        e.preventDefault();
        const final = parseInt(document.getElementById('summary-total-price').innerText);
        const orderData = {
            client: document.getElementById('order-name').value,
            details: APP_STATE.cart.map(i => `${i.product.name} (x${i.quantity})`).join(', '),
            total: final, courier: "Ожидает назначения", status: "Готовится",
            user_phone: APP_STATE.currentUser ? APP_STATE.currentUser.phone : null
        };
        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        if(res.ok) { alert('Заказ отправлен на кухню ресторана!'); APP_STATE.cart = []; this.updateBadge(); Router.navigate('home'); }
    }
};

// ==========================================
// ПРОФИЛЬ И ВАКАНСИИ
// ==========================================
const UserProfile = {
    showError(msg) {
        const el = document.getElementById('user-auth-error');
        el.innerText = msg; el.classList.remove('hidden');
    },
    async register() {
        const phone = document.getElementById('user-auth-phone').value.trim();
        const password = document.getElementById('user-auth-password').value;
        if (phone.length < 5 || password.length < 4) return this.showError('Введите телефон и пароль (минимум 4 символа).');
        try {
            const res = await fetch(`${API_BASE}/users/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            const data = await res.json();
            if (!res.ok) return this.showError(data.error || 'Ошибка регистрации.');
            APP_STATE.currentUser = data.user;
            sessionStorage.setItem('currentUser', JSON.stringify(data.user));
            alert('Регистрация успешна! Вам начислено 100 бонусов.');
            this.render();
        } catch (e) { this.showError('Сервер недоступен.'); }
    },
    async login() {
        const phone = document.getElementById('user-auth-phone').value.trim();
        const password = document.getElementById('user-auth-password').value;
        if (!phone || !password) return this.showError('Введите телефон и пароль.');
        try {
            const res = await fetch(`${API_BASE}/users/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            const data = await res.json();
            if (!res.ok) return this.showError(data.error || 'Ошибка входа.');
            APP_STATE.currentUser = data.user;
            sessionStorage.setItem('currentUser', JSON.stringify(data.user));
            this.render();
        } catch (e) { this.showError('Сервер недоступен.'); }
    },
    logout() {
        APP_STATE.currentUser = null;
        sessionStorage.removeItem('currentUser');
        document.getElementById('nav-profile-link').innerText = 'Войти';
        this.render();
    },
    async render() {
        const auth = document.getElementById('profile-auth-block');
        const dash = document.getElementById('profile-dashboard-block');
        const errEl = document.getElementById('user-auth-error');
        if (errEl) errEl.classList.add('hidden');

        if (!APP_STATE.currentUser) {
            auth.classList.remove('hidden'); dash.classList.add('hidden');
            return;
        }
        auth.classList.add('hidden'); dash.classList.remove('hidden');
        document.getElementById('nav-profile-link').innerText = 'Кабинет';
        document.getElementById('user-display-phone').innerText = APP_STATE.currentUser.phone;
        document.getElementById('user-display-bonuses').innerText = APP_STATE.currentUser.bonuses;

        // Загружаем реальные заказы этого пользователя из базы
        const historyBox = document.getElementById('user-orders-history');
        historyBox.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Загрузка...</p>';
        try {
            const res = await fetch(`${API_BASE}/my-orders/${encodeURIComponent(APP_STATE.currentUser.phone)}`);
            const orders = await res.json();
            if (!orders.length) {
                historyBox.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">У вас пока нет заказов.</p>';
                return;
            }
            historyBox.innerHTML = orders.map(o => `
                <div style="padding:12px 0; border-bottom:1px solid #333;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong>Заказ #${o.id}</strong>
                        <span style="color:var(--accent);">${o.total} ₽</span>
                    </div>
                    <p style="font-size:12px; color:var(--text-muted); margin:5px 0 0;">${o.details}</p>
                    <p style="font-size:11px; color:var(--text-muted); margin:3px 0 0;">Статус: ${o.status} · ${o.created_at || ''}</p>
                </div>
            `).join('');
        } catch (e) {
            historyBox.innerHTML = '<p style="color:var(--danger); font-size:13px;">Не удалось загрузить заказы.</p>';
        }
    }
};
const CareerModule = {
    render() {
        document.getElementById('vacancies-container').innerHTML = APP_STATE.vacancies.map(v => `
            <div class="checkout-card" style="margin-bottom:15px;">
                <h3>${v.title} <span style="float:right; color:var(--accent); font-size:16px;">${v.salary}</span></h3>
                <p style="margin: 10px 0; font-size:13px; color:var(--text-muted);">${v.desc}</p>
                <button class="btn-primary" onclick="CareerModule.openForm('${v.title.replace(/'/g, "\\'")}')">Откликнуться</button>
            </div>
        `).join('');
    },
    openForm(title) {
        document.getElementById('application-vacancy-title').innerText = title;
        document.getElementById('application-modal').classList.remove('hidden');
    },
    closeForm() {
        document.getElementById('application-modal').classList.add('hidden');
    },
    async submitForm(e) {
        e.preventDefault();
        const payload = {
            vacancy: document.getElementById('application-vacancy-title').innerText,
            name: document.getElementById('app-name').value,
            phone: document.getElementById('app-phone').value,
            age: document.getElementById('app-age').value,
            experience: document.getElementById('app-experience').value,
            message: document.getElementById('app-message').value
        };
        try {
            const res = await fetch(`${API_BASE}/applications`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error();
            alert('Анкета отправлена в отдел кадров ТЭХО. Мы свяжемся с вами!');
            e.target.reset();
            this.closeForm();
        } catch (err) { alert('Не удалось отправить анкету. Попробуйте позже.'); }
    }
};

// ==========================================
// УПРАВЛЕНИЕ АДМИН-ПАНЕЛЬЮ
// ==========================================
const Admin = {
    login(e) {
        e.preventDefault();
        if (document.getElementById('login-username').value === 'admin' && document.getElementById('login-password').value === 'teho2026') {
            sessionStorage.setItem('isAdmin', 'true'); Router.navigate('admin-dashboard');
        } else { document.getElementById('login-error').classList.remove('hidden'); }
    },
    logout() { sessionStorage.removeItem('isAdmin'); history.replaceState(null, '', window.location.pathname); Router.navigate('home'); },
    switchTab(tab, e) {
        if(e) e.preventDefault();
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`admin-tab-${tab}`).classList.remove('hidden');
        if(e) e.target.classList.add('active');
    },
    async renderDashboard() {
        const [ordersRes, tablesRes, reviewsRes, appsRes, couriersRes] = await Promise.all([
            fetch(`${API_BASE}/orders`), fetch(`${API_BASE}/tables`),
            fetch(`${API_BASE}/reviews?all=true`), fetch(`${API_BASE}/applications`),
            fetch(`${API_BASE}/couriers`)
        ]);
        const orders = await ordersRes.json();
        const tables = await tablesRes.json();
        const reviews = await reviewsRes.json();
        const applications = await appsRes.json();
        const couriers = await couriersRes.json();

        const courierOptions = (selectedId) => `
            <option value="">— не назначен —</option>
            ${couriers.map(c => `<option value="${c.id}" ${selectedId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        `;

        document.getElementById('admin-orders-table').innerHTML = orders.map(o => `
            <tr><td>#${o.id}</td><td>${o.client}</td><td>${o.details}</td><td>${o.total} ₽</td>
            <td><select onchange="Admin.assignCourier(${o.id}, this.value)">${courierOptions(o.courier_id)}</select></td>
            <td><select onchange="Admin.updateStatus(${o.id}, this.value)"><option value="Готовится" ${o.status==='Готовится'?'selected':''}>Готовится</option><option value="В пути" ${o.status==='В пути'?'selected':''}>В пути</option><option value="Доставлен" ${o.status==='Доставлен'?'selected':''}>Доставлен</option></select></td></tr>
        `).join('');

        // Список курьеров
        document.getElementById('admin-couriers-list').innerHTML = couriers.length ? couriers.map(c => `
            <div class="checkout-card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${c.name}</strong>
                    <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0;">${c.phone}</p>
                </div>
                <div style="text-align:right;">
                    <span class="${c.status === 'free' ? 'status-free' : 'status-busy'}" style="font-size:13px; font-weight:600;">${c.status === 'free' ? 'Свободен' : 'Занят'}</span><br>
                    <button class="btn-danger" style="margin-top:8px;" onclick="Admin.deleteCourier(${c.id})">Удалить</button>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-muted);">Курьеров пока нет. Добавьте первого слева.</p>';

        document.getElementById('admin-tables-list').innerHTML = tables.map(t => `
            <div class="checkout-card" style="text-align:center;">
                <h4>Стол #${t.id}</h4>
                <p>Мест: ${t.capacity}</p>
                <p>Статус: <strong class="${t.status === 'available' ? 'status-free' : 'status-busy'}">${tableStatusRu(t.status)}</strong></p>
                ${t.status === 'available'
                    ? `<button class="btn-primary" style="margin-top:10px;" onclick="Admin.setTable(${t.id}, 'occupied')">Занять</button>`
                    : `<button class="btn-danger" style="margin-top:10px;" onclick="Admin.setTable(${t.id}, 'available')">Освободить</button>`}
            </div>
        `).join('');

        document.getElementById('admin-menu-list').innerHTML = APP_STATE.menu.map(m => `
            <div class="admin-menu-item"><span>${m.name}</span><input type="number" style="width:80px;" value="${m.price}" onchange="Admin.updatePrice(${m.id}, this.value)"> ₽</div>
        `).join('');

        document.getElementById('admin-reviews-list').innerHTML = reviews.length ? reviews.map(r => `
            <div class="review-card">
                <strong>${r.name} (★ ${r.rating})</strong>
                <p>${r.text}</p>
                <div style="display:flex; gap:10px; margin-top:8px;">
                    ${!r.approved ? `<button class="btn-primary" onclick="Admin.approveReview(${r.id})">Одобрить</button>` : '<span style="color:var(--success); font-size:13px; align-self:center;">✓ Опубликован</span>'}
                    <button class="btn-danger" onclick="Admin.deleteReview(${r.id})">Удалить</button>
                </div>
            </div>
        `).join('') : '<p style="color:var(--text-muted);">Отзывов пока нет.</p>';

        document.getElementById('admin-applications-list').innerHTML = applications.length ? applications.map(a => `
            <div class="checkout-card" style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${a.name}</strong>
                    <span style="color:var(--accent); font-size:13px;">${a.vacancy}</span>
                </div>
                <p style="font-size:13px; margin:6px 0;">📞 ${a.phone}${a.age ? ` · Возраст: ${a.age}` : ''}</p>
                ${a.experience ? `<p style="font-size:13px; margin:4px 0; color:var(--text-muted);">Опыт: ${a.experience}</p>` : ''}
                ${a.message ? `<p style="font-size:13px; margin:4px 0; color:var(--text-muted);">«${a.message}»</p>` : ''}
                <p style="font-size:11px; color:var(--text-muted); margin:4px 0 0;">${a.created_at || ''}</p>
            </div>
        `).join('') : '<p style="color:var(--text-muted);">Откликов пока нет.</p>';
    },
    async updateStatus(id, s) { await fetch(`${API_BASE}/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) }); },
    async setTable(id, status) { await fetch(`${API_BASE}/tables/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); this.renderDashboard(); },
    async updatePrice(id, p) { await fetch(`${API_BASE}/menu/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price: parseInt(p) }) }); },
    async approveReview(id) { await fetch(`${API_BASE}/reviews/${id}/approve`, { method: 'PUT' }); this.renderDashboard(); },
    async deleteReview(id) { if (!confirm('Удалить этот отзыв безвозвратно?')) return; await fetch(`${API_BASE}/reviews/${id}`, { method: 'DELETE' }); this.renderDashboard(); },
    async assignCourier(orderId, courierId) {
        await fetch(`${API_BASE}/orders/${orderId}/assign`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courier_id: courierId ? parseInt(courierId) : null })
        });
        this.renderDashboard();
    },
    async addCourier() {
        const name = document.getElementById('courier-new-name').value;
        const phone = document.getElementById('courier-new-phone').value;
        const password = document.getElementById('courier-new-password').value;
        const errEl = document.getElementById('courier-add-error');
        errEl.classList.add('hidden');
        try {
            const res = await fetch(`${API_BASE}/couriers`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password })
            });
            const data = await res.json();
            if (!res.ok) { errEl.innerText = data.error || 'Ошибка.'; errEl.classList.remove('hidden'); return; }
            document.getElementById('courier-new-name').value = '';
            document.getElementById('courier-new-phone').value = '';
            document.getElementById('courier-new-password').value = '';
            alert('Курьер добавлен. Он сможет войти по своему телефону и паролю.');
            this.renderDashboard();
        } catch (e) { errEl.innerText = 'Сервер недоступен.'; errEl.classList.remove('hidden'); }
    },
    async deleteCourier(id) {
        if (!confirm('Удалить курьера? Его заказы станут «не назначены».')) return;
        await fetch(`${API_BASE}/couriers/${id}`, { method: 'DELETE' });
        this.renderDashboard();
    }
};

// ==========================================
// КАБИНЕТ КУРЬЕРА
// ==========================================
const CourierAuth = {
    showError(msg) { const el = document.getElementById('courier-auth-error'); el.innerText = msg; el.classList.remove('hidden'); },
    async login() {
        const phone = document.getElementById('courier-auth-phone').value.trim();
        const password = document.getElementById('courier-auth-password').value;
        if (!phone || !password) return this.showError('Введите телефон и пароль.');
        try {
            const res = await fetch(`${API_BASE}/couriers/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            const data = await res.json();
            if (!res.ok) return this.showError(data.error || 'Ошибка входа.');
            sessionStorage.setItem('currentCourier', JSON.stringify(data.courier));
            Router.navigate('courier-dashboard');
        } catch (e) { this.showError('Сервер недоступен.'); }
    },
    logout() {
        sessionStorage.removeItem('currentCourier');
        history.replaceState(null, '', window.location.pathname);
        Router.navigate('home');
    },
    getCourier() {
        try { return JSON.parse(sessionStorage.getItem('currentCourier')); } catch (e) { return null; }
    },
    async renderDashboard() {
        const courier = this.getCourier();
        if (!courier) return Router.navigate('courier-login');
        document.getElementById('courier-name-display').innerText = `${courier.name} · ${courier.phone}`;
        const list = document.getElementById('courier-orders-list');
        list.innerHTML = '<p style="color:var(--text-muted);">Загрузка...</p>';
        try {
            const res = await fetch(`${API_BASE}/courier-orders/${courier.id}`);
            const orders = await res.json();
            if (!orders.length) {
                list.innerHTML = '<p style="color:var(--text-muted);">Вам пока не назначено ни одного заказа.</p>';
                return;
            }
            list.innerHTML = orders.map(o => `
                <div class="checkout-card" style="margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0;">Заказ #${o.id}</h3>
                        <span class="order-status-badge status-${o.status === 'Доставлен' ? 'done' : 'active'}">${o.status}</span>
                    </div>
                    <p style="margin:10px 0 4px;"><strong>Клиент:</strong> ${o.client}</p>
                    <p style="font-size:13px; color:var(--text-muted); margin:4px 0;">${o.details}</p>
                    <p style="margin:4px 0;"><strong>Сумма:</strong> ${o.total} ₽</p>
                    <p style="font-size:11px; color:var(--text-muted); margin:4px 0;">${o.created_at || ''}</p>
                    ${o.status !== 'Доставлен' ? `
                    <div style="display:flex; gap:10px; margin-top:12px;">
                        ${o.status !== 'В пути' ? `<button class="btn-primary" onclick="CourierAuth.setStatus(${o.id}, 'В пути')">Взял в путь</button>` : ''}
                        <button class="btn-success" style="width:auto; padding:8px 16px;" onclick="CourierAuth.setStatus(${o.id}, 'Доставлен')">Доставлен</button>
                    </div>` : '<p style="color:var(--success); margin-top:10px;">✓ Заказ доставлен</p>'}
                </div>
            `).join('');
        } catch (e) { list.innerHTML = '<p style="color:var(--danger);">Не удалось загрузить заказы.</p>'; }
    },
    async setStatus(orderId, status) {
        await fetch(`${API_BASE}/courier-orders/${orderId}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        this.renderDashboard();
    }
};

window.onload = () => {
    const saved = sessionStorage.getItem('currentUser');
    if (saved) {
        try {
            APP_STATE.currentUser = JSON.parse(saved);
            document.getElementById('nav-profile-link').innerText = 'Кабинет';
        } catch (e) { sessionStorage.removeItem('currentUser'); }
    }
    // Если открыли по секретной ссылке — ведём в бэк-офис, иначе на главную
    if (!checkAdminHash()) {
        Router.navigate('home');
    }
};