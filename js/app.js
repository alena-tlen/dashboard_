// ========================
// app.js - ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ
// ========================

/**
 * Основная функция инициализации приложения
 * Вызывается после успешной авторизации
 */
function initApp() {
    // Проверяем, загружена ли библиотека Plotly
    if (typeof Plotly === 'undefined') {
        setTimeout(initApp, 200);
        return;
    }
    
    // ========================
    // 1. НАСТРОЙКА ЗАГРУЗКИ ФАЙЛА
    // ========================
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const changeDataBtn = document.getElementById('changeDataBtn');
    
    if (fileInput) {
        fileInput.onchange = (e) => { 
            if (e.target.files[0]) loadFile(e.target.files[0]); 
        };
    }
    
    if (uploadArea) {
        uploadArea.onclick = () => fileInput?.click();
    }
    
    if (changeDataBtn) {
        changeDataBtn.onclick = () => {
            uploadArea.style.display = 'block';
            originalData = [];
            currentData = [];
            
            // Скрываем блок денежных средств
            const cashSidebarBlock = document.getElementById('cashSidebarBlock');
            if (cashSidebarBlock) cashSidebarBlock.style.display = 'none';
            
            // Очищаем дашборд
            document.getElementById('dashboardMetrics').innerHTML = '<div class="loading">Нет данных</div>';
        };
    }
    
    // ========================
// 2. НАСТРОЙКА ФИЛЬТРОВ
// ========================
const companyFilter = document.getElementById('companyFilter');
const yearFilter = document.getElementById('yearFilter');
const monthFilter = document.getElementById('monthFilter');
const channelFilter = document.getElementById('channelFilter');  // ДОБАВИТЬ

const debouncedApply = () => {
    if (companyFilter) currentFilters.company = companyFilter.value;
    if (yearFilter) currentFilters.year = yearFilter.value;
    if (monthFilter) {
        // ВАЖНО: собираем ВСЕ выбранные месяцы
        currentFilters.month = Array.from(monthFilter.selectedOptions).map(o => o.value);
        console.log('Выбранные месяцы:', currentFilters.month);
    }
    if (channelFilter) currentFilters.channel = channelFilter.value;
    
    currentData = applyFilters(originalData, currentFilters);
    renderDashboard();
    renderCashBlock();
    if (typeof updateDashboardAIAnalytics === 'function') updateDashboardAIAnalytics();
};

if (companyFilter) companyFilter.onchange = debouncedApply;
if (yearFilter) yearFilter.onchange = debouncedApply;
if (monthFilter) monthFilter.onchange = debouncedApply;
if (channelFilter) channelFilter.onchange = debouncedApply;  // ДОБАВИТЬ
    
    // ========================
    // 3. НАСТРОЙКА ТЕМЫ (СВЕТЛАЯ/ТЕМНАЯ)
    // ========================
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.remove('light');
        body.classList.add('dark');
        if (themeToggle) themeToggle.classList.add('active');
    } else {
        body.classList.add('light');
    }
    
    if (themeToggle) {
        themeToggle.onclick = () => {
            if (body.classList.contains('dark')) {
                body.classList.remove('dark');
                body.classList.add('light');
                themeToggle.classList.remove('active');
                localStorage.setItem('theme', 'light');
            } else {
                body.classList.remove('light');
                body.classList.add('dark');
                themeToggle.classList.add('active');
                localStorage.setItem('theme', 'dark');
            }
            
            // Перерисовываем графики при смене темы
            refreshChartsOnThemeChange();
        };
    }
    
    // ========================
    // 4. НАСТРОЙКА НАВИГАЦИИ
    // ========================
    setupNavigation();
    
    // ========================
    // 5. НАСТРОЙКА ОДДС
    // ========================
    initOddsDates();
    initOddsFilters();
    
    // ========================
    // 6. НАСТРОЙКА AI АССИСТЕНТА
    // ========================
    initAIAssistant();
    
    // ========================
    // 7. НАСТРОЙКА БЛОКА СТАТЕЙ
    // ========================
    initArticlesBlock();
    
    // ========================
    // 8. НАСТРОЙКА АДМИН-ПАНЕЛИ
    // ========================
    const adminBtn = document.getElementById('adminBtn');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (adminBtn) adminBtn.addEventListener('click', showAdminPanel);
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', () => {
            document.getElementById('adminPanel')?.classList.remove('active');
        });
    }
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // ========================
    // 9. НАСТРОЙКА ПЛАВАЮЩЕЙ КНОПКИ ФИЛЬТРОВ
    // ========================
    setupFloatingFilterButton();
    
    console.log('Приложение инициализировано');
}

// ========================
// НАСТРОЙКА НАВИГАЦИИ
// ========================

function setupNavigation() {
    const dashboardMenu = document.getElementById('dashboardMenu');
    const channelsSubmenu = document.getElementById('channelsSubmenu');
    const arrow = dashboardMenu?.querySelector('.arrow');
    
    // Дашборд (главная страница)
    if (dashboardMenu) {
        dashboardMenu.onclick = (e) => {
            e.stopPropagation();
            channelsSubmenu.classList.toggle('show');
            if (arrow) arrow.classList.toggle('open');
            
            if (!channelsSubmenu.classList.contains('show')) {
                currentChannel = null;
                document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
                document.querySelectorAll('.page-content').forEach(c => c.classList.remove('active'));
                document.getElementById('page-dashboard').classList.add('active');
                
                // Показываем плавающую кнопку фильтров
                const floatingBtn = document.getElementById('floatingFilterBtn');
                if (floatingBtn) floatingBtn.style.display = 'flex';
                
                renderDashboard();
            }
        };
    }
    
    // Подменю каналов
    document.querySelectorAll('.nav-subitem').forEach(item => {
        item.onclick = () => {
            const channel = item.dataset.channel;
            currentChannel = channel;
            
            document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.page-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`page-channel-${channel}`).classList.add('active');
            
            // Скрываем плавающую кнопку фильтров на странице канала
            const floatingBtn = document.getElementById('floatingFilterBtn');
            if (floatingBtn) floatingBtn.style.display = 'none';
            
            renderChannelPage(channel);
        };
    });
    
    // Страница ОДДС
    const oddsNavItem = document.querySelector('.nav-item[data-page="odds"]');
    if (oddsNavItem) {
        oddsNavItem.onclick = () => {
            clearOddsCache();
            currentChannel = null;
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
            oddsNavItem.classList.add('active');
            
            if (channelsSubmenu) channelsSubmenu.classList.remove('show');
            if (arrow) arrow.classList.remove('open');
            
            document.querySelectorAll('.page-content').forEach(c => c.classList.remove('active'));
            document.getElementById('page-odds').classList.add('active');
            
            // Скрываем плавающую кнопку фильтров
            const floatingBtn = document.getElementById('floatingFilterBtn');
            if (floatingBtn) floatingBtn.style.display = 'none';
            
            initOddsDates();
            renderOddsPage();
        };
    }
    
    // Страница ABC/XYZ
    const abcxyzNavItem = document.querySelector('.nav-item[data-page="abcxyz"]');
    if (abcxyzNavItem) {
        abcxyzNavItem.onclick = () => {
            currentChannel = null;
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
            abcxyzNavItem.classList.add('active');
            
            if (channelsSubmenu) channelsSubmenu.classList.remove('show');
            if (arrow) arrow.classList.remove('open');
            
            document.querySelectorAll('.page-content').forEach(c => c.classList.remove('active'));
            document.getElementById('page-abcxyz').classList.add('active');
            
            if (window.abcxyzData) {
                renderABCXYZ(window.abcxyzData.products, window.abcxyzData.totalAmount, window.abcxyzData.totalQuantity);
            }
        };
    }
    
    // Страница AI
    const aiNavItem = document.querySelector('.nav-item[data-page="ai"]');
    if (aiNavItem) {
        aiNavItem.onclick = () => {
            currentChannel = null;
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
            aiNavItem.classList.add('active');
            
            if (channelsSubmenu) channelsSubmenu.classList.remove('show');
            if (arrow) arrow.classList.remove('open');
            
            document.querySelectorAll('.page-content').forEach(c => c.classList.remove('active'));
            document.getElementById('page-ai').classList.add('active');
            
            clearAIChat();
        };
    }
}

// ========================
// НАСТРОЙКА ПЛАВАЮЩЕЙ КНОПКИ ФИЛЬТРОВ
// ========================

function setupFloatingFilterButton() {
    const floatingBtn = document.getElementById('floatingFilterBtn');
    const filterModal = document.getElementById('filterModal');
    const modalCloseBtn = document.getElementById('filterModalCloseBtn');
    const modalApplyBtn = document.getElementById('modalApplyFiltersBtn');
    const modalResetBtn = document.getElementById('modalResetFiltersBtn');
    
    const modalCompanyFilter = document.getElementById('modalCompanyFilter');
    const modalYearFilter = document.getElementById('modalYearFilter');
    const modalMonthFilter = document.getElementById('modalMonthFilter');
    const modalChannelFilter = document.getElementById('modalChannelFilter');
    
    if (!floatingBtn || !filterModal) return;
    
    // Открытие модального окна
    floatingBtn.onclick = () => {
        filterModal.classList.add('active');
        
        const realCompanyFilter = document.getElementById('companyFilter');
        const realYearFilter = document.getElementById('yearFilter');
        const realMonthFilter = document.getElementById('monthFilter');
        const realChannelFilter = document.getElementById('channelFilter');
        
        if (modalCompanyFilter && realCompanyFilter) {
            modalCompanyFilter.value = realCompanyFilter.value;
        }
        if (modalYearFilter && realYearFilter) {
            modalYearFilter.value = realYearFilter.value;
        }
        if (modalMonthFilter && realMonthFilter) {
            // Копируем выбранные месяцы
            Array.from(modalMonthFilter.options).forEach(opt => {
                opt.selected = Array.from(realMonthFilter.selectedOptions).some(o => o.value === opt.value);
            });
        }
        if (modalChannelFilter && realChannelFilter) {
            modalChannelFilter.value = realChannelFilter.value;
        }
    };
    
    // Закрытие модального окна
    if (modalCloseBtn) {
        modalCloseBtn.onclick = () => filterModal.classList.remove('active');
    }
    
    filterModal.onclick = (e) => {
        if (e.target === filterModal) filterModal.classList.remove('active');
    };
    
    // ========== ПРИМЕНЕНИЕ ФИЛЬТРОВ (ИСПРАВЛЕНО) ==========
    if (modalApplyBtn) {
        modalApplyBtn.onclick = () => {
            const realCompanyFilter = document.getElementById('companyFilter');
            const realYearFilter = document.getElementById('yearFilter');
            const realMonthFilter = document.getElementById('monthFilter');
            const realChannelFilter = document.getElementById('channelFilter');
            
            // Применяем компанию
            if (realCompanyFilter) realCompanyFilter.value = modalCompanyFilter.value;
            
            // Применяем год
            if (realYearFilter) realYearFilter.value = modalYearFilter.value;
            
            // ========== ВАЖНО: Применяем МЕСЯЦЫ ==========
            if (realMonthFilter) {
                // Очищаем все выбранные опции
                Array.from(realMonthFilter.options).forEach(opt => {
                    opt.selected = false;
                });
                // Выбираем те, что отмечены в модальном окне
                Array.from(modalMonthFilter.selectedOptions).forEach(selectedOpt => {
                    const optToSelect = Array.from(realMonthFilter.options).find(o => o.value === selectedOpt.value);
                    if (optToSelect) optToSelect.selected = true;
                });
            }
            
            // Применяем канал
            if (realChannelFilter) realChannelFilter.value = modalChannelFilter.value;
            
            // ========== ПРИНУДИТЕЛЬНО ВЫЗЫВАЕМ ОБНОВЛЕНИЕ ==========
            // Собираем все фильтры
            if (realCompanyFilter) currentFilters.company = realCompanyFilter.value;
            if (realYearFilter) currentFilters.year = realYearFilter.value;
            if (realMonthFilter) {
                currentFilters.month = Array.from(realMonthFilter.selectedOptions).map(o => o.value);
            }
            if (realChannelFilter) currentFilters.channel = realChannelFilter.value;
            
            // Применяем фильтры и обновляем дашборд
            currentData = applyFilters(originalData, currentFilters);
            renderDashboard();
            renderCashBlock();
            if (typeof updateDashboardAIAnalytics === 'function') updateDashboardAIAnalytics();
            
            // Также вызываем события change для синхронизации
            if (realCompanyFilter) realCompanyFilter.dispatchEvent(new Event('change'));
            if (realYearFilter) realYearFilter.dispatchEvent(new Event('change'));
            if (realMonthFilter) realMonthFilter.dispatchEvent(new Event('change'));
            if (realChannelFilter) realChannelFilter.dispatchEvent(new Event('change'));
            
            filterModal.classList.remove('active');
            
            console.log('Применены фильтры:', currentFilters);
        };
    }
    
    // Сброс фильтров
    if (modalResetBtn) {
        modalResetBtn.onclick = () => {
            if (modalCompanyFilter) modalCompanyFilter.value = '';
            if (modalYearFilter) modalYearFilter.value = '';
            if (modalMonthFilter) {
                Array.from(modalMonthFilter.options).forEach(o => o.selected = false);
            }
            if (modalChannelFilter) modalChannelFilter.value = '';
            
            // Вызываем применение
            modalApplyBtn.click();
        };
    }
}

// ========================
// ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ
// ========================

/**
 * Обновляет AI аналитику на дашборде
 */
function updateDashboardAIAnalytics() {
    const f = calculateFinancials(currentData);
    
    // Собираем данные по каналам
    const revenueByChannel = {};
    const expensesByChannel = {};
    
    currentData.forEach(d => {
        if (d.тип === 'Доход' && d.канал) {
            revenueByChannel[d.канал] = (revenueByChannel[d.канал] || 0) + d.сумма;
        }
        if (d.тип === 'Расход' && d.канал) {
            expensesByChannel[d.канал] = (expensesByChannel[d.канал] || 0) + Math.abs(d.сумма);
        }
    });
    
    const revenueChannelsList = Object.entries(revenueByChannel).map(([name, total]) => ({ name, total }));
    const expenseChannelsList = Object.entries(expensesByChannel).map(([name, total]) => ({ name, total }));
    
    // Продажи
    let sales = currentData.filter(d => {
        const article = d.статья?.toLowerCase() || '';
        return (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
    }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    
    const avgCheck = sales > 0 ? f.netRevenue / sales : 0;
    const avgCost = 0; // Можно рассчитать при необходимости
    
    updateDashboardAIInsights(f, revenueChannelsList, expenseChannelsList, sales, avgCheck, avgCost);
}

/**
 * Обновляет графики при смене темы
 */
function refreshChartsOnThemeChange() {
    // Перерисовываем основные графики
    if (window.revenueChart) {
        window.revenueChart.update();
    }
    if (window.salesChart) {
        window.salesChart.update();
    }
}

// ========================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ========================

// Ждем полной загрузки DOM перед инициализацией
document.addEventListener('DOMContentLoaded', () => {
    // Стартуем авторизацию
    initAuth();
});
