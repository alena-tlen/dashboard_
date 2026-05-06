// ========================
// utils.js - ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ПОЛНАЯ ВЕРСИЯ)
// ========================

// ========================
// ФОРМАТИРОВАНИЕ ВАЛЮТЫ
// ========================

/**
 * Форматирует число в валюту (рубли)
 * @param {number} value - сумма для форматирования
 * @returns {string} отформатированная строка (например: "1 234 567 ₽")
 */
function formatCurrency(value) { 
    if (value === undefined || value === null || isNaN(value)) return '0 ₽';
    return new Intl.NumberFormat('ru-RU', { 
        style: 'currency', 
        currency: 'RUB', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(value)); 
}

/**
 * Форматирует сумму с указанием валюты
 * @param {number} amount - сумма
 * @param {string} currency - код валюты (RUB, USD, EUR, CNY)
 * @returns {string} отформатированная строка с символом валюты
 */
function formatCurrencyWithCurrency(amount, currency = 'RUB') {
    if (amount === undefined || amount === null || isNaN(amount)) return '0';
    const symbols = { RUB: '₽', USD: '$', EUR: '€', CNY: '¥' };
    const symbol = symbols[currency] || currency;
    const formatter = new Intl.NumberFormat('ru-RU', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
    });
    return `${formatter.format(Math.abs(amount))} ${symbol}`;
}

// ========================
// СКЛОНЕНИЕ СУЩЕСТВИТЕЛЬНЫХ
// ========================

/**
 * Склоняет существительное в зависимости от числа
 * @param {number} number - число
 * @param {string} one - форма для 1 (например, "счет")
 * @param {string} two - форма для 2-4 (например, "счета")
 * @param {string} five - форма для 5-20 (например, "счетов")
 * @returns {string} правильная форма слова
 */
function declension(number, one, two, five) {
    const n = Math.abs(number) % 100;
    if (n >= 11 && n <= 19) return five;
    const lastDigit = n % 10;
    if (lastDigit === 1) return one;
    if (lastDigit >= 2 && lastDigit <= 4) return two;
    return five;
}

// ========================
// УВЕДОМЛЕНИЯ
// ========================

/**
 * Показывает временное уведомление в правом верхнем углу
 * @param {string} message - текст уведомления
 * @param {string} type - тип: 'success', 'error', 'info'
 */
function showNotification(message, type = 'success') {
    const oldNotification = document.getElementById('temporaryNotification');
    if (oldNotification) oldNotification.remove();
    
    const notification = document.createElement('div');
    notification.id = 'temporaryNotification';
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10000;
        padding: 14px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease-out;
        backdrop-filter: blur(10px);
        cursor: pointer;
    `;
    
    const styles = {
        success: { background: 'linear-gradient(135deg, #48bb78, #38a169)', icon: '✅' },
        error: { background: 'linear-gradient(135deg, #f56565, #e53e3e)', icon: '❌' },
        info: { background: 'linear-gradient(135deg, #667eea, #764ba2)', icon: 'ℹ️' }
    };
    
    const style = styles[type] || styles.success;
    notification.style.background = style.background;
    notification.style.color = 'white';
    notification.innerHTML = `
        <span style="font-size: 20px;">${style.icon}</span>
        <span>${message}</span>
        <span style="margin-left: 8px; opacity: 0.7; font-size: 12px;">×</span>
    `;
    
    document.body.appendChild(notification);
    
    notification.onclick = () => {
        notification.style.animation = 'fadeOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    };
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.animation = 'fadeOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// ========================
// АНИМАЦИЯ ЧИСЕЛ
// ========================

/**
 * Плавная анимация изменения числа на странице
 * @param {HTMLElement} element - DOM элемент
 * @param {number} start - начальное значение
 * @param {number} end - конечное значение
 * @param {number} duration - длительность анимации (мс)
 * @param {boolean} isCurrency - форматировать как валюту
 * @param {boolean} isPercent - форматировать как процент
 * @returns {Promise} промис, который завершается по окончании анимации
 */
function animateNumber(element, start, end, duration = 600, isCurrency = true, isPercent = false) {
    if (!element) return Promise.resolve();
    
    if (element._animationFrame) {
        cancelAnimationFrame(element._animationFrame);
    }
    
    return new Promise((resolve) => {
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = start + (end - start) * easeOutCubic;
            
            if (isPercent) {
                element.innerHTML = currentValue.toFixed(1);
            } else if (isCurrency) {
                element.innerHTML = formatCurrency(currentValue);
            } else {
                element.innerHTML = currentValue.toFixed(2);
            }
            
            if (progress < 1) {
                element._animationFrame = requestAnimationFrame(update);
            } else {
                if (isPercent) {
                    element.innerHTML = end.toFixed(1);
                } else if (isCurrency) {
                    element.innerHTML = formatCurrency(end);
                } else {
                    element.innerHTML = end.toFixed(2);
                }
                delete element._animationFrame;
                resolve();
            }
        }
        
        element._animationFrame = requestAnimationFrame(update);
    });
}

// ========================
// ОПРЕДЕЛЕНИЕ ВАЛЮТЫ ПО СЧЕТУ
// ========================

/**
 * Определяет валюту по названию банковского счета
 * @param {string} account - название счета
 * @returns {string} код валюты (RUB, USD, EUR, CNY)
 */
function detectCurrency(account) {
    if (!account) return 'RUB';
    const accUpper = account.toUpperCase();
    if (accUpper.includes('CNY')) return 'CNY';
    if (accUpper.includes('USD')) return 'USD';
    if (accUpper.includes('EUR')) return 'EUR';
    return 'RUB';
}

// ========================
// ФОРМАТИРОВАНИЕ ДАТ
// ========================

/**
 * Форматирует дату для input type="date"
 * @param {Date} date - объект даты
 * @returns {string} строка в формате YYYY-MM-DD
 */
function formatDateForInput(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Форматирует дату для отображения (день.месяц)
 * @param {Date} date - объект даты
 * @returns {string} строка в формате DD.MM
 */
function formatDateShort(date) {
    if (!date) return '';
    return `${date.getDate()}.${date.getMonth() + 1}`;
}

/**
 * Форматирует дату для отображения (день.месяц.год)
 * @param {Date} date - объект даты
 * @returns {string} строка в формате DD.MM.YYYY
 */
function formatDateFull(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

/**
 * Парсит дату из строки год/месяц/день
 * @param {Object} row - строка данных с полями год, месяц, число
 * @returns {Date|null} объект даты или null
 */
function parseDateFromRow(row) {
    const year = row.год;
    const month = row.месяц;
    let day = row.число || row.день || row.День || row.day || '1';
    
    if (!year || !month) return null;
    
    const monthIndex = MONTHS_ORDER.indexOf(month.toLowerCase());
    if (monthIndex === -1) return null;
    
    const date = new Date(Date.UTC(parseInt(year), monthIndex, parseInt(day)));
    return isNaN(date.getTime()) ? null : date;
}

// ========================
// РАБОТА С МЕСЯЦАМИ
// ========================

/**
 * Получает предыдущие месяцы относительно выбранных
 * @param {Array} months - массив выбранных месяцев
 * @param {number} count - сколько месяцев назад
 * @returns {Array} массив названий предыдущих месяцев
 */
function getPreviousMonths(months, count = 1) {
    const prevMonths = [];
    for (const month of months) {
        const monthIndex = MONTHS_ORDER.indexOf(month);
        if (monthIndex !== -1) {
            let prevIndex = monthIndex - count;
            while (prevIndex < 0) prevIndex += 12;
            prevMonths.push(MONTHS_ORDER[prevIndex % 12]);
        }
    }
    return prevMonths;
}

/**
 * Получает индекс месяца по названию
 * @param {string} monthName - название месяца
 * @returns {number} индекс от 0 до 11
 */
function getMonthIndex(monthName) {
    return MONTHS_ORDER.indexOf(monthName);
}

// ========================
// РАСЧЕТ ИЗМЕНЕНИЙ
// ========================

/**
 * Рассчитывает процент изменения между текущим и предыдущим значением
 * @param {number} current - текущее значение
 * @param {number} previous - предыдущее значение
 * @returns {Object|null} объект с процентами или null
 */
function getChangePercent(current, previous) {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return { 
        percent: change, 
        isPositive: change >= 0, 
        formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%` 
    };
}

/**
 * Создает HTML для отображения изменения
 * @param {Object} change - объект от getChangePercent
 * @param {boolean} isExpense - true если это расход (инвертирует знак)
 * @returns {string} HTML строка
 */
function getChangeHtml(change, isExpense = false) {
    if (!change) return '';
    let isPositive = change.isPositive;
    if (isExpense) isPositive = !isPositive;
    const colorClass = isPositive ? 'change-positive' : 'change-negative';
    return `<span class="metric-change ${colorClass}" style="font-size: 11px; padding: 2px 6px; border-radius: 12px; display: inline-block; margin-left: 8px;">${change.formatted}</span>`;
}

// ========================
// ОТРИСОВКА МИНИ-ГРАФИКОВ
// ========================

/**
 * Создает простой мини-график с помощью Plotly
 * @param {string} elementId - ID элемента
 * @param {Array} data - массив данных
 * @param {string} color - цвет линии
 */
function renderMiniChart(elementId, data, color) {
    if (!data || data.length === 0) return;
    if (typeof Plotly === 'undefined') return;
    
    const trace = { 
        y: data, 
        type: 'scatter', 
        mode: 'lines+markers', 
        line: { color, width: 2 }, 
        fill: 'tozeroy', 
        fillcolor: color + '20' 
    };
    
    const layout = { 
        margin: { t: 5, l: 5, r: 5, b: 5 }, 
        height: 40, 
        xaxis: { showticklabels: false, showgrid: false }, 
        yaxis: { showticklabels: false, showgrid: false }, 
        paper_bgcolor: 'rgba(0,0,0,0)', 
        plot_bgcolor: 'rgba(0,0,0,0)' 
    };
    
    Plotly.newPlot(elementId, [trace], layout, { displayModeBar: false });
}

// ========================
// ЭКСПОРТ ФУНКЦИЙ В WINDOW
// ========================

window.formatCurrency = formatCurrency;
window.formatCurrencyWithCurrency = formatCurrencyWithCurrency;
window.declension = declension;
window.showNotification = showNotification;
window.animateNumber = animateNumber;
window.detectCurrency = detectCurrency;
window.formatDateForInput = formatDateForInput;
window.formatDateShort = formatDateShort;
window.formatDateFull = formatDateFull;
window.parseDateFromRow = parseDateFromRow;
window.getPreviousMonths = getPreviousMonths;
window.getMonthIndex = getMonthIndex;
window.getChangePercent = getChangePercent;
window.getChangeHtml = getChangeHtml;
window.renderMiniChart = renderMiniChart;

console.log('✅ utils.js: ПОЛНАЯ версия загружена');
