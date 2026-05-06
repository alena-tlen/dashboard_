// ========================
// auth.js - АВТОРИЗАЦИЯ И УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (ПОЛНАЯ ВЕРСИЯ)
// ========================

// Глобальные переменные
let currentUser = null;
let authUsers = [];
let usersLoaded = false;

const USERS_FILE_PATH = 'users.xlsx';

// ========================
// ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ИЗ EXCEL (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Загружает список пользователей из Excel файла
 * @returns {Promise<boolean>} - true если загрузка успешна
 */
async function loadUsersFromFile() {
    const authError = document.getElementById('authError');
    const authInfo = document.getElementById('authSuccess');
    
    try {
        const response = await fetch(USERS_FILE_PATH);
        if (!response.ok) {
            if (authError) authError.textContent = `❌ Файл ${USERS_FILE_PATH} не найден`;
            return false;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: true });
        
        const users = [];
        for (const row of jsonData) {
            let email = row['почта'] || row['email'] || row['Email'] || '';
            let password = row['пароль'] || row['password'] || row['Пароль'] || '';
            let fio = row['фио'] || row['ФИО'] || row['name'] || '';
            let access = row['доступ'] || row['access'] || row['Доступ'] || '';
            
            email = String(email).trim().toLowerCase();
            password = String(password).trim();
            fio = String(fio).trim();
            access = String(access).trim().toLowerCase();
            
            if (!email || !password) continue;
            
            const isBlocked = access === 'заблокирован' || access === 'blocked' || access === 'нет';
            const isAllowed = access === 'разрешён' || access === 'разрешен' || access === 'да' || access === 'yes';
            
            users.push({
                email: email,
                password: password,
                fio: fio || email.split('@')[0],
                isAdmin: email === 'admin@example.com' || fio === 'Администратор',
                blocked: isBlocked || (!isAllowed && access !== '')
            });
        }
        
        if (users.length === 0) {
            if (authError) authError.textContent = '❌ Файл не содержит данных';
            return false;
        }
        
        authUsers = users;
        usersLoaded = true;
        
        const activeCount = users.filter(u => !u.blocked).length;
        if (authInfo) {
            authInfo.textContent = `✅ Загружено ${users.length} пользователей (${activeCount} активных)`;
            authInfo.style.color = '#48bb78';
            setTimeout(() => { if (authInfo) authInfo.textContent = ''; }, 3000);
        }
        
        updateStatusDisplay();
        return true;
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        if (authError) authError.textContent = `❌ Ошибка загрузки файла: ${error.message}`;
        return false;
    }
}

// ========================
// ОТОБРАЖЕНИЕ СТАТУСА БАЗЫ
// ========================

/**
 * Обновляет информацию о загруженных пользователях на странице входа
 */
function updateStatusDisplay() {
    const authTitle = document.getElementById('authTitle');
    if (!authTitle) return;
    
    let statusDiv = document.getElementById('autoStatusDiv');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'autoStatusDiv';
        statusDiv.style.cssText = `
            background: #0f0f1a; 
            border-radius: 8px; 
            padding: 10px; 
            margin-bottom: 16px; 
            font-size: 13px; 
            color: #ffffff !important; 
            border: 1px solid #2d2d3a;
        `;
        authTitle.insertAdjacentElement('afterend', statusDiv);
    }
    
    if (authUsers.length > 0) {
        const activeCount = authUsers.filter(u => !u.blocked).length;
        statusDiv.innerHTML = `📁 База пользователей: ${authUsers.length} чел. (✅ ${activeCount} активных)`;
    } else if (!usersLoaded) {
        statusDiv.innerHTML = `📁 Загрузка базы пользователей...`;
    } else {
        statusDiv.innerHTML = `📁 База пользователей: не загружена`;
    }
}

// ========================
// АВТОРИЗАЦИЯ
// ========================

/**
 * Проверяет логин и пароль
 * @param {string} email - Email пользователя
 * @param {string} password - Пароль
 * @returns {Object} - Результат проверки
 */
function login(email, password) {
    if (!usersLoaded || authUsers.length === 0) {
        return { success: false, error: 'База пользователей не загружена.' };
    }
    
    const user = authUsers.find(u => u.email === email.toLowerCase() && u.password === password);
    
    if (!user) {
        return { success: false, error: 'Неверный email или пароль' };
    }
    
    if (user.blocked) {
        return { success: false, error: 'Ваш аккаунт заблокирован.' };
    }
    
    return { 
        success: true, 
        user: { 
            email: user.email, 
            fio: user.fio, 
            isAdmin: user.isAdmin, 
            blocked: user.blocked 
        } 
    };
}

// ========================
// ВЫХОД ИЗ СИСТЕМЫ
// ========================

/**
 * Выход из системы, очистка данных
 */
function logout() {
    currentUser = null;
    localStorage.removeItem('dashboard_current_user');
    
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('authContainer').style.display = 'flex';
    
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    
    // Очищаем данные
    if (typeof originalData !== 'undefined') {
        originalData = [];
        currentData = [];
    }
}

// ========================
// СБРОС ДАННЫХ
// ========================

/**
 * Сбрасывает все финансовые данные из localStorage
 */
function resetAllData() {
    if (confirm('Сбросить финансовые данные? Все загруженные файлы будут удалены!')) {
        localStorage.removeItem('dashboard_financial_data');
        
        // Очищаем глобальные данные
        if (typeof originalData !== 'undefined') {
            originalData = [];
            currentData = [];
        }
        
        // Очищаем дашборд
        const dashboardMetrics = document.getElementById('dashboardMetrics');
        if (dashboardMetrics) dashboardMetrics.innerHTML = '<div class="loading">Нет данных</div>';
        
        // Скрываем блок денежных средств
        const cashSidebarBlock = document.getElementById('cashSidebarBlock');
        if (cashSidebarBlock) cashSidebarBlock.style.display = 'none';
        
        // Показываем область загрузки
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) uploadArea.style.display = 'block';
        
        alert('Финансовые данные сброшены!');
    }
}

// ========================
// ИНИЦИАЛИЗАЦИЯ АВТОРИЗАЦИИ
// ========================

/**
 * Главная функция инициализации авторизации
 */
async function initAuth() {
    updateStatusDisplay();
    await loadUsersFromFile();
    
    const savedUser = localStorage.getItem('dashboard_current_user');
    
    if (savedUser && usersLoaded && authUsers.length > 0) {
        try {
            const userData = JSON.parse(savedUser);
            const currentUserData = authUsers.find(u => u.email === userData.email);
            
            if (currentUserData && !currentUserData.blocked) {
                currentUser = {
                    email: currentUserData.email,
                    fio: currentUserData.fio,
                    isAdmin: currentUserData.isAdmin,
                    blocked: currentUserData.blocked
                };
                
                document.getElementById('mainApp').style.display = 'block';
                document.getElementById('authContainer').style.display = 'none';
                document.getElementById('userInfo').innerHTML = `👤 ${currentUser.fio}`;
                
                // Показываем кнопку админки если пользователь администратор
                const adminBtn = document.getElementById('adminBtn');
                if (adminBtn && currentUser.isAdmin) {
                    adminBtn.style.display = 'block';
                }
                
                initApp();
                return;
            }
        } catch(e) {
            console.error('Ошибка восстановления сессии:', e);
        }
    }
    
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('authContainer').style.display = 'flex';
    setupAuthForms();
}

// ========================
// НАСТРОЙКА ФОРМЫ АВТОРИЗАЦИИ
// ========================

/**
 * Настраивает обработчики формы входа
 */
function setupAuthForms() {
    const authTitle = document.getElementById('authTitle');
    const authFio = document.getElementById('authFio');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authToggle = document.getElementById('authToggle');
    const authError = document.getElementById('authError');
    const authSuccess = document.getElementById('authSuccess');
    const resetDataBtn = document.getElementById('resetDataBtn');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    
    if (authToggle) authToggle.style.display = 'none';
    if (authFio) authFio.style.display = 'none';
    if (authTitle) authTitle.textContent = '🔐 Вход в систему';
    if (authSubmitBtn) authSubmitBtn.textContent = 'Войти';
    
    if (resetDataBtn) resetDataBtn.onclick = resetAllData;
    
    if (authSubmitBtn) {
        authSubmitBtn.onclick = () => {
            const email = authEmail.value.trim();
            const password = authPassword.value;
            
            if (authError) authError.textContent = '';
            if (authSuccess) authSuccess.textContent = '';
            
            if (!email || !password) {
                if (authError) authError.textContent = 'Заполните все поля';
                return;
            }
            
            if (!usersLoaded || authUsers.length === 0) {
                if (authError) authError.textContent = 'База пользователей не загружена. Проверьте файл users.xlsx';
                return;
            }
            
            const result = login(email, password);
            
            if (result.success) {
                currentUser = result.user;
                
                localStorage.setItem('dashboard_current_user', JSON.stringify({ 
                    email: currentUser.email, 
                    fio: currentUser.fio, 
                    isAdmin: currentUser.isAdmin 
                }));
                
                document.getElementById('mainApp').style.display = 'block';
                document.getElementById('authContainer').style.display = 'none';
                document.getElementById('userInfo').innerHTML = `👤 ${currentUser.fio}`;
                
                const adminBtn = document.getElementById('adminBtn');
                if (adminBtn && currentUser.isAdmin) {
                    adminBtn.style.display = 'block';
                }
                
                initApp();
            } else {
                if (authError) authError.textContent = result.error;
            }
        };
    }
}

// ========================
// АДМИН-ПАНЕЛЬ
// ========================

/**
 * Показывает админ-панель (только для администратора)
 */
function showAdminPanel() {
    if (currentUser && currentUser.isAdmin) {
        const tbody = document.getElementById('adminTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            
            for (const user of authUsers) {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = user.fio;
                row.insertCell(1).textContent = user.email;
                row.insertCell(2).textContent = user.blocked ? '🔴 Заблокирован' : '🟢 Активен';
                
                const actionCell = row.insertCell(3);
                actionCell.textContent = '📝 Редактировать в Excel';
                actionCell.style.color = '#f59e0b';
                actionCell.style.cursor = 'pointer';
                actionCell.title = 'Управление пользователями осуществляется через файл users.xlsx';
            }
        }
        document.getElementById('adminPanel').classList.add('active');
    } else {
        alert('Доступ запрещен. Только для администратора.\n\nУправление пользователями - через файл users.xlsx');
    }
}

// ========================
// ЭКСПОРТ ФУНКЦИЙ В WINDOW
// ========================

window.currentUser = currentUser;
window.authUsers = authUsers;
window.usersLoaded = usersLoaded;
window.loadUsersFromFile = loadUsersFromFile;
window.login = login;
window.logout = logout;
window.resetAllData = resetAllData;
window.initAuth = initAuth;
window.showAdminPanel = showAdminPanel;

console.log('✅ auth.js: ПОЛНАЯ версия загружена');
