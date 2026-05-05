// ========================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================

let oddsDateRange = { startDate: null, endDate: null };  // Выбранный период
let oddsOperations = [];                                 // Все операции
let oddsPlans = {};                                      // Плановые значения
let forecastPeriods = 6;                                // Прогноз на 6 месяцев
let currentCurrency = 'RUB';                            // Текущая валюта
let activeOddsTab = 0;                                  // Активная вкладка
let currentBalance = 0;                                 // Текущий остаток

// ========================
// СБОР ОПЕРАЦИЙ ИЗ ДАННЫХ
// ========================

/**
 * Парсит дату из строки Excel
 * @param {Object} row - строка данных
 * @returns {Date|null} - объект даты или null
 */
function parseOddsDate(row) {
    const year = row.год;
    const month = row.месяц;
    let day = row.число || row.день || row.День || row.day || '1';
    
    if (!year || !month) return null;
    
    const monthIndex = MONTHS_ORDER.indexOf(month.toLowerCase());
    if (monthIndex === -1) return null;
    
    // Нормализуем дату к UTC (полночь)
    const date = new Date(Date.UTC(parseInt(year), monthIndex, parseInt(day)));
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Собирает все операции для ОДДС из исходных данных
 * @returns {Array} - массив операций
 */
function collectOddsOperations() {
    // Используем оригинальные данные, игнорируя все фильтры
    const sourceData = originalData.length > 0 ? originalData : [];
    if (sourceData.length === 0) return [];
    
    const operations = [];
    
    sourceData.forEach(row => {
        const account = row.Счет || row.счет || row['Счет'] || '';
        const article = row.статья || '';
        
        // Пропускаем начальные остатки
        if (article === 'Начальный остаток' || !account) return;
        
        const amount = parseFloat(row.сумма) || 0;
        if (amount === 0) return;
        
        const date = parseOddsDate(row);
        const currency = detectCurrency(account);
        const channel = row.канал || row.Канал || '';
        
        // Проверяем, техническая ли операция
        const isTechnical = EXCLUDED_FROM_TOP.some(ex => channel.includes(ex));
        
        // Определяем тип операции
        let type = '';
        const isDeposit = channel === 'Депозит' || channel === 'депозит';
        
        if (!isDeposit) {
            if (article === 'Поступление на расчетный счет') {
                type = 'income';
            } else if (article === 'Списание с расчетного счета') {
                type = 'expense';
            } else if (amount > 0) {
                type = 'income';
            } else if (amount < 0) {
                type = 'expense';
            }
        }
        
        if (type && date) {
            operations.push({
                date: date,
                amount: Math.abs(amount),
                type: type,
                article: article,
                category: row.канал || row.подканал || article,
                year: row.год,
                month: row.месяц,
                account: account,
                currency: currency,
                isTechnical: isTechnical
            });
        }
    });
    
    console.log(`Собрано ${operations.length} операций для ОДДС`);
    return operations;
}

// ========================
// РАЗДЕЛЕНИЕ РАСХОДОВ НА ПОСТОЯННЫЕ И ПЕРЕМЕННЫЕ
// ========================

/**
 * Разделяет расходы на постоянные и переменные
 * @param {Array} operations - массив операций
 * @param {string} currency - валюта
 * @returns {Object} - объект с totals и items
 */
function splitExpensesByType(operations, currency = 'RUB') {
    const filtered = operations.filter(op => 
        op.type === 'expense' && 
        op.currency === currency && 
        !op.isTechnical
    );
    
    // Ключевые слова для определения типа расходов
    const fixedKeywords = ['аренд', 'фот', 'зарплат', 'оклад', 'бухгалтер', 
                           'юр сопровожд', 'связ', 'подписк', 'страхован', 'лиценз'];
    
    const variableKeywords = ['закупк', 'товар', 'себестоим', 'логистик', 
                              'доставк', 'комисс', 'маркетинг', 'реклам', 
                              'wb', 'ozon', 'маркетплейс'];
    
    let fixedTotal = 0, variableTotal = 0;
    const fixedItems = [], variableItems = [];
    
    filtered.forEach(op => {
        const text = (op.article + ' ' + op.category).toLowerCase();
        let isFixed = fixedKeywords.some(kw => text.includes(kw));
        let isVariable = variableKeywords.some(kw => text.includes(kw));
        
        if (isFixed && !isVariable) {
            fixedTotal += op.amount;
            fixedItems.push(op);
        } else if (isVariable || (!isFixed && !isVariable && text.includes('расход'))) {
            variableTotal += op.amount;
            variableItems.push(op);
        } else if (!isFixed && !isVariable) {
            variableTotal += op.amount;
            variableItems.push(op);
        }
    });
    
    return { fixedTotal, variableTotal, fixedItems, variableItems };
}

// ========================
// РАСЧЕТ ТОЧКИ БЕЗУБЫТОЧНОСТИ
// ========================

/**
 * Рассчитывает точку безубыточности
 * @param {number} fixedCosts - постоянные расходы
 * @param {number} variableCosts - переменные расходы
 * @param {number} revenue - выручка
 * @returns {Object} - объект с показателями
 */
function calculateBreakEvenPoint(fixedCosts, variableCosts, revenue) {
    const contributionMargin = revenue - variableCosts;
    const contributionMarginRatio = revenue > 0 ? (contributionMargin / revenue) * 100 : 0;
    const breakEvenRevenue = contributionMarginRatio > 0 ? (fixedCosts / contributionMarginRatio) * 100 : 0;
    const safetyMargin = revenue > 0 ? ((revenue - breakEvenRevenue) / revenue) * 100 : 0;
    const safetyMarginAbsolute = revenue - breakEvenRevenue;
    
    return { 
        contributionMargin, 
        contributionMarginRatio, 
        breakEvenRevenue, 
        safetyMargin, 
        safetyMarginAbsolute 
    };
}

// ========================
// РАСЧЕТ ДЕНЕЖНОГО ЦИКЛА (CCC)
// ========================

/**
 * Рассчитывает Cash Conversion Cycle
 * @param {Array} operations - массив операций
 * @param {string} currency - валюта
 * @returns {Object} - объект с CCC и компонентами
 */
function calculateCCC(operations, currency = 'RUB') {
    const filtered = operations.filter(op => op.currency === currency);
    
    // Ищем средний срок оплаты поставщикам
    const variableOps = filtered.filter(op => {
        const text = (op.article + ' ' + op.category).toLowerCase();
        return text.includes('закупк') || text.includes('товар') || text.includes('поставщик');
    });
    
    // Ищем средний срок получения денег от покупателей
    const incomeOps = filtered.filter(op => 
        op.type === 'income' && 
        (op.article.includes('поступление') || op.category.includes('оплата'))
    );
    
    // Примерные оценки (в реальности нужно брать из данных)
    const avgPayablesDays = variableOps.length > 0 ? 30 : 45;     // Отсрочка поставщикам
    const avgReceivablesDays = incomeOps.length > 0 ? 15 : 30;    // Отсрочка клиентам
    const avgInventoryDays = 60;                                   // Оборачиваемость запасов
    
    const ccc = avgInventoryDays + avgReceivablesDays - avgPayablesDays;
    
    return { 
        ccc, 
        avgInventoryDays, 
        avgReceivablesDays, 
        avgPayablesDays, 
        risk: ccc > 60 ? 'high' : ccc > 30 ? 'medium' : 'low' 
    };
}

// ========================
// ПРОГНОЗ КАССОВЫХ РАЗРЫВОВ
// ========================

/**
 * Прогнозирует кассовые разрывы
 * @param {number} currentBalance - текущий остаток
 * @param {number} dailyIncome - средний дневной доход
 * @param {number} dailyExpense - средний дневной расход
 * @param {number} months - количество месяцев прогноза
 * @returns {Array} - массив с прогнозом по месяцам
 */
function calculateCashGapForecast(currentBalance, dailyIncome, dailyExpense, months = 6) {
    const forecast = [];
    let balance = currentBalance;
    const minBalance = 100000; // Минимальный порог в 100 тыс. руб.
    
    for (let i = 1; i <= months; i++) {
        const monthIncome = dailyIncome * 30;
        const monthExpense = dailyExpense * 30;
        balance += monthIncome - monthExpense;
        
        forecast.push({
            month: i,
            income: monthIncome,
            expense: monthExpense,
            balance: balance,
            isGap: balance < minBalance,
            gapAmount: balance < minBalance ? minBalance - balance : 0
        });
    }
    
    return forecast;
}

// ========================
// РЕКОМЕНДАЦИИ ПО ЛИКВИДНОСТИ
// ========================

/**
 * Генерирует рекомендации на основе финансовых показателей
 * @param {number} balance - текущий остаток
 * @param {number} ccc - денежный цикл в днях
 * @param {number} safetyMargin - запас прочности (%)
 * @param {number} breakEvenRevenue - точка безубыточности
 * @param {number} revenue - текущая выручка
 * @returns {Array} - массив рекомендаций
 */
function getLiquidityRecommendations(balance, ccc, safetyMargin, breakEvenRevenue, revenue) {
    const recommendations = [];
    
    // Рекомендации по остатку
    if (balance < 500000) {
        recommendations.push({ 
            level: 'danger', 
            text: '🔴 Критический остаток! Немедленно примите меры: сократите расходы или привлеките финансирование.' 
        });
    } else if (balance < 1000000) {
        recommendations.push({ 
            level: 'warning', 
            text: '🟡 Остаток ниже нормы. Рекомендуется создать резервный фонд минимум 500 000 ₽.' 
        });
    } else {
        recommendations.push({ 
            level: 'good', 
            text: '🟢 Достаточный остаток. Можно инвестировать в развитие.' 
        });
    }
    
    // Рекомендации по денежному циклу
    if (ccc > 60) {
        recommendations.push({ 
            level: 'warning', 
            text: `⚠️ Длинный денежный цикл (${ccc} дней). Ускоряйте оборачиваемость: сократите отсрочки клиентам и договаривайтесь с поставщиками.` 
        });
    } else if (ccc > 30) {
        recommendations.push({ 
            level: 'info', 
            text: `ℹ️ Средний денежный цикл (${ccc} дней). Работайте над его сокращением.` 
        });
    }
    
    // Рекомендации по запасу прочности
    if (safetyMargin < 10) {
        recommendations.push({ 
            level: 'danger', 
            text: `🔴 Запас финансовой прочности критический (${safetyMargin.toFixed(1)}%). Риск убытков высок!` 
        });
    } else if (safetyMargin < 30) {
        recommendations.push({ 
            level: 'warning', 
            text: `🟡 Запас прочности ниже нормы (${safetyMargin.toFixed(1)}%). Увеличивайте выручку или сокращайте затраты.` 
        });
    }
    
    // Рекомендация по точке безубыточности
    if (breakEvenRevenue > revenue && revenue > 0) {
        recommendations.push({ 
            level: 'danger', 
            text: `🔴 Выручка ниже точки безубыточности! Необходимо срочно увеличить продажи на ${formatCurrency(breakEvenRevenue - revenue)}` 
        });
    }
    
    return recommendations;
}

// ========================
// ГРАФИК ДИНАМИКИ ОСТАТКА
// ========================

/**
 * Отрисовывает график изменения остатка по дням
 * @param {Array} data - массив {date, balance}
 */
function renderBalanceTrendChart(data) {
    const canvas = document.getElementById('balanceTrendChart');
    if (!canvas || !data || !data.length) return;
    
    // Уничтожаем старый график
    if (window.balanceTrendChart) {
        try {
            if (typeof window.balanceTrendChart.destroy === 'function') {
                window.balanceTrendChart.destroy();
            }
        } catch(e) {}
        window.balanceTrendChart = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    
    const labels = data.map(d => {
        if (!d.date) return '';
        return `${d.date.getDate()}.${d.date.getMonth() + 1}`;
    });
    
    const values = data.map(d => d.balance);
    
    window.balanceTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Остаток (тыс. ₽)',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102,126,234,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `💰 ${formatCurrency(context.raw * 1000)}`;
                        }
                    }
                },
                legend: { display: false }
            },
            scales: {
                y: {
                    title: { display: true, text: 'тыс. ₽', font: { size: 10 } },
                    ticks: { callback: (v) => v.toFixed(0) + ' тыс.' }
                },
                x: {
                    ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } }
                }
            }
        }
    });
}

// ========================
// ГРАФИК ДЕНЕЖНОГО ЦИКЛА
// ========================

/**
 * Отрисовывает столбчатую диаграмму CCC
 * @param {Object} cccData - данные CCC
 */
function renderCCCChart(cccData) {
    const canvas = document.getElementById('cccChart');
    if (!canvas) return;
    
    if (window.cccChart) {
        try { window.cccChart.destroy(); } catch(e) {}
        window.cccChart = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    
    window.cccChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Оборачиваемость запасов', 'Отсрочка клиентам', 'Отсрочка поставщикам', 'Денежный цикл'],
            datasets: [{
                label: 'Дни',
                data: [cccData.avgInventoryDays, cccData.avgReceivablesDays, cccData.avgPayablesDays, cccData.ccc],
                backgroundColor: ['#4299e1', '#48bb78', '#ed8936', cccData.ccc > 60 ? '#f56565' : '#48bb78'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ctx.raw + ' дней' } }
            }
        }
    });
}

// ========================
// ГРАФИК СЕЗОННОСТИ
// ========================

/**
 * Отрисовывает график сезонности доходов и расходов
 * @param {Array} operations - массив операций
 * @param {string} currency - валюта
 */
function renderSeasonalityChart(operations, currency = 'RUB') {
    const canvas = document.getElementById('seasonalityChart');
    if (!canvas) return;
    
    if (window.seasonalityChart) {
        try { window.seasonalityChart.destroy(); } catch(e) {}
        window.seasonalityChart = null;
    }
    
    const filtered = operations.filter(op => op.currency === currency);
    const monthlyData = {};
    
    MONTHS_ORDER.forEach(m => { 
        monthlyData[m] = { income: 0, expense: 0 }; 
    });
    
    filtered.forEach(op => {
        const month = op.month;
        if (monthlyData[month]) {
            if (op.type === 'income') monthlyData[month].income += op.amount;
            else monthlyData[month].expense += op.amount;
        }
    });
    
    const labels = MONTHS_ORDER.map(m => m.slice(0, 3));
    const incomeData = labels.map((_, i) => monthlyData[MONTHS_ORDER[i]].income / 1000);
    const expenseData = labels.map((_, i) => monthlyData[MONTHS_ORDER[i]].expense / 1000);
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    
    window.seasonalityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Поступления', 
                    data: incomeData, 
                    borderColor: '#48bb78', 
                    backgroundColor: 'rgba(72,187,120,0.1)', 
                    fill: true, 
                    tension: 0.4,
                    pointRadius: 3
                },
                { 
                    label: 'Списания', 
                    data: expenseData, 
                    borderColor: '#f56565', 
                    backgroundColor: 'rgba(245,101,101,0.1)', 
                    fill: true, 
                    tension: 0.4,
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                tooltip: { 
                    callbacks: { 
                        label: (ctx) => ctx.dataset.label + ': ' + formatCurrency(ctx.raw * 1000) 
                    } 
                }
            },
            scales: { 
                y: { title: { display: true, text: 'тыс. ₽', font: { size: 10 } } } 
            }
        }
    });
}

// ========================
// КРЕДИТНЫЙ КАЛЬКУЛЯТОР
// ========================

/**
 * Создает и отрисовывает кредитный калькулятор
 * @param {number} currentBalance - текущий остаток для проверки
 */
function renderCreditCalculator(currentBalance) {
    const container = document.getElementById('creditCalculator');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <label style="font-size: 12px; display: block; margin-bottom: 6px;">💰 Сумма кредита (₽)</label>
                <input type="number" id="creditAmount" class="auth-input" style="width: 100%;" placeholder="1 000 000" value="1000000">
                
                <label style="font-size: 12px; display: block; margin-top: 12px; margin-bottom: 6px;">📅 Срок (месяцев)</label>
                <input type="number" id="creditTerm" class="auth-input" style="width: 100%;" placeholder="12" value="12">
                
                <label style="font-size: 12px; display: block; margin-top: 12px; margin-bottom: 6px;">📈 Ставка (% годовых)</label>
                <input type="number" id="creditRate" class="auth-input" style="width: 100%;" placeholder="25" value="25">
                
                <button id="calcCreditBtn" class="btn btn-primary" style="margin-top: 16px; width: 100%;">Рассчитать</button>
            </div>
            <div id="creditResult" style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 12px;">📊 Результат</div>
                <div id="creditResultText">Введите параметры и нажмите "Рассчитать"</div>
            </div>
        </div>
    `;
    
    // Обработчик расчета
    document.getElementById('calcCreditBtn')?.addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('creditAmount')?.value) || 0;
        const term = parseFloat(document.getElementById('creditTerm')?.value) || 12;
        const rate = parseFloat(document.getElementById('creditRate')?.value) || 25;
        
        // Формула аннуитетного платежа
        const monthlyRate = rate / 12 / 100;
        const payment = amount * monthlyRate * Math.pow(1 + monthlyRate, term) / 
                        (Math.pow(1 + monthlyRate, term) - 1);
        const totalPayment = payment * term;
        const overpayment = totalPayment - amount;
        
        document.getElementById('creditResultText').innerHTML = `
            <div style="margin-bottom: 12px;">💰 Ежемесячный платёж: <strong>${formatCurrency(payment)}</strong></div>
            <div style="margin-bottom: 12px;">📊 Общая сумма выплат: <strong>${formatCurrency(totalPayment)}</strong></div>
            <div style="margin-bottom: 8px;">💸 Переплата: <strong>${formatCurrency(overpayment)}</strong> (${((overpayment/amount)*100).toFixed(1)}%)</div>
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(102,126,234,0.2); font-size: 11px; color: ${payment * 3 > currentBalance ? '#f56565' : '#48bb78'}">
                ${payment * 3 > currentBalance ? '⚠️ Платёж более 3х кратного остатка! Риск кассового разрыва.' : '✅ Платёж в пределах безопасности.'}
            </div>
        `;
    });
}

// ========================
// ПЛАНОВЫЕ РАСХОДЫ И ПРОГНОЗ
// ========================

/**
 * Сохраняет планы в localStorage
 */
function saveOddsPlans() {
    localStorage.setItem('odds_plans', JSON.stringify(oddsPlans));
}

/**
 * Загружает планы из localStorage
 */
function loadOddsPlans() {
    const saved = localStorage.getItem('odds_plans');
    if (saved) {
        try {
            oddsPlans = JSON.parse(saved);
        } catch(e) {}
    }
}

/**
 * Отрисовывает форму для плановых расходов
 */
function renderPlannedExpenses() {
    const container = document.getElementById('plannedExpensesContainer');
    if (!container) return;
    
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const currentMonth = new Date().getMonth();
    
    let html = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr>
    `;
    
    for (let i = 0; i < Math.min(forecastPeriods, months.length); i++) {
        const monthIdx = (currentMonth + i) % 12;
        html += `<th style="padding: 10px; background: rgba(102,126,234,0.1);">${months[monthIdx]}</th>`;
    }
    
    html += `</tr></thead><tbody><tr>`;
    
    // Плановые расходы
    for (let i = 0; i < forecastPeriods; i++) {
        const key = `planned_month_${i}`;
        const value = oddsPlans[key] || '';
        html += `<td style="padding: 10px;">
                    <input type="number" id="${key}" class="planned-input" 
                           style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(102,126,234,0.3); background: transparent;" 
                           placeholder="Расходы" value="${value}">
                 </td>`;
    }
    
    html += `</tr><tr>`;
    
    // Плановые поступления
    for (let i = 0; i < forecastPeriods; i++) {
        const key = `planned_income_${i}`;
        const value = oddsPlans[key] || '';
        html += `<td style="padding: 10px;">
                    <input type="number" id="${key}" class="planned-input" 
                           style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(102,126,234,0.3); background: transparent;" 
                           placeholder="Поступления" value="${value}">
                 </td>`;
    }
    
    html += `</tr></tbody></table>
        </div>
        <button id="savePlansBtn" class="btn btn-secondary" style="margin-top: 16px;">💾 Сохранить план</button>
        <div id="forecastResult" style="margin-top: 16px;"></div>
    `;
    
    container.innerHTML = html;
    
    // Сохранение при изменении
    const inputs = document.querySelectorAll('.planned-input');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            oddsPlans[input.id] = input.value;
            saveOddsPlans();
        });
    });
    
    // Кнопка сохранения
    document.getElementById('savePlansBtn')?.addEventListener('click', () => {
        calculateForecast();
        showNotification('План сохранён', 'success');
    });
    
    if (Object.keys(oddsPlans).length > 0) calculateForecast();
}

/**
 * Рассчитывает прогноз на основе планов
 */
function calculateForecast() {
    const forecast = [];
    let balance = currentBalance;
    let gapMonths = [];
    
    for (let i = 0; i < forecastPeriods; i++) {
        const plannedIncome = parseFloat(oddsPlans[`planned_income_${i}`]) || 0;
        const plannedExpense = parseFloat(oddsPlans[`planned_month_${i}`]) || 0;
        const netFlow = plannedIncome - plannedExpense;
        balance += netFlow;
        
        forecast.push({ month: i, balance, netFlow, plannedIncome, plannedExpense });
        if (balance < 100000) gapMonths.push(i + 1);
    }
    
    const resultHtml = `
        <div style="margin-top: 16px; padding: 16px; background: rgba(102,126,234,0.1); border-radius: 12px;">
            <div style="font-weight: 600; margin-bottom: 12px;">📊 Прогноз остатка по плану:</div>
            <div style="display: grid; grid-template-columns: repeat(${forecastPeriods}, 1fr); gap: 8px;">
                ${forecast.map(f => `
                    <div style="text-align: center; padding: 8px; background: ${f.balance < 100000 ? 'rgba(245,101,101,0.2)' : 'rgba(72,187,120,0.1)'}; border-radius: 8px;">
                        <div style="font-size: 10px;">Месяц ${f.month + 1}</div>
                        <div style="font-weight: 700; color: ${f.balance >= 0 ? '#48bb78' : '#f56565'}">${formatCurrency(f.balance)}</div>
                        <div style="font-size: 10px; opacity: 0.7;">${formatCurrency(f.netFlow)}</div>
                    </div>
                `).join('')}
            </div>
            ${gapMonths.length > 0 ? `
                <div style="margin-top: 12px; padding: 10px; background: rgba(245,101,101,0.15); border-radius: 8px;">
                    <span style="color: #f56565;">⚠️ ВНИМАНИЕ! Кассовый разрыв ожидается в ${gapMonths.join(', ')} месяц(ах)!</span>
                </div>
            ` : '<div style="margin-top: 12px; padding: 10px; background: rgba(72,187,120,0.15); border-radius: 8px;">✅ Кассовых разрывов не ожидается.</div>'}
        </div>
    `;
    
    const forecastResult = document.getElementById('forecastResult');
    if (forecastResult) forecastResult.innerHTML = resultHtml;
}

// ========================
// ИНИЦИАЛИЗАЦИЯ ФИЛЬТРОВ
// ========================

/**
 * Устанавливает начальные даты для фильтрации
 */
function initOddsDates() {
    const startDateInput = document.getElementById('oddsStartDate');
    const endDateInput = document.getElementById('oddsEndDate');
    if (!startDateInput || !endDateInput) return;
    
    const tempOps = collectOddsOperations();
    
    // Находим минимальную и максимальную дату
    let minDate = null;
    let maxDate = null;
    
    tempOps.forEach(op => {
        if (op.date) {
            if (!minDate || op.date < minDate) minDate = op.date;
            if (!maxDate || op.date > maxDate) maxDate = op.date;
        }
    });
    
    if (minDate && maxDate) {
        const defaultStart = new Date(maxDate);
        defaultStart.setDate(maxDate.getDate() - 30);
        const start = defaultStart > minDate ? defaultStart : minDate;
        
        startDateInput.value = formatDateForInput(start);
        endDateInput.value = formatDateForInput(maxDate);
        
        oddsDateRange.startDate = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
        oddsDateRange.endDate = new Date(Date.UTC(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()));
    } else {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        startDateInput.value = formatDateForInput(thirtyDaysAgo);
        endDateInput.value = formatDateForInput(today);
        
        oddsDateRange.startDate = new Date(Date.UTC(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate()));
        oddsDateRange.endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    }
}

/**
 * Настраивает обработчики фильтров ОДДС
 */
function initOddsFilters() {
    const startDateInput = document.getElementById('oddsStartDate');
    const endDateInput = document.getElementById('oddsEndDate');
    const applyBtn = document.getElementById('oddsApplyDatesBtn');
    const resetBtn = document.getElementById('oddsResetDatesBtn');
    const forceRefreshBtn = document.getElementById('oddsForceRefreshBtn');
    const quickBtns = document.querySelectorAll('.odds-quick-btn');
    
    if (!startDateInput || !endDateInput) return;
    
    // Применение фильтра
    if (applyBtn) {
        applyBtn.onclick = () => {
            oddsOperations = collectOddsOperations();
            
            if (startDateInput.value) {
                const [year, month, day] = startDateInput.value.split('-');
                oddsDateRange.startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }
            if (endDateInput.value) {
                const [year, month, day] = endDateInput.value.split('-');
                oddsDateRange.endDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }
            
            renderOddsPage();
        };
    }
    
    // Сброс фильтра
    if (resetBtn) {
        resetBtn.onclick = initOddsDates;
    }
    
    // Принудительное обновление
    if (forceRefreshBtn) {
        forceRefreshBtn.onclick = () => {
            oddsOperations = collectOddsOperations();
            renderOddsPage();
            showNotification('Данные ОДДС обновлены', 'success');
        };
    }
    
    // Быстрые периоды
    quickBtns.forEach(btn => {
        btn.onclick = () => {
            oddsOperations = collectOddsOperations();
            const today = new Date();
            const days = btn.dataset.days;
            
            if (days === 'thisMonth') {
                const firstDayOfMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
                const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                startDateInput.value = formatDateForInput(firstDayOfMonth);
                oddsDateRange.startDate = firstDayOfMonth;
                endDateInput.value = formatDateForInput(todayUTC);
                oddsDateRange.endDate = todayUTC;
            } else if (days === 'lastMonth') {
                const firstDayLastMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth() - 1, 1));
                const lastDayLastMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 0));
                startDateInput.value = formatDateForInput(firstDayLastMonth);
                oddsDateRange.startDate = firstDayLastMonth;
                endDateInput.value = formatDateForInput(lastDayLastMonth);
                oddsDateRange.endDate = lastDayLastMonth;
            } else if (days) {
                const pastDate = new Date();
                pastDate.setDate(today.getDate() - parseInt(days));
                const pastUTC = new Date(Date.UTC(pastDate.getFullYear(), pastDate.getMonth(), pastDate.getDate()));
                const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                startDateInput.value = formatDateForInput(pastUTC);
                oddsDateRange.startDate = pastUTC;
                endDateInput.value = formatDateForInput(todayUTC);
                oddsDateRange.endDate = todayUTC;
            }
            renderOddsPage();
        };
    });
}

/**
 * Очищает кэш ОДДС при переключении страницы
 */
function clearOddsCache() {
    oddsOperations = [];
    if (window.balanceTrendChart) {
        try { window.balanceTrendChart.destroy(); } catch(e) {}
        window.balanceTrendChart = null;
    }
    if (window.cccChart) {
        try { window.cccChart.destroy(); } catch(e) {}
        window.cccChart = null;
    }
    if (window.seasonalityChart) {
        try { window.seasonalityChart.destroy(); } catch(e) {}
        window.seasonalityChart = null;
    }
}
