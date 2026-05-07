// ========================
// app.js - ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ (ПОЛНАЯ ВЕРСИЯ)
// ========================

// Глобальные переменные для навигации
let currentChannel = null;
let sidebarOpen = true;

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
            window.originalData = [];
            window.currentData = [];
            
            const cashSidebarBlock = document.getElementById('cashSidebarBlock');
            if (cashSidebarBlock) cashSidebarBlock.style.display = 'none';
            
            document.getElementById('dashboardMetrics').innerHTML = '<div class="loading">Нет данных</div>';
            
            showNotification('Данные очищены. Загрузите новый файл.', 'info');
        };
    }
    
    // ========================
    // 2. НАСТРОЙКА ФИЛЬТРОВ
    // ========================
    const companyFilter = document.getElementById('companyFilter');
    const yearFilter = document.getElementById('yearFilter');
    const monthFilter = document.getElementById('monthFilter');
    const channelFilter = document.getElementById('channelFilter');
    
    const debouncedApply = () => {
        if (companyFilter) currentFilters.company = companyFilter.value;
        if (yearFilter) currentFilters.year = yearFilter.value;
        if (monthFilter) {
            currentFilters.month = Array.from(monthFilter.selectedOptions).map(o => o.value);
            console.log('Выбранные месяцы:', currentFilters.month);
        }
        if (channelFilter) currentFilters.channel = channelFilter.value;
        
        currentData = applyFilters(originalData, currentFilters);
        window.currentData = currentData;
        renderDashboard();
        renderCashBlock();
        
        if (typeof updateDashboardAIAnalytics === 'function') updateDashboardAIAnalytics();
        
        setTimeout(() => {
            if (typeof renderTabChart === 'function') {
                renderTabChart(0);
            }
        }, 150);
    };
    
    if (companyFilter) companyFilter.onchange = debouncedApply;
    if (yearFilter) yearFilter.onchange = debouncedApply;
    if (monthFilter) monthFilter.onchange = debouncedApply;
    if (channelFilter) channelFilter.onchange = debouncedApply;
    
    // ========================
    // 3. НАСТРОЙКА ТЕМЫ (СВЕТЛАЯ/ТЕМНАЯ)
    // ========================
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // В функции initApp или при загрузке
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.remove('light');
    document.body.classList.add('dark');
} else {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
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
            
            refreshChartsOnThemeChange();
            if (typeof refreshArticlesBlock === 'function') refreshArticlesBlock();
        };
    }
    
    // ========================
    // 4. НАСТРОЙКА НАВИГАЦИИ
    // ========================
    setupNavigation();
    
    // ========================
    // 5. НАСТРОЙКА ОДДС
    // ========================
    if (typeof initOddsDates === 'function') initOddsDates();
    if (typeof initOddsFilters === 'function') initOddsFilters();
    
    // ========================
    // 6. НАСТРОЙКА AI АССИСТЕНТА
    // ========================
    if (typeof initAIAssistant === 'function') initAIAssistant();
    
    // ========================
    // 7. НАСТРОЙКА БЛОКА СТАТЕЙ
    // ========================
    if (typeof initArticlesBlock === 'function') initArticlesBlock();
    
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
    
    // ========================
    // 10. ОБРАБОТЧИК КНОПКИ СБРОСА ФИЛЬТРОВ (если есть)
    // ========================
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) {
        resetFiltersBtn.onclick = () => {
            if (companyFilter) companyFilter.value = '';
            if (yearFilter) yearFilter.value = '';
            if (monthFilter) Array.from(monthFilter.options).forEach(o => o.selected = false);
            if (channelFilter) channelFilter.value = '';
            debouncedApply();
            showNotification('Фильтры сброшены', 'info');
        };
    }
    
    // ========================
    // 11. ОБРАБОТЧИК КНОПКИ ПОКАЗА ВСЕХ СЧЕТОВ
    // ========================
    const toggleAccountsBtn = document.getElementById('toggleAccountsBtn');
    if (toggleAccountsBtn && typeof toggleAccountsVisibility === 'function') {
        toggleAccountsBtn.onclick = toggleAccountsVisibility;
    }
    
    console.log('Приложение инициализировано');
}

// ========================
// НАСТРОЙКА НАВИГАЦИИ (ПОЛНАЯ ВЕРСИЯ)
// ========================

function setupNavigation() {
    const dashboardMenu = document.getElementById('dashboardMenu');
    const channelsSubmenu = document.getElementById('channelsSubmenu');
    const arrow = dashboardMenu?.querySelector('.arrow');
    
    // ДАШБОРД (главная страница) - УПРОЩЁННАЯ ВЕРСИЯ
if (dashboardMenu) {
    dashboardMenu.onclick = (e) => {
        e.stopPropagation();
        currentChannel = null;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
        dashboardMenu.classList.add('active');
        document.querySelectorAll('.page-content').forEach(c => c.classList.remove('active'));
        document.getElementById('page-dashboard').classList.add('active');
        
        const floatingBtn = document.getElementById('floatingFilterBtn');
        if (floatingBtn) floatingBtn.style.display = 'flex';
        
        renderDashboard();
    };
}
    
    // Страница ОДДС
    const oddsNavItem = document.querySelector('.nav-item[data-page="odds"]');
    if (oddsNavItem) {
        oddsNavItem.onclick = () => {
            if (typeof clearOddsCache === 'function') clearOddsCache();
            currentChannel = null;
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
            oddsNavItem.classList.add('active');
            
            if (channelsSubmenu) channelsSubmenu.classList.remove('show');
            if (arrow) arrow.classList.remove('open');
            
            document.querySelectorAll('.page-content').forEach(c => c.classList.remove('active'));
            document.getElementById('page-odds').classList.add('active');
            
            const floatingBtn = document.getElementById('floatingFilterBtn');
            if (floatingBtn) floatingBtn.style.display = 'none';
            
            if (typeof initOddsDates === 'function') initOddsDates();
            if (typeof renderOddsPage === 'function') renderOddsPage();
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
            
            if (window.abcxyzData && typeof renderABCXYZ === 'function') {
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
            
            if (typeof clearAIChat === 'function') clearAIChat();
        };
    }
    
    // Обработчик для сворачивания сайдбара на мобильных устройствах
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.onclick = () => {
            const sidebar = document.querySelector('.sidebar-nav');
            if (sidebar) {
                if (sidebar.classList.contains('collapsed')) {
                    sidebar.classList.remove('collapsed');
                    sidebarToggleBtn.textContent = '◀';
                } else {
                    sidebar.classList.add('collapsed');
                    sidebarToggleBtn.textContent = '▶';
                }
            }
        };
    }
}

// ========================
// НАСТРОЙКА ПЛАВАЮЩЕЙ КНОПКИ ФИЛЬТРОВ (ПОЛНАЯ ВЕРСИЯ)
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
    
    floatingBtn.onclick = () => {
        filterModal.classList.add('active');
        
        const realCompanyFilter = document.getElementById('companyFilter');
        const realYearFilter = document.getElementById('yearFilter');
        const realMonthFilter = document.getElementById('monthFilter');
        const realChannelFilter = document.getElementById('channelFilter');
        
        if (modalCompanyFilter && realCompanyFilter) modalCompanyFilter.value = realCompanyFilter.value;
        if (modalYearFilter && realYearFilter) modalYearFilter.value = realYearFilter.value;
        if (modalMonthFilter && realMonthFilter) {
            Array.from(modalMonthFilter.options).forEach(opt => {
                opt.selected = Array.from(realMonthFilter.selectedOptions).some(o => o.value === opt.value);
            });
        }
        if (modalChannelFilter && realChannelFilter) modalChannelFilter.value = realChannelFilter.value;
    };
    
    if (modalCloseBtn) modalCloseBtn.onclick = () => filterModal.classList.remove('active');
    
    filterModal.onclick = (e) => {
        if (e.target === filterModal) filterModal.classList.remove('active');
    };
    
    if (modalApplyBtn) {
        modalApplyBtn.onclick = () => {
            const realCompanyFilter = document.getElementById('companyFilter');
            const realYearFilter = document.getElementById('yearFilter');
            const realMonthFilter = document.getElementById('monthFilter');
            const realChannelFilter = document.getElementById('channelFilter');
            
            if (realCompanyFilter) realCompanyFilter.value = modalCompanyFilter.value;
            if (realYearFilter) realYearFilter.value = modalYearFilter.value;
            
            if (realMonthFilter) {
                Array.from(realMonthFilter.options).forEach(opt => opt.selected = false);
                Array.from(modalMonthFilter.selectedOptions).forEach(selectedOpt => {
                    const optToSelect = Array.from(realMonthFilter.options).find(o => o.value === selectedOpt.value);
                    if (optToSelect) optToSelect.selected = true;
                });
            }
            
            if (realChannelFilter) realChannelFilter.value = modalChannelFilter.value;
            
            if (realCompanyFilter) currentFilters.company = realCompanyFilter.value;
            if (realYearFilter) currentFilters.year = realYearFilter.value;
            if (realMonthFilter) currentFilters.month = Array.from(realMonthFilter.selectedOptions).map(o => o.value);
            if (realChannelFilter) currentFilters.channel = realChannelFilter.value;
            
            currentData = applyFilters(originalData, currentFilters);
            window.currentData = currentData;
            renderDashboard();
            renderCashBlock();
            if (typeof updateDashboardAIAnalytics === 'function') updateDashboardAIAnalytics();
            
            setTimeout(() => {
                if (typeof renderTabChart === 'function') renderTabChart(0);
            }, 150);
            
            if (realCompanyFilter) realCompanyFilter.dispatchEvent(new Event('change'));
            if (realYearFilter) realYearFilter.dispatchEvent(new Event('change'));
            if (realMonthFilter) realMonthFilter.dispatchEvent(new Event('change'));
            if (realChannelFilter) realChannelFilter.dispatchEvent(new Event('change'));
            
            filterModal.classList.remove('active');
            console.log('Применены фильтры:', currentFilters);
        };
    }
    
    if (modalResetBtn) {
        modalResetBtn.onclick = () => {
            if (modalCompanyFilter) modalCompanyFilter.value = '';
            if (modalYearFilter) modalYearFilter.value = '';
            if (modalMonthFilter) Array.from(modalMonthFilter.options).forEach(o => o.selected = false);
            if (modalChannelFilter) modalChannelFilter.value = '';
            modalApplyBtn.click();
        };
    }
}

// ========================
// ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Обновляет AI аналитику на дашборде
 */
function updateDashboardAIAnalytics() {
    const f = calculateFinancials(currentData);
    
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
    
    let sales = currentData.filter(d => {
        const article = d.статья?.toLowerCase() || '';
        return (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
    }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    
    const avgCheck = sales > 0 ? f.netRevenue / sales : 0;
    const avgCost = 0;
    
    if (typeof updateDashboardAIInsights === 'function') {
        updateDashboardAIInsights(f, revenueChannelsList, expenseChannelsList, sales, avgCheck, avgCost);
    }
}

/**
 * Обновляет графики при смене темы
 */
function refreshChartsOnThemeChange() {
    if (window.revenueChart && typeof window.revenueChart.update === 'function') {
        window.revenueChart.update();
    }
    if (window.salesChart && typeof window.salesChart.update === 'function') {
        window.salesChart.update();
    }
    if (window.ndsToRevenueChart && typeof window.ndsToRevenueChart.update === 'function') {
        window.ndsToRevenueChart.update();
    }
    if (window.balanceTrendChart && typeof window.balanceTrendChart.update === 'function') {
        window.balanceTrendChart.update();
    }
    if (window.cccChart && typeof window.cccChart.update === 'function') {
        window.cccChart.update();
    }
    if (window.seasonalityChart && typeof window.seasonalityChart.update === 'function') {
        window.seasonalityChart.update();
    }
}

// ========================
// ПЕРЕРИСОВКА ГРАФИКОВ ПРИ РАСШИРЕНИИ/СВОРАЧИВАНИИ ПАНЕЛИ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ========================

function initChartResizeHandler() {
    const sidebar = document.querySelector('.sidebar-nav');
    if (!sidebar) return;
    
    let resizeTimeout;
    let isResizing = false;
    
    /**
     * Полностью пересоздаёт мини-графики в блоках
     */
    function forceChartResize() {
        if (isResizing) return;
        isResizing = true;
        
        // Получаем текущие данные для перерисовки
        const monthsOrder = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
        const monthlyDataMap = new Map();
        monthsOrder.forEach(month => monthlyDataMap.set(month, { revenue: 0, profit: 0, expenses: 0 }));
        
        if (window.currentData) {
            window.currentData.forEach(d => {
                if (d.месяц && monthsOrder.includes(d.месяц)) {
                    const monthData = monthlyDataMap.get(d.месяц);
                    if (d.тип === 'Доход') monthData.revenue += d.сумма;
                    if (d.тип === 'Расход') monthData.expenses += Math.abs(d.сумма);
                }
            });
            
            monthlyDataMap.forEach((data, month) => {
                const ndsOut = window.currentData.filter(d => d.месяц === month && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
                const netRev = data.revenue - ndsOut;
                data.profit = netRev - data.expenses;
                data.netRevenue = netRev;
            });
        }
        
        const monthlyLabels = monthsOrder.filter(m => monthlyDataMap.get(m).revenue > 0 || monthlyDataMap.get(m).profit !== 0);
        const monthlyRevenues = monthlyLabels.map(m => monthlyDataMap.get(m).revenue / 1000);
        const monthlyExpensesArray = monthlyLabels.map(m => (monthlyDataMap.get(m)?.expenses || 0) / 1000);
        
        // Получаем элементы canvas
        const revenueCanvas = document.getElementById('revenueMiniChartNew');
        const expenseCanvas = document.getElementById('expenseMiniChartNew');
        
        // Уничтожаем старые графики
        if (window.miniRevenueChart) {
            try {
                if (typeof window.miniRevenueChart.destroy === 'function') {
                    window.miniRevenueChart.destroy();
                }
            } catch(e) {}
            window.miniRevenueChart = null;
        }
        
        if (window.miniExpenseChart) {
            try {
                if (typeof window.miniExpenseChart.destroy === 'function') {
                    window.miniExpenseChart.destroy();
                }
            } catch(e) {}
            window.miniExpenseChart = null;
        }
        
        // Пересоздаём графики, если есть данные
        if (revenueCanvas && monthlyLabels.length > 0 && monthlyRevenues.length > 0) {
            const ctx = revenueCanvas.getContext('2d');
            const isDarkMode = document.body.classList.contains('dark');
            const areaColor = isDarkMode ? 'rgba(72,187,120,0.08)' : 'rgba(72,187,120,0.05)';
            const lineColor = monthlyRevenues[monthlyRevenues.length-1] >= monthlyRevenues[0] ? '#48bb78' : '#f56565';
            
            window.miniRevenueChart = new Chart(ctx, {
                type: 'line',
                data: { 
                    labels: monthlyLabels, 
                    datasets: [{ 
                        data: monthlyRevenues, 
                        borderColor: lineColor, 
                        backgroundColor: areaColor, 
                        borderWidth: 2, 
                        pointRadius: 0, 
                        pointHoverRadius: 5, 
                        tension: 0.4, 
                        fill: true,
                        cubicInterpolationMode: 'monotone'
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: true, 
                    plugins: { legend: { display: false }, tooltip: { enabled: false } }, 
                    scales: { x: { display: false }, y: { display: false } },
                    layout: { padding: { top: 5, bottom: 5, left: 5, right: 5 } }
                }
            });
        }
        
        if (expenseCanvas && monthlyLabels.length > 0 && monthlyExpensesArray.length > 0) {
            const ctx = expenseCanvas.getContext('2d');
            const isDarkMode = document.body.classList.contains('dark');
            const areaColor = isDarkMode ? 'rgba(245,101,101,0.08)' : 'rgba(245,101,101,0.05)';
            
            window.miniExpenseChart = new Chart(ctx, {
                type: 'line',
                data: { 
                    labels: monthlyLabels, 
                    datasets: [{ 
                        data: monthlyExpensesArray, 
                        borderColor: '#f56565', 
                        backgroundColor: areaColor, 
                        borderWidth: 2, 
                        pointRadius: 0, 
                        pointHoverRadius: 5, 
                        tension: 0.4, 
                        fill: true,
                        cubicInterpolationMode: 'monotone'
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: true, 
                    plugins: { legend: { display: false }, tooltip: { enabled: false } }, 
                    scales: { x: { display: false }, y: { display: false } },
                    layout: { padding: { top: 5, bottom: 5, left: 5, right: 5 } }
                }
            });
        }
        
        isResizing = false;
    }
    
    // Слушаем окончание анимации панели
    sidebar.addEventListener('transitionend', (e) => {
        if (e.propertyName === 'width' || e.propertyName === 'max-width') {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(forceChartResize, 50);
        }
    });
    
    // Слушаем изменение размера окна
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(forceChartResize, 150);
    });
    
    // Наблюдатель за изменением класса на body (смена темы)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                forceChartResize();
            }
        });
    });
    observer.observe(document.body, { attributes: true });
    
    // Первый запуск
    setTimeout(forceChartResize, 500);
}

/**
 * Обработчик для ABC/XYZ загрузки файла
 */
function setupABCXYZUpload() {
    const abcxyzFileInput = document.getElementById('abcxyzFileInput');
    const abcxyzUploadArea = document.getElementById('abcxyzUploadArea');
    
    if (abcxyzFileInput && abcxyzUploadArea) {
        abcxyzFileInput.onchange = async (e) => {
            if (e.target.files[0]) {
                try {
                    showNotification('🔄 Обработка файла...', 'info');
                    const salesData = await parseABCXYZExcel(e.target.files[0]);
                    const { products, totalAmount, totalQuantity } = calculateABCXYZ(salesData);
                    window.abcxyzData = { products, totalAmount, totalQuantity };
                    renderABCXYZ(products, totalAmount, totalQuantity);
                    showNotification(`✅ Загружено ${products.length} товаров, ${salesData.length} продаж`, 'success');
                    if (abcxyzUploadArea) abcxyzUploadArea.style.display = 'none';
                } catch (error) {
                    showNotification('❌ Ошибка: ' + error.message, 'error');
                }
            }
        };
        
        abcxyzUploadArea.onclick = () => abcxyzFileInput.click();
    }
}

// ========================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ========================

// Ждем полной загрузки DOM перед инициализацией
document.addEventListener('DOMContentLoaded', () => {
    // Настройка ABC/XYZ загрузки
    setupABCXYZUpload();
    
    // Стартуем авторизацию
    initAuth();
});

console.log('✅ app.js: ПОЛНАЯ версия загружена');
