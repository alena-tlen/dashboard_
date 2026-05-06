// ========================
// dashboardRender.js - ОТРИСОВКА ДАШБОРДА
// ========================

// Глобальные переменные для графиков
let revenueChart = null;
let miniRevenueChart = null;
let miniExpenseChart = null;
let netRevenueMiniChart = null;
let profitMiniChart = null;
let isRendering = false;

// НЕ ОБЪЯВЛЯЕМ переменные, используем глобальные из window
function syncGlobalData() {
    window.originalData = window.originalData || [];
    window.currentData = window.currentData || [];
    window.currentFilters = window.currentFilters || { company: '', year: '', month: [], channel: '' };
}

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

function formatCurrency(value) {
    return new Intl.NumberFormat('ru-RU', { 
        style: 'currency', 
        currency: 'RUB', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(value));
}

function getChangeHtml(change, isExpense = false) {
    if (!change) return '';
    let isPositive = change.isPositive;
    if (isExpense) isPositive = !isPositive;
    const colorClass = isPositive ? 'change-positive' : 'change-negative';
    return `<span class="metric-change ${colorClass}" style="font-size: 11px; padding: 2px 6px; border-radius: 12px; display: inline-block; margin-left: 8px;">${change.formatted}</span>`;
}

function getChannelIcon(channelName) {
    const icons = {
        'Wildberries': '🛍️',
        'Ozon': '📦',
        'Детский мир': '🧸',
        'Lamoda': '👗',
        'Оптовики': '📊',
        'Фулфилмент': '📁'
    };
    return icons[channelName] || '📌';
}

function getPreviousMonths(months, count = 1) {
    const MONTHS_ORDER = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
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

// ========================
// МИНИ-ГРАФИКИ
// ========================

function renderMiniChartJS(elementId, labels, data, color) {
    const canvas = document.getElementById(elementId);
    if (!canvas || !labels || labels.length === 0 || !data || data.length === 0) return;
    
    if (miniRevenueChart) {
        try { if (typeof miniRevenueChart.destroy === 'function') miniRevenueChart.destroy(); } catch(e) {}
        miniRevenueChart = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    const areaColor = isDarkMode ? 'rgba(72,187,120,0.08)' : 'rgba(72,187,120,0.05)';
    const lineColor = data[data.length-1] >= data[0] ? '#48bb78' : '#f56565';
    
    miniRevenueChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: data, borderColor: lineColor, backgroundColor: areaColor, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.4, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

function renderExpenseMiniChartJS(elementId, labels, data, color) {
    const canvas = document.getElementById(elementId);
    if (!canvas || !labels || labels.length === 0 || !data || data.length === 0) return;
    
    if (miniExpenseChart) {
        try { if (typeof miniExpenseChart.destroy === 'function') miniExpenseChart.destroy(); } catch(e) {}
        miniExpenseChart = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    const areaColor = isDarkMode ? 'rgba(245,101,101,0.08)' : 'rgba(245,101,101,0.05)';
    
    miniExpenseChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: data, borderColor: '#f56565', backgroundColor: areaColor, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.4, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

function renderNetRevenueMiniChart() {
    const canvas = document.getElementById('netRevenueMiniChart');
    if (!canvas) return;
    
    const monthsOrder = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const monthlyNetRevenue = {};
    for (let i = 0; i < monthsOrder.length; i++) monthlyNetRevenue[monthsOrder[i]] = 0;
    
    const data = window.currentData || [];
    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        if (d && d.месяц && d.тип === 'Доход') {
            let ndsOut = 0;
            for (let j = 0; j < data.length; j++) {
                const row = data[j];
                if (row && row.месяц === d.месяц && row.статья === 'НДС' && row.подканал === 'НДС исходящий') {
                    ndsOut += (row.сумма || 0);
                }
            }
            monthlyNetRevenue[d.месяц] += (d.сумма || 0) - ndsOut;
        }
    }
    
    const labels = [];
    const values = [];
    for (let i = 0; i < monthsOrder.length; i++) {
        const month = monthsOrder[i];
        const val = monthlyNetRevenue[month];
        if (val !== 0 && val !== undefined) {
            labels.push(month.slice(0, 3));
            values.push(val / 1000);
        }
    }
    
    if (labels.length === 0) return;
    
    if (window.netRevenueMiniChartInstance) {
        try { if (typeof window.netRevenueMiniChartInstance.destroy === 'function') window.netRevenueMiniChartInstance.destroy(); } catch(e) {}
        window.netRevenueMiniChartInstance = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    const areaColor = isDarkMode ? 'rgba(72,187,120,0.08)' : 'rgba(72,187,120,0.05)';
    const lineColor = values[values.length - 1] >= values[0] ? '#48bb78' : '#f56565';
    
    window.netRevenueMiniChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: values, borderColor: lineColor, backgroundColor: areaColor, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.4, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

function renderProfitMiniChart() {
    const canvas = document.getElementById('profitMiniChart');
    if (!canvas) return;
    
    const monthsOrder = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const monthlyRevenue = {}, monthlyExpenses = {}, monthlyNdsOut = {};
    for (let i = 0; i < monthsOrder.length; i++) {
        monthlyRevenue[monthsOrder[i]] = 0;
        monthlyExpenses[monthsOrder[i]] = 0;
        monthlyNdsOut[monthsOrder[i]] = 0;
    }
    
    const data = window.currentData || [];
    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        if (d && d.месяц && monthsOrder.includes(d.месяц)) {
            if (d.тип === 'Доход') monthlyRevenue[d.месяц] += d.сумма || 0;
            if (d.тип === 'Расход') monthlyExpenses[d.месяц] += Math.abs(d.сумма || 0);
            if (d.статья === 'НДС' && d.подканал === 'НДС исходящий') monthlyNdsOut[d.месяц] += d.сумма || 0;
        }
    }
    
    const monthlyProfit = {};
    for (let i = 0; i < monthsOrder.length; i++) {
        const month = monthsOrder[i];
        const netRevenue = monthlyRevenue[month] - monthlyNdsOut[month];
        monthlyProfit[month] = netRevenue - monthlyExpenses[month];
    }
    
    const labels = [];
    const values = [];
    for (let i = 0; i < monthsOrder.length; i++) {
        const month = monthsOrder[i];
        const val = monthlyProfit[month];
        if (val !== 0 && val !== undefined) {
            labels.push(month.slice(0, 3));
            values.push(val / 1000);
        }
    }
    
    if (labels.length === 0) return;
    
    if (window.profitMiniChartInstance) {
        try { if (typeof window.profitMiniChartInstance.destroy === 'function') window.profitMiniChartInstance.destroy(); } catch(e) {}
        window.profitMiniChartInstance = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    const areaColor = isDarkMode ? 'rgba(72,187,120,0.08)' : 'rgba(72,187,120,0.05)';
    const lineColor = values[values.length - 1] >= values[0] ? '#48bb78' : '#f56565';
    
    window.profitMiniChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: values, borderColor: lineColor, backgroundColor: areaColor, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.4, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

function renderMonthlyLineChart(labels, revenues) {
    const canvas = document.getElementById('monthlyRevenueChart');
    if (!canvas) return;
    if (window.monthlyLineChart) { try { window.monthlyLineChart.destroy(); } catch(e) {} window.monthlyLineChart = null; }
    const ctx = canvas.getContext('2d');
    window.monthlyLineChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Выручка (тыс. ₽)', data: revenues, borderColor: '#48bb78', backgroundColor: 'rgba(72,187,120,0.1)', borderWidth: 2, fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });
}

function renderSalesChart(labels, salesData) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    if (window.salesChart) { try { window.salesChart.destroy(); } catch(e) {} window.salesChart = null; }
    const ctx = canvas.getContext('2d');
    window.salesChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Продажи (шт)', data: salesData, backgroundColor: '#60a5fa', borderRadius: 8, barPercentage: 0.7 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });
}

function renderNdsToRevenueChart(labels, ndsValues, revenueValues) {
    const canvas = document.getElementById('ndsToRevenueChart');
    if (!canvas) return;
    if (window.ndsToRevenueChart) { try { window.ndsToRevenueChart.destroy(); } catch(e) {} window.ndsToRevenueChart = null; }
    const ndsPercentages = ndsValues.map((nds, idx) => { const revenue = revenueValues[idx] || 0; return revenue > 0 ? (Math.abs(nds) / revenue) * 100 : 0; });
    const ctx = canvas.getContext('2d');
    window.ndsToRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'НДС (% от выручки)', data: ndsPercentages, backgroundColor: ndsPercentages.map(p => p > 20 ? '#f56565' : p > 15 ? '#ed8936' : p > 10 ? '#fbbf24' : '#48bb78'), borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: true, scales: { y: { title: { display: true, text: '%' } } } }
    });
}

function renderNdsStatsCard(ndsPercent, ndsAmount, revenue) {
    const container = document.getElementById('ndsStatsCard');
    if (!container) return;
    let status = '', color = '';
    if (ndsPercent > 20) { status = 'Критичная нагрузка'; color = '#f56565'; }
    else if (ndsPercent > 15) { status = 'Высокая нагрузка'; color = '#ed8936'; }
    else if (ndsPercent > 10) { status = 'Средняя нагрузка'; color = '#fbbf24'; }
    else { status = 'Нормальная нагрузка'; color = '#48bb78'; }
    container.innerHTML = `<div style="margin-top: 16px; padding: 12px; background: ${color}15; border-radius: 12px; border-left: 3px solid ${color};">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div><div style="font-size: 12px;">НДС к уплате</div><div style="font-size: 20px; font-weight: 700;">${formatCurrency(Math.abs(ndsAmount))}</div></div>
            <div style="text-align: right;"><div style="font-size: 12px;">% от выручки</div><div style="font-size: 20px; font-weight: 700; color: ${color};">${ndsPercent.toFixed(1)}%</div><div style="font-size: 10px;">${status}</div></div>
        </div>
    </div>`;
}

// ========================
// СЦЕНАРНЫЙ АНАЛИЗ (из монолита)
// ========================

let currentScenario = { revenueGrowth: 0, expenseGrowth: 0, ndsGrowth: 0, priceChange: 0, volumeChange: 0 };

function renderScenarioAnalysis(f, totalSalesQuantity, avgCheck, avgCost, costData) {
    const baseRevenue = f.totalRevenue;
    const baseExpenses = f.totalExpenses;
    const baseNDS = f.totalNDS;
    const baseProfit = f.profit;
    const baseProfitability = f.profitability;
    const baseAvgCheck = avgCheck;
    const baseAvgCost = avgCost;
    const baseSales = totalSalesQuantity;
    
    const scenarioRevenue = baseRevenue * (1 + currentScenario.revenueGrowth / 100);
    const scenarioExpenses = baseExpenses * (1 + currentScenario.expenseGrowth / 100);
    const scenarioNDS = baseNDS * (1 + currentScenario.ndsGrowth / 100);
    const scenarioNetRevenue = scenarioRevenue - Math.abs(scenarioNDS);
    const scenarioProfit = scenarioNetRevenue - scenarioExpenses;
    const scenarioProfitability = scenarioNetRevenue > 0 ? (scenarioProfit / scenarioNetRevenue) * 100 : 0;
    
    const scenarioAvgCheck = baseAvgCheck * (1 + currentScenario.priceChange / 100);
    const scenarioSales = baseSales * (1 + currentScenario.volumeChange / 100);
    
    function formatWithColor(value, baseValue, isCurrency = true, reverse = false) {
        const diff = value - baseValue;
        if (Math.abs(diff) < 0.01) return '';
        const isPositive = reverse ? diff < 0 : diff > 0;
        const sign = diff > 0 ? '+' : '';
        const formattedDiff = isCurrency ? formatCurrency(Math.abs(diff)) : `${sign}${diff.toFixed(1)}%`;
        const colorClass = isPositive ? 'positive' : 'negative';
        return `<span class="${colorClass}" style="font-size: 11px; margin-left: 8px;">(${sign}${formattedDiff})</span>`;
    }
    
    const slidersHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <div><label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;"><span>📈 Изменение выручки</span><span id="revenueGrowthValue" style="font-weight: 600; color: #667eea;">${currentScenario.revenueGrowth >= 0 ? '+' : ''}${currentScenario.revenueGrowth}%</span></label>
            <input type="range" id="revenueGrowthSlider" min="-30" max="50" step="1" value="${currentScenario.revenueGrowth}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #f56565, #48bb78); appearance: none; cursor: pointer;"></div>
            <div><label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;"><span>📉 Изменение расходов</span><span id="expenseGrowthValue" style="font-weight: 600; color: #667eea;">${currentScenario.expenseGrowth >= 0 ? '+' : ''}${currentScenario.expenseGrowth}%</span></label>
            <input type="range" id="expenseGrowthSlider" min="-30" max="50" step="1" value="${currentScenario.expenseGrowth}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #48bb78, #f56565); appearance: none; cursor: pointer;"></div>
            <div><label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;"><span>💸 Изменение НДС</span><span id="ndsGrowthValue" style="font-weight: 600; color: #667eea;">${currentScenario.ndsGrowth >= 0 ? '+' : ''}${currentScenario.ndsGrowth}%</span></label>
            <input type="range" id="ndsGrowthSlider" min="-30" max="30" step="1" value="${currentScenario.ndsGrowth}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #4299e1, #ed8936); appearance: none; cursor: pointer;"></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 16px;">
            <div><label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;"><span>💰 Изменение цены</span><span id="priceChangeValue" style="font-weight: 600; color: #667eea;">${currentScenario.priceChange >= 0 ? '+' : ''}${currentScenario.priceChange}%</span></label>
            <input type="range" id="priceChangeSlider" min="-20" max="30" step="1" value="${currentScenario.priceChange}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #667eea, #48bb78); appearance: none; cursor: pointer;"></div>
            <div><label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;"><span>📦 Изменение объёма продаж</span><span id="volumeChangeValue" style="font-weight: 600; color: #667eea;">${currentScenario.volumeChange >= 0 ? '+' : ''}${currentScenario.volumeChange}%</span></label>
            <input type="range" id="volumeChangeSlider" min="-30" max="50" step="1" value="${currentScenario.volumeChange}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #48bb78, #4299e1); appearance: none; cursor: pointer;"></div>
            <div><button id="resetScenarioBtn" style="padding: 8px 16px; background: #667eea; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 12px; width: 100%;">🔄 Сбросить все настройки</button></div>
        </div>
    `;
    
    const resultsHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(102,126,234,0.2);">
            <div style="background: rgba(102,126,234,0.08); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary);">💰 Выручка (с НДС)</div>
                <div style="font-size: 20px; font-weight: 700;">${formatCurrency(scenarioRevenue)}</div>
                <div style="font-size: 11px;">${formatWithColor(scenarioRevenue, baseRevenue, true)}</div>
            </div>
            <div style="background: rgba(102,126,234,0.08); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary);">📉 Расходы</div>
                <div style="font-size: 20px; font-weight: 700;">${formatCurrency(scenarioExpenses)}</div>
                <div style="font-size: 11px;">${formatWithColor(scenarioExpenses, baseExpenses, true, true)}</div>
            </div>
            <div style="background: rgba(102,126,234,0.08); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary);">📈 Прибыль</div>
                <div style="font-size: 20px; font-weight: 700; ${scenarioProfit >= 0 ? 'color: #48bb78;' : 'color: #f56565;'}">${formatCurrency(scenarioProfit)}</div>
                <div style="font-size: 11px;">${formatWithColor(scenarioProfit, baseProfit, true)}</div>
            </div>
            <div style="background: rgba(102,126,234,0.08); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary);">📊 Рентабельность</div>
                <div style="font-size: 20px; font-weight: 700; ${scenarioProfitability >= 0 ? 'color: #48bb78;' : 'color: #f56565;'}">${scenarioProfitability.toFixed(1)}%</div>
                <div style="font-size: 11px;">${formatWithColor(scenarioProfitability, baseProfitability, false)}</div>
            </div>
        </div>
    `;
    
    let recommendationText = '';
    if (scenarioProfit > baseProfit * 1.2) {
        recommendationText = '🚀 Отличный сценарий! Прибыль выросла более чем на 20%. Рассмотрите возможность увеличения маркетингового бюджета.';
    } else if (scenarioProfit > baseProfit) {
        recommendationText = '📈 Положительная динамика. Продолжайте в том же духе, но следите за расходами.';
    } else if (scenarioProfit > baseProfit * 0.9) {
        recommendationText = '⚠️ Прибыль немного снизилась. Проанализируйте структуру расходов.';
    } else {
        recommendationText = '🔴 Критическое снижение прибыли! Требуется немедленная оптимизация затрат или повышение цен.';
    }
    if (currentScenario.priceChange > 10 && currentScenario.volumeChange < -5) {
        recommendationText += ' Внимание: повышение цены привело к падению продаж. Возможно, стоит пересмотреть ценовую политику.';
    }
    if (currentScenario.expenseGrowth > 20) {
        recommendationText += ' Расходы выросли слишком сильно. Ищите точки оптимизации.';
    }
    
    const recommendationHtml = `<div style="margin-top: 16px; padding: 12px; background: rgba(102,126,234,0.1); border-radius: 12px;"><div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">💡 Рекомендация</div><div style="font-size: 12px; line-height: 1.4;">${recommendationText}</div></div>`;
    
    return `<div class="scenario-container">${slidersHtml}${resultsHtml}${recommendationHtml}</div>`;
}

function initScenarioHandlers(f, totalSalesQuantity, avgCheck, avgCost, costData) {
    const sliders = ['revenueGrowth', 'expenseGrowth', 'ndsGrowth', 'priceChange', 'volumeChange'];
    function updateScenarioDisplay() {
        const scenarioContainer = document.getElementById('scenarioAnalysisContainer');
        if (scenarioContainer) {
            scenarioContainer.innerHTML = renderScenarioAnalysis(f, totalSalesQuantity, avgCheck, avgCost, costData);
            initScenarioHandlers(f, totalSalesQuantity, avgCheck, avgCost, costData);
        }
    }
    sliders.forEach(sliderName => {
        const slider = document.getElementById(`${sliderName}Slider`);
        const valueSpan = document.getElementById(`${sliderName}Value`);
        if (slider) {
            slider.oninput = (e) => {
                const val = parseInt(e.target.value);
                currentScenario[sliderName] = val;
                if (valueSpan) valueSpan.innerHTML = val >= 0 ? `+${val}%` : `${val}%`;
                updateScenarioDisplay();
            };
        }
    });
    const resetBtn = document.getElementById('resetScenarioBtn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            sliders.forEach(sliderName => {
                currentScenario[sliderName] = 0;
                const slider = document.getElementById(`${sliderName}Slider`);
                const valueSpan = document.getElementById(`${sliderName}Value`);
                if (slider) slider.value = '0';
                if (valueSpan) valueSpan.innerHTML = '0%';
            });
            updateScenarioDisplay();
        };
    }
}

// ========================
// АНОМАЛИИ (из монолита)
// ========================

function renderAnomaliesBlock(data, f, totalSalesQuantity, avgCheck) {
    const anomalies = window.detectAnomalies ? window.detectAnomalies(data, f, totalSalesQuantity, avgCheck) : [];
    
    if (anomalies.length === 0) {
        return `<div style="text-align: center; padding: 30px;"><div style="font-size: 48px; margin-bottom: 12px;">✅</div><div style="font-size: 14px; font-weight: 500; color: #48bb78;">Аномалий не обнаружено</div><div style="font-size: 12px; opacity: 0.6; margin-top: 8px;">Все показатели в пределах нормы</div></div>`;
    }
    
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;
    const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
    
    const summaryHtml = `<div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
        ${criticalCount > 0 ? `<div style="background: rgba(245,101,101,0.15); padding: 8px 16px; border-radius: 20px;"><span style="color: #f56565;">🔴</span> Критических: ${criticalCount}</div>` : ''}
        ${highCount > 0 ? `<div style="background: rgba(237,137,54,0.15); padding: 8px 16px; border-radius: 20px;"><span style="color: #ed8936;">🟠</span> Высоких: ${highCount}</div>` : ''}
        ${mediumCount > 0 ? `<div style="background: rgba(237,137,54,0.1); padding: 8px 16px; border-radius: 20px;"><span style="color: #f59e0b;">🟡</span> Средних: ${mediumCount}</div>` : ''}
        <div style="background: rgba(102,126,234,0.1); padding: 8px 16px; border-radius: 20px;">📊 Всего: ${anomalies.length}</div>
    </div>`;
    
    const anomaliesHtml = anomalies.map((anomaly, idx) => {
        let severityIcon = '', severityColor = '', bgColor = '';
        switch (anomaly.severity) {
            case 'critical': severityIcon = '🔴'; severityColor = '#f56565'; bgColor = 'rgba(245,101,101,0.1)'; break;
            case 'high': severityIcon = '🟠'; severityColor = '#ed8936'; bgColor = 'rgba(237,137,54,0.1)'; break;
            case 'medium': severityIcon = '🟡'; severityColor = '#f59e0b'; bgColor = 'rgba(245,158,11,0.1)'; break;
            default: severityIcon = '🔵'; severityColor = '#4299e1'; bgColor = 'rgba(66,153,225,0.1)';
        }
        const expectedText = anomaly.expected ? ` (норма: ${anomaly.type === 'Рентабельность' ? anomaly.expected.toFixed(1) + '%' : formatCurrency(anomaly.expected)})` : '';
        return `<div style="background: ${bgColor}; border-left: 3px solid ${severityColor}; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 20px;">${severityIcon}</span><div><div style="font-weight: 600; font-size: 14px;">${anomaly.type}</div><div style="font-size: 11px; opacity: 0.7;">${anomaly.period}</div></div></div>
                <div style="text-align: right;"><div style="font-weight: 700; font-size: 14px; color: ${severityColor};">${anomaly.type === 'Рентабельность' ? anomaly.value.toFixed(1) + '%' : formatCurrency(anomaly.value)}</div><div style="font-size: 10px; opacity: 0.6;">${expectedText}</div></div>
            </div>
            <div style="font-size: 12px; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(102,126,234,0.1);">${anomaly.message}</div>
        </div>`;
    }).join('');
    
    const statsHtml = `<div style="margin-top: 16px; padding: 12px; background: rgba(102,126,234,0.05); border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div><div style="font-size: 10px; opacity: 0.6;">Обнаружено аномалий</div><div style="font-size: 24px; font-weight: 700; color: #f56565;">${anomalies.length}</div></div>
            <div><div style="font-size: 10px; opacity: 0.6;">Требуют внимания</div><div style="font-size: 24px; font-weight: 700; color: #ed8936;">${criticalCount + highCount}</div></div>
            <div><div style="font-size: 10px; opacity: 0.6;">% аномальных показателей</div><div style="font-size: 24px; font-weight: 700;">${Math.min(100, Math.round((anomalies.length / 20) * 100))}%</div></div>
        </div>
    </div>`;
    
    return `<div class="anomalies-container">${summaryHtml}<div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">${anomaliesHtml}</div>${statsHtml}</div>`;
}

// ========================
// МАТРИЦА 4 КВАДРАНТОВ (из монолита)
// ========================

function renderQuadrantMatrix(data, f) {
    const channels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    const channelData = [];
    let totalRevenue = 0, totalSales = 0;
    
    channels.forEach(channel => {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        const netRevenue = revenue - ndsOut;
        const expenses = data.filter(d => d.канал === channel && d.тип === 'Расход').reduce((sum, d) => sum + Math.abs(d.сумма), 0);
        const profit = netRevenue - expenses;
        const margin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
        
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSalesChannel = sales + salesRef;
        
        if (netRevenue > 0) {
            channelData.push({
                name: channel, margin: margin, sales: totalSalesChannel, netRevenue: netRevenue, profit: profit,
                icon: channel === 'Wildberries' ? '🛍️' : channel === 'Ozon' ? '📦' : channel === 'Детский мир' ? '🧸' : channel === 'Lamoda' ? '👗' : channel === 'Оптовики' ? '📊' : '📁'
            });
            totalRevenue += netRevenue;
            totalSales += totalSalesChannel;
        }
    });
    
    if (channelData.length === 0) return '<div style="text-align: center; padding: 40px;">⚠️ Недостаточно данных для построения матрицы</div>';
    
    const margins = channelData.map(c => c.margin).sort((a, b) => a - b);
    const salesVolumes = channelData.map(c => c.sales).sort((a, b) => a - b);
    const medianMargin = margins[Math.floor(margins.length / 2)];
    const medianSales = salesVolumes[Math.floor(salesVolumes.length / 2)];
    
    channelData.forEach(channel => {
        if (channel.margin >= medianMargin && channel.sales >= medianSales) channel.quadrant = 'golden';
        else if (channel.margin >= medianMargin && channel.sales < medianSales) channel.quadrant = 'premium';
        else if (channel.margin < medianMargin && channel.sales >= medianSales) channel.quadrant = 'workhorse';
        else channel.quadrant = 'problem';
    });
    
    const maxRevenue = Math.max(...channelData.map(c => c.netRevenue));
    
    let matrixHtml = `<div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
            <div style="text-align: center; padding: 8px; background: rgba(102,126,234,0.1); border-radius: 8px;"><span style="font-weight: 600;">📈 Высокая маржинальность</span></div>
            <div style="text-align: center; padding: 8px; background: rgba(102,126,234,0.1); border-radius: 8px;"><span style="font-weight: 600;">📉 Низкая маржинальность</span></div>
        </div>
        <div style="position: relative; min-height: 400px; background: linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%); border-radius: 16px; padding: 20px;">
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(102,126,234,0.3); transform: translateY(-50%);"></div>
            <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(102,126,234,0.3); transform: translateX(-50%);"></div>
            <div style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #667eea; font-weight: 500;">📊 Объем продаж (шт) →</div>
            <div style="position: absolute; left: -25px; top: 50%; transform: translateY(-50%) rotate(-90deg); font-size: 12px; color: #667eea; font-weight: 500;">💰 Маржинальность (%) ↑</div>
            <div style="position: relative; height: 360px;">${channelData.map(channel => {
                let xPercent = 50, yPercent = 50;
                if (channel.sales > 0 && medianSales > 0) {
                    const maxSales = Math.max(...channelData.map(c => c.sales));
                    const minSales = Math.min(...channelData.map(c => c.sales));
                    if (maxSales > minSales) xPercent = ((channel.sales - minSales) / (maxSales - minSales)) * 80 + 10;
                }
                if (channel.margin > 0) {
                    const maxMargin = Math.max(...channelData.map(c => c.margin));
                    const minMargin = Math.min(...channelData.map(c => c.margin));
                    if (maxMargin > minMargin) yPercent = 90 - ((channel.margin - minMargin) / (maxMargin - minMargin)) * 80;
                }
                const size = 30 + (channel.netRevenue / maxRevenue) * 40;
                let bgColor = '', borderColor = '', label = '';
                switch(channel.quadrant) {
                    case 'golden': bgColor = 'rgba(72,187,120,0.9)'; borderColor = '#48bb78'; label = '🏆 Золотые'; break;
                    case 'premium': bgColor = 'rgba(66,153,225,0.9)'; borderColor = '#4299e1'; label = '💎 Премиум'; break;
                    case 'workhorse': bgColor = 'rgba(237,137,54,0.9)'; borderColor = '#ed8936'; label = '🐴 Рабочие'; break;
                    default: bgColor = 'rgba(245,101,101,0.9)'; borderColor = '#f56565'; label = '⚠️ Проблемные';
                }
                return `<div style="position: absolute; left: ${xPercent}%; top: ${yPercent}%; transform: translate(-50%, -50%); cursor: pointer; transition: all 0.3s ease; z-index: 10;">
                    <div style="width: ${size}px; height: ${size}px; background: ${bgColor}; border: 3px solid ${borderColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                        <span style="font-size: ${size * 0.4}px;">${channel.icon}</span>
                    </div>
                    <div style="text-align: center; margin-top: 8px; font-weight: 600; font-size: 12px; background: rgba(0,0,0,0.6); color: white; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">${channel.name}</div>
                </div>`;
            }).join('')}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">
            <div style="background: rgba(72,187,120,0.15); border-left: 3px solid #48bb78; border-radius: 8px; padding: 10px;"><div style="font-size: 12px; font-weight: 600;">🏆 Золотые</div><div style="font-size: 11px; opacity: 0.8;">Высокая маржа + высокие продажи</div><div style="font-size: 11px; margin-top: 4px; color: #48bb78;">${channelData.filter(c => c.quadrant === 'golden').map(c => c.name).join(', ') || '—'}</div></div>
            <div style="background: rgba(66,153,225,0.15); border-left: 3px solid #4299e1; border-radius: 8px; padding: 10px;"><div style="font-size: 12px; font-weight: 600;">💎 Премиум</div><div style="font-size: 11px; opacity: 0.8;">Высокая маржа + низкие продажи</div><div style="font-size: 11px; margin-top: 4px; color: #4299e1;">${channelData.filter(c => c.quadrant === 'premium').map(c => c.name).join(', ') || '—'}</div></div>
            <div style="background: rgba(237,137,54,0.15); border-left: 3px solid #ed8936; border-radius: 8px; padding: 10px;"><div style="font-size: 12px; font-weight: 600;">🐴 Рабочие лошадки</div><div style="font-size: 11px; opacity: 0.8;">Низкая маржа + высокие продажи</div><div style="font-size: 11px; margin-top: 4px; color: #ed8936;">${channelData.filter(c => c.quadrant === 'workhorse').map(c => c.name).join(', ') || '—'}</div></div>
            <div style="background: rgba(245,101,101,0.15); border-left: 3px solid #f56565; border-radius: 8px; padding: 10px;"><div style="font-size: 12px; font-weight: 600;">⚠️ Проблемные</div><div style="font-size: 11px; opacity: 0.8;">Низкая маржа + низкие продажи</div><div style="font-size: 11px; margin-top: 4px; color: #f56565;">${channelData.filter(c => c.quadrant === 'problem').map(c => c.name).join(', ') || '—'}</div></div>
        </div>
        <div style="margin-top: 16px; overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead><tr style="background: rgba(102,126,234,0.1);"><th style="padding: 10px; text-align: left;">Канал</th><th style="padding: 10px; text-align: right;">Маржинальность</th><th style="padding: 10px; text-align: right;">Продажи (шт)</th><th style="padding: 10px; text-align: right;">Выручка</th><th style="padding: 10px; text-align: left;">Стратегия</th></tr></thead>
            <tbody>${channelData.map(channel => {
                let strategy = '', strategyColor = '';
                switch(channel.quadrant) {
                    case 'golden': strategy = '📈 Масштабировать'; strategyColor = '#48bb78'; break;
                    case 'premium': strategy = '🎯 Увеличить продажи'; strategyColor = '#4299e1'; break;
                    case 'workhorse': strategy = '⚡ Оптимизировать затраты'; strategyColor = '#ed8936'; break;
                    default: strategy = '🔍 Требуется анализ'; strategyColor = '#f56565';
                }
                return `<tr style="border-bottom: 1px solid rgba(102,126,234,0.1);">
                    <td style="padding: 10px;"><span style="font-size: 18px; margin-right: 8px;">${channel.icon}</span> ${channel.name}</td>
                    <td style="padding: 10px; text-align: right; font-weight: 600; color: ${channel.margin >= 0 ? '#48bb78' : '#f56565'};">${channel.margin.toFixed(1)}%</td>
                    <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('ru-RU').format(channel.sales)} шт</td>
                    <td style="padding: 10px; text-align: right;">${formatCurrency(channel.netRevenue)}</td>
                    <td style="padding: 10px; color: ${strategyColor};">${strategy}</td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>
        <div style="padding: 16px; background: rgba(102,126,234,0.1); border-radius: 12px;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">💡 Рекомендации</div>
            <div style="font-size: 13px; line-height: 1.5;">${(() => {
                const goldenCount = channelData.filter(c => c.quadrant === 'golden').length;
                const problemCount = channelData.filter(c => c.quadrant === 'problem').length;
                const premiumCount = channelData.filter(c => c.quadrant === 'premium').length;
                const workhorseCount = channelData.filter(c => c.quadrant === 'workhorse').length;
                let recommendations = [];
                if (goldenCount > 0) recommendations.push(`🏆 <strong>${goldenCount} золотых канала</strong> — масштабируйте их, увеличьте маркетинговый бюджет.`);
                if (premiumCount > 0) recommendations.push(`💎 <strong>${premiumCount} премиум канала</strong> — отличная маржа, но низкие продажи. Увеличьте рекламу.`);
                if (workhorseCount > 0) recommendations.push(`🐴 <strong>${workhorseCount} рабочих лошадки</strong> — продажи есть, но низкая маржа. Оптимизируйте себестоимость.`);
                if (problemCount > 0) recommendations.push(`⚠️ <strong>${problemCount} проблемных канала</strong> — срочный анализ! Возможно, стоит закрыть или реструктуризировать.`);
                return recommendations.join('<br>');
            })()}</div>
        </div>
    </div>`;
    
    return matrixHtml;
}

// ========================
// ВОДОПАДНАЯ ДИАГРАММА (из монолита)
// ========================

function renderWaterfallSVG(containerId, f) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const width = container.clientWidth || 600;
    const height = 350;
    const padding = { top: 60, right: 100, bottom: 40, left: 100 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const steps = [
        { name: 'Выручка', value: f.totalRevenue, color: '#4299e1' },
        { name: 'НДС', value: -Math.abs(f.totalNDS), color: '#ed8936' },
        { name: 'Расходы', value: -Math.abs(f.totalExpenses), color: '#f56565' },
        { name: 'Прибыль', value: f.profit, color: f.profit >= 0 ? '#48bb78' : '#f56565' }
    ];
    
    let cumulative = 0;
    steps.forEach(step => { step.cumulative = cumulative + step.value; cumulative = step.cumulative; });
    const maxValue = Math.max(...steps.map(s => Math.abs(s.cumulative)), Math.abs(f.totalRevenue));
    const minValue = Math.min(...steps.map(s => s.cumulative), 0);
    const valueRange = maxValue - minValue;
    const barWidth = (chartWidth - (steps.length - 1) * 10) / steps.length;
    
    let svgHtml = `<svg width="${width}" height="${height}" style="background: transparent; font-family: inherit;">
        <defs><linearGradient id="waterfallGrad1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#4299e1;stop-opacity:0.9"/><stop offset="100%" style="stop-color:#3182ce;stop-opacity:0.7"/></linearGradient>
        <linearGradient id="waterfallGrad2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ed8936;stop-opacity:0.9"/><stop offset="100%" style="stop-color:#dd6b20;stop-opacity:0.7"/></linearGradient>
        <linearGradient id="waterfallGrad3" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#f56565;stop-opacity:0.9"/><stop offset="100%" style="stop-color:#e53e3e;stop-opacity:0.7"/></linearGradient>
        <linearGradient id="waterfallGrad4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#48bb78;stop-opacity:0.9"/><stop offset="100%" style="stop-color:#38a169;stop-opacity:0.7"/></linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter>
    </defs>
    <text x="${width/2}" y="25" text-anchor="middle" font-size="14" font-weight="600" fill="#667eea">💰 От выручки к чистой прибыли</text>`;
    
    steps.forEach((step, i) => {
        const x = padding.left + i * (barWidth + 10);
        const yStart = padding.top + chartHeight - ((step.cumulative - minValue) / valueRange) * chartHeight;
        const yEnd = padding.top + chartHeight - ((step.cumulative - step.value - minValue) / valueRange) * chartHeight;
        const barHeight = Math.abs(yEnd - yStart);
        const y = step.value >= 0 ? yEnd : yStart;
        const gradId = `waterfallGrad${i+1}`;
        svgHtml += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="url(#${gradId})" filter="url(#shadow)"><title>${step.name}: ${formatCurrency(Math.abs(step.value))}</title></rect>`;
        svgHtml += `<text x="${x + barWidth/2}" y="${y + (step.value >= 0 ? -8 : barHeight + 18)}" text-anchor="middle" font-size="11" fill="${step.color}" font-weight="500">${step.value >= 0 ? `+${formatCurrency(step.value)}` : formatCurrency(step.value)}</text>`;
        svgHtml += `<text x="${x + barWidth/2}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#a0aec0">${step.name}</text>`;
        if (i < steps.length - 1) {
            const nextX = padding.left + (i + 1) * (barWidth + 10);
            svgHtml += `<line x1="${x + barWidth}" y1="${yStart}" x2="${nextX}" y2="${yStart}" stroke="#cbd5e0" stroke-width="1.5" stroke-dasharray="4,3"/>`;
        }
    });
    
    svgHtml += `<circle cx="${padding.left + (steps.length-1) * (barWidth + 10) + barWidth/2}" cy="${padding.top + chartHeight - ((steps[steps.length-1].cumulative - minValue) / valueRange) * chartHeight}" r="5" fill="#667eea" stroke="white" stroke-width="2"/>`;
    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
}

// ========================
// ТЕПЛОВАЯ КАРТА (из монолита)
// ========================

function renderHeatmapTable(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const channels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    const monthMap = new Map();
    
    data.forEach(row => {
        if (!row.месяц || !row.год) return;
        const monthIndex = MONTHS_ORDER.indexOf(row.месяц);
        if (monthIndex === -1) return;
        const key = `${row.год}-${monthIndex}`;
        if (!monthMap.has(key)) monthMap.set(key, { year: row.год, month: row.месяц, index: monthIndex, profits: {} });
        const monthData = monthMap.get(key);
        const channel = row.канал;
        if (!channels.includes(channel)) return;
        const revenue = row.тип === 'Доход' ? row.сумма : 0;
        const ndsOut = (row.статья === 'НДС' && row.подканал === 'НДС исходящий') ? row.сумма : 0;
        const expense = row.тип === 'Расход' ? Math.abs(row.сумма) : 0;
        if (!monthData.profits[channel]) monthData.profits[channel] = 0;
        monthData.profits[channel] += revenue - ndsOut - expense;
    });
    
    const sortedMonths = Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.index - b.index;
    });
    
    if (sortedMonths.length < 2) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">⚠️ Недостаточно данных для тепловой карты (нужно минимум 2 месяца)</div>';
        return;
    }
    
    let allProfits = [];
    sortedMonths.forEach(m => { channels.forEach(ch => { const profit = m.profits[ch] || 0; if (profit !== 0) allProfits.push(profit); }); });
    const maxProfit = Math.max(...allProfits, 0);
    const minProfit = Math.min(...allProfits, 0);
    const absMax = Math.max(Math.abs(maxProfit), Math.abs(minProfit));
    
    function getColor(profit) {
        if (profit === 0) return '#2d3748';
        const intensity = Math.min(Math.abs(profit) / absMax, 1);
        if (profit > 0) {
            const r = Math.round(72 - 72 * intensity);
            const g = Math.round(187 + 68 * intensity);
            const b = Math.round(120 - 120 * intensity);
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            const r = Math.round(245 - 100 * intensity);
            const g = Math.round(101 - 60 * intensity);
            const b = Math.round(101 - 60 * intensity);
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    
    let html = `<div style="overflow-x: auto;"><div style="margin-bottom: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #667eea;">🌡️ Прибыль по месяцам и каналам (тыс. ₽)</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;"><thead><tr><th style="padding: 10px 8px; text-align: left; background: rgba(102,126,234,0.15); border-radius: 8px 0 0 0;">Месяц</th>`;
    channels.forEach(ch => { html += `<th style="padding: 10px 8px; text-align: center; background: rgba(102,126,234,0.15);">${ch}</th>`; });
    html += `</tr></thead><tbody>`;
    
    sortedMonths.forEach(month => {
        const monthName = `${month.month} ${month.year}`;
        html += `<tr style="border-bottom: 1px solid rgba(102,126,234,0.1);"><td style="padding: 10px 8px; font-weight: 500; background: rgba(102,126,234,0.08); border-radius: 6px 0 0 6px;">${monthName}</td>`;
        channels.forEach(ch => {
            const profit = month.profits[ch] || 0;
            const color = getColor(profit);
            const displayValue = profit === 0 ? '—' : (profit / 1000).toFixed(0);
            const sign = profit > 0 ? '+' : '';
            html += `<td style="padding: 10px 8px; text-align: center; background: ${color}; color: ${Math.abs(profit) > absMax/2 ? 'white' : '#e2e8f0'}; border-radius: 6px; font-weight: 500;">${profit !== 0 ? sign : ''}${displayValue}</td>`;
        });
        html += `</tr>`;
    });
    
    html += `</tbody></table>
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 12px; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #48bb78; border-radius: 4px;"></div><span>Прибыль</span></div>
            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #f56565; border-radius: 4px;"></div><span>Убыток</span></div>
            <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #2d3748; border-radius: 4px;"></div><span>Ноль</span></div>
        </div>
    </div>`;
    
    container.innerHTML = html;
}

// ========================
// ВКЛАДКИ ВМЕСТО КАРУСЕЛИ
// ========================

function generateTabsPanel() {
    if (!currentData || currentData.length === 0) {
        return '<div class="metric-card" style="padding: 40px; text-align: center;">📊 Нет данных для отображения</div>';
    }
    
    const f = window.calculateFinancials ? window.calculateFinancials(currentData) : { netRevenue: 0, profit: 0, totalExpenses: 1 };
    
    const prevMonths = getPreviousMonths(currentFilters.month || [], 1);
    let prevData = [];
    if (prevMonths.length > 0 && currentFilters.year) {
        let prevYear = parseInt(currentFilters.year);
        if (prevMonths[0] === 'декабрь' && (currentFilters.month || [])[0] === 'январь') prevYear = prevYear - 1;
        prevData = originalData.filter(row => {
            if (currentFilters.company && row.компания !== currentFilters.company) return false;
            if (row.год != prevYear) return false;
            if (!prevMonths.includes(row.месяц)) return false;
            return true;
        });
    }
    
    const fPrev = prevData.length > 0 ? (window.calculateFinancials ? window.calculateFinancials(prevData) : null) : null;
    
    let salesFromArticle = 0, salesFromReference = 0;
    currentData.forEach(d => {
        const article = d.статья?.toLowerCase() || '';
        if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) salesFromArticle += Math.abs(d.сумма || 0);
        if (d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))) salesFromReference += Math.abs(d.сумма || 0);
    });
    const totalSalesQuantity = salesFromArticle + salesFromReference;
    const avgCheck = totalSalesQuantity > 0 ? f.netRevenue / totalSalesQuantity : 0;
    const efficiency = f.profit / (f.totalExpenses || 1);
    
    const netRevenueByChannel = window.calculateNetRevenueByChannel ? window.calculateNetRevenueByChannel(currentData) : [];
    const salesByChannel = calculateSalesByChannel(currentData);
    const avgCheckByChannel = calculateAvgCheckByChannel(currentData);
    
    function getTrendValue(currentValue, previousValue) {
        if (!previousValue || previousValue === 0) return { class: '', html: '' };
        const percent = ((currentValue - previousValue) / previousValue) * 100;
        const isPositive = percent >= 0;
        return { class: isPositive ? 'trend-positive' : 'trend-negative', html: `<span class="trend-arrow">${isPositive ? '↑' : '↓'}</span> <span class="trend-value">${Math.abs(percent).toFixed(1)}%</span>` };
    }
    
    const tabs = [
        { id: 'netRevenue', icon: '💰', title: 'Чистая выручка', value: formatCurrency(f.netRevenue), valueColor: '#48bb78', trend: getTrendValue(f.netRevenue, fPrev?.netRevenue) },
        { id: 'sales', icon: '📦', title: 'Продажи', value: new Intl.NumberFormat('ru-RU').format(totalSalesQuantity) + ' шт', valueColor: '#4299e1', trend: getTrendValue(totalSalesQuantity, fPrev?.totalSalesQuantity) },
        { id: 'avgCheck', icon: '💳', title: 'Средний чек', value: formatCurrency(avgCheck), valueColor: '#9f7aea', trend: getTrendValue(avgCheck, fPrev?.avgCheck) },
        { id: 'efficiency', icon: '⚡', title: 'Эффективность', value: efficiency.toFixed(2) + ' ₽', valueColor: efficiency >= 1 ? '#48bb78' : '#ed8936', trend: getTrendValue(efficiency, fPrev?.efficiency) }
    ];
    
    let tabsHtml = `<div class="modern-tabs-container"><div class="tabs-header" id="tabsHeader">${tabs.map((tab, idx) => `<button class="tab-btn ${idx === 0 ? 'active' : ''}" data-tab="${tab.id}" data-index="${idx}"><span class="tab-icon">${tab.icon}</span><span class="tab-title">${tab.title}</span></button>`).join('')}</div>
        <div class="tabs-content" id="tabsContent">${tabs.map((tab, idx) => `<div class="tab-pane ${idx === 0 ? 'active' : ''}" data-tab="${tab.id}">
            <div class="tab-main-value" style="color: ${tab.valueColor}">${tab.value}</div>${tab.trend.html ? `<div class="tab-trend ${tab.trend.class}">${tab.trend.html} <span style="margin-left: 4px; opacity: 0.7;">к предыдущему периоду</span></div>` : ''}
            <div class="tab-chart-container"><canvas id="tabChart_${tab.id}" style="height: 80px; width: 100%;"></canvas></div>
            <div class="tab-breakdown-header" data-tab="${tab.id}"><span class="breakdown-title">📊 Детализация по каналам</span><span class="breakdown-toggle">▼</span></div>
            <div class="tab-breakdown-content" id="breakdown_${tab.id}">${tab.id === 'netRevenue' ? generateSimpleBreakdown(netRevenueByChannel, 'value', true) : tab.id === 'sales' ? generateSimpleBreakdown(salesByChannel, 'sales', false, ' шт') : tab.id === 'avgCheck' ? generateSimpleBreakdown(avgCheckByChannel, 'avgCheck', true) : generateEfficiencySimpleBreakdown(currentData)}</div>
        </div>`).join('')}</div></div>`;
    
    setTimeout(() => initTabs(), 100);
    return tabsHtml;
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    let activeTabIndex = 0;
    let tabInterval = null;
    
    function switchToTab(index) {
        if (index === activeTabIndex) return;
        tabBtns.forEach((btn, i) => { if (i === index) btn.classList.add('active'); else btn.classList.remove('active'); });
        tabPanes.forEach((pane, i) => { if (i === index) pane.classList.add('active'); else pane.classList.remove('active'); });
        activeTabIndex = index;
        renderTabChart(activeTabIndex);
    }
    
    function startAutoSwitch() { if (tabInterval) clearInterval(tabInterval); tabInterval = setInterval(() => { switchToTab((activeTabIndex + 1) % tabBtns.length); }, 5000); }
    function stopAutoSwitch() { if (tabInterval) { clearInterval(tabInterval); tabInterval = null; } }
    
    tabBtns.forEach((btn, idx) => { btn.addEventListener('click', () => { stopAutoSwitch(); switchToTab(idx); startAutoSwitch(); }); });
    
    const tabsContainer = document.querySelector('.modern-tabs-container');
    if (tabsContainer) { tabsContainer.addEventListener('mouseenter', stopAutoSwitch); tabsContainer.addEventListener('mouseleave', startAutoSwitch); }
    
    document.querySelectorAll('.tab-breakdown-header').forEach(header => {
        header.addEventListener('click', () => {
            const tabId = header.dataset.tab;
            const content = document.getElementById(`breakdown_${tabId}`);
            if (content) {
                if (content.classList.contains('show')) {
                    content.classList.remove('show');
                    header.classList.remove('open');
                } else {
                    content.classList.add('show');
                    header.classList.add('open');
                }
            }
        });
    });
    
    setTimeout(() => { renderTabChart(0); startAutoSwitch(); }, 200);
}

function renderTabChart(index) {
    const tabPanes = document.querySelectorAll('.tab-pane');
    if (!tabPanes[index]) return;
    const tabId = tabPanes[index].dataset.tab;
    const canvas = document.getElementById(`tabChart_${tabId}`);
    if (!canvas) return;
    
    let chartData = [], yAxisLabel = '', formatValue = (val) => val;
    const monthsOrder = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const data = window.currentData || [];
    
    if (tabId === 'netRevenue') {
        const monthly = {};
        for (let i = 0; i < monthsOrder.length; i++) monthly[monthsOrder[i]] = 0;
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d && d.месяц && d.тип === 'Доход') {
                let ndsOut = 0;
                for (let j = 0; j < data.length; j++) {
                    const row = data[j];
                    if (row && row.месяц === d.месяц && row.статья === 'НДС' && row.подканал === 'НДС исходящий') ndsOut += (row.сумма || 0);
                }
                monthly[d.месяц] += (d.сумма || 0) - ndsOut;
            }
        }
        for (let i = 0; i < monthsOrder.length; i++) { if (monthly[monthsOrder[i]] !== 0) { chartData.push(monthly[monthsOrder[i]] / 1000); } }
        yAxisLabel = 'тыс. ₽';
        formatValue = (val) => val.toFixed(0) + 'K';
    } else if (tabId === 'sales') {
        const monthly = {};
        for (let i = 0; i < monthsOrder.length; i++) monthly[monthsOrder[i]] = 0;
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d && d.месяц) {
                const article = (d.статья || '').toLowerCase();
                if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) monthly[d.месяц] += Math.abs(d.сумма || 0);
            }
        }
        for (let i = 0; i < monthsOrder.length; i++) { if (monthly[monthsOrder[i]] !== 0) { chartData.push(monthly[monthsOrder[i]]); } }
        yAxisLabel = 'шт';
        formatValue = (val) => val.toFixed(0);
    } else if (tabId === 'avgCheck') {
        const revenue = {}, sales = {};
        for (let i = 0; i < monthsOrder.length; i++) { revenue[monthsOrder[i]] = 0; sales[monthsOrder[i]] = 0; }
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d && d.месяц) {
                if (d.тип === 'Доход') {
                    let ndsOut = 0;
                    for (let j = 0; j < data.length; j++) {
                        const row = data[j];
                        if (row && row.месяц === d.месяц && row.статья === 'НДС' && row.подканал === 'НДС исходящий') ndsOut += (row.сумма || 0);
                    }
                    revenue[d.месяц] += (d.сумма || 0) - ndsOut;
                }
                const article = (d.статья || '').toLowerCase();
                if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) sales[d.месяц] += Math.abs(d.сумма || 0);
            }
        }
        for (let i = 0; i < monthsOrder.length; i++) { if (revenue[monthsOrder[i]] !== 0 && sales[monthsOrder[i]] !== 0) { chartData.push(revenue[monthsOrder[i]] / sales[monthsOrder[i]]); } }
        yAxisLabel = '₽';
        formatValue = (val) => (val / 1000).toFixed(0) + 'K';
    } else if (tabId === 'efficiency') {
        const monthly = {};
        for (let i = 0; i < monthsOrder.length; i++) monthly[monthsOrder[i]] = { revenue: 0, ndsOut: 0, expenses: 0 };
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d && d.месяц && monthsOrder.includes(d.месяц)) {
                if (d.тип === 'Доход') monthly[d.месяц].revenue += d.сумма || 0;
                if (d.статья === 'НДС' && d.подканал === 'НДС исходящий') monthly[d.месяц].ndsOut += d.сумма || 0;
                if (d.тип === 'Расход') monthly[d.месяц].expenses += Math.abs(d.сумма || 0);
            }
        }
        for (let i = 0; i < monthsOrder.length; i++) {
            const m = monthsOrder[i];
            const netRev = monthly[m].revenue - monthly[m].ndsOut;
            if (netRev !== 0 && monthly[m].expenses !== 0) {
                const profit = netRev - monthly[m].expenses;
                chartData.push(profit / (monthly[m].expenses || 1));
            }
        }
        yAxisLabel = '₽ прибыли';
        formatValue = (val) => val.toFixed(2);
    }
    
    if (chartData.length === 0) return;
    
    const labels = Array.from({ length: chartData.length }, (_, i) => `Месяц ${i+1}`);
    if (window.tabCharts && window.tabCharts[tabId]) { try { window.tabCharts[tabId].destroy(); } catch(e) {} }
    if (!window.tabCharts) window.tabCharts = {};
    const ctx = canvas.getContext('2d');
    window.tabCharts[tabId] = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: chartData, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${yAxisLabel}: ${formatValue(ctx.parsed.y)}` } } }, scales: { x: { display: true, ticks: { font: { size: 10 } } }, y: { display: true, ticks: { font: { size: 10 }, callback: (value) => formatValue(value) } } } }
    });
}

// ========================
// РАЗБИВКИ ДЛЯ ВКЛАДОК
// ========================

function generateSimpleBreakdown(data, valueKey, isCurrency = true, suffix = '') {
    if (!data || data.length === 0) return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    const total = data.reduce((sum, item) => sum + item[valueKey], 0);
    const overallAvg = total / data.length;
    return `<div style="font-size: 12px; font-weight: 600; margin-bottom: 12px; color: #667eea;">📊 АНАЛИЗ ПО КАНАЛАМ</div>
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(102,126,234,0.1); border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div><div style="font-size: 12px;">Общий показатель</div><div style="font-size: 22px; font-weight: 700;">${isCurrency ? formatCurrency(overallAvg) : overallAvg.toFixed(2) + suffix}</div></div>
            </div>
        </div>
        ${data.map((item, idx) => {
            const percent = total > 0 ? (item[valueKey] / total) * 100 : 0;
            const formattedValue = isCurrency ? formatCurrency(item[valueKey]) : item[valueKey].toLocaleString('ru-RU') + suffix;
            const deviation = ((item[valueKey] - overallAvg) / overallAvg) * 100;
            const deviationClass = deviation >= 0 ? 'positive' : 'negative';
            return `<div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span style="font-weight: 600;">${item.name}</span><span style="font-weight: 700;">${formattedValue}</span></div>
                <div style="font-size: 11px; margin-bottom: 4px;"><span class="${deviationClass}">${deviation >= 0 ? '↑' : '↓'} ${Math.abs(deviation).toFixed(1)}%</span><span style="margin-left: 8px;">${percent.toFixed(1)}% доли</span></div>
                <div style="background: #e2e8f0; height: 4px; border-radius: 2px;"><div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 2px;"></div></div>
            </div>`;
        }).join('')}`;
}

function generateEfficiencySimpleBreakdown(data) {
    const efficiencyByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    allChannels.forEach(channel => {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        const expenses = data.filter(d => d.канал === channel && d.тип === 'Расход').reduce((sum, d) => sum + Math.abs(d.сумма), 0);
        const netRevenue = revenue - ndsOut;
        const profit = netRevenue - expenses;
        const efficiency = expenses > 0 ? profit / expenses : 0;
        if (netRevenue > 0 && expenses > 0) efficiencyByChannel.push({ name: channel, efficiency: efficiency });
    });
    if (efficiencyByChannel.length === 0) return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    efficiencyByChannel.sort((a, b) => b.efficiency - a.efficiency);
    const avgEfficiency = efficiencyByChannel.reduce((sum, ch) => sum + ch.efficiency, 0) / efficiencyByChannel.length;
    return `<div style="font-size: 12px; font-weight: 600; margin-bottom: 12px;">📊 ЭФФЕКТИВНОСТЬ ПО КАНАЛАМ</div>
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(102,126,234,0.1); border-radius: 12px;">
            <div><div style="font-size: 12px;">Средняя эффективность</div><div style="font-size: 22px; font-weight: 700;">${avgEfficiency.toFixed(2)} ₽</div><div style="font-size: 10px;">прибыли на 1₽ расходов</div></div>
        </div>
        ${efficiencyByChannel.map(item => `<div style="margin-bottom: 12px;"><div style="display: flex; justify-content: space-between;"><span style="font-weight: 600;">${item.name}</span><span>${item.efficiency.toFixed(2)} ₽</span></div></div>`).join('')}`;
}

function calculateSalesByChannel(data) {
    const salesByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    allChannels.forEach(channel => {
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSales = sales + salesRef;
        if (totalSales > 0) salesByChannel.push({ name: channel, sales: totalSales });
    });
    return salesByChannel.sort((a, b) => b.sales - a.sales);
}

function calculateAvgCheckByChannel(data) {
    const avgCheckByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    allChannels.forEach(channel => {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSales = sales + salesRef;
        const netRevenue = revenue - ndsOut;
        const avgCheck = totalSales > 0 ? netRevenue / totalSales : 0;
        if (avgCheck > 0 && totalSales > 0) avgCheckByChannel.push({ name: channel, avgCheck: avgCheck });
    });
    return avgCheckByChannel.sort((a, b) => b.avgCheck - a.avgCheck);
}

// ========================
// ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРИНГА ДАШБОРДА
// ========================

function renderDashboard() {
    syncGlobalData();
    if (isRendering) { console.log('Рендер уже выполняется'); return; }
    isRendering = true;
    
    try {
        if (!currentData.length) { document.getElementById('dashboardMetrics').innerHTML = '<div class="loading">Нет данных</div>'; isRendering = false; return; }
        
        const f = window.calculateFinancials ? window.calculateFinancials(currentData) : { totalRevenue: 0, netRevenue: 0, totalNDS: 0, totalExpenses: 0, profit: 0, profitability: 0 };
        
        const revenueByChannel = {}, expensesByChannel = {};
        currentData.forEach(d => {
            if (d.тип === 'Доход' && d.канал) {
                if (!revenueByChannel[d.канал]) revenueByChannel[d.канал] = { total: 0, items: {} };
                revenueByChannel[d.канал].total += d.сумма;
                if (d.подканал) revenueByChannel[d.канал].items[d.подканал] = (revenueByChannel[d.канал].items[d.подканал] || 0) + d.сумма;
            }
            if (d.тип === 'Расход' && d.канал) {
                if (!expensesByChannel[d.канал]) expensesByChannel[d.канал] = { total: 0, items: {} };
                const amount = Math.abs(d.сумма);
                expensesByChannel[d.канал].total += amount;
                if (d.подканал) expensesByChannel[d.канал].items[d.подканал] = (expensesByChannel[d.канал].items[d.подканал] || 0) + amount;
            }
        });
        
        const revenueChannelsList = Object.entries(revenueByChannel).filter(([_, data]) => data.total > 0).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => ({ name, total: data.total, items: Object.entries(data.items).map(([itemName, amount]) => ({ name: itemName, amount })) }));
        const expenseChannelsList = Object.entries(expensesByChannel).filter(([_, data]) => data.total > 0).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => ({ name, total: data.total, items: Object.entries(data.items).map(([itemName, amount]) => ({ name: itemName, amount })) }));
        
        let salesFromArticle = 0, salesFromReference = 0;
        currentData.forEach(d => {
            const article = d.статья?.toLowerCase() || '';
            if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) salesFromArticle += Math.abs(d.сумма || 0);
            if (d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))) salesFromReference += Math.abs(d.сумма || 0);
        });
        const totalSalesQuantity = salesFromArticle + salesFromReference;
        const avgCheck = totalSalesQuantity > 0 ? f.netRevenue / totalSalesQuantity : 0;
        
        const monthlyDataMap = new Map();
        const monthsOrder = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
        monthsOrder.forEach(month => monthlyDataMap.set(month, { revenue: 0, profit: 0, expenses: 0 }));
        currentData.forEach(d => {
            if (d.месяц && monthsOrder.includes(d.месяц)) {
                const monthData = monthlyDataMap.get(d.месяц);
                if (d.тип === 'Доход') monthData.revenue += d.сумма;
                if (d.тип === 'Расход') monthData.expenses += Math.abs(d.сумма);
            }
        });
        monthlyDataMap.forEach((data, month) => {
            const ndsOut = currentData.filter(d => d.месяц === month && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
            const netRev = data.revenue - ndsOut;
            data.profit = netRev - data.expenses;
            data.netRevenue = netRev;
        });
        
        const monthlyLabels = monthsOrder.filter(m => monthlyDataMap.get(m).revenue > 0 || monthlyDataMap.get(m).profit !== 0);
        const monthlyRevenues = monthlyLabels.map(m => monthlyDataMap.get(m).revenue / 1000);
        const monthlyExpensesArray = monthlyLabels.map(m => (monthlyDataMap.get(m)?.expenses || 0) / 1000);
        
        function getChangePercent(current, previous) {
            if (!previous || previous === 0) return null;
            const change = ((current - previous) / previous) * 100;
            return { percent: change, isPositive: change >= 0, formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%` };
        }
        
        const prevMonths = getPreviousMonths(currentFilters.month || [], 1);
        let prevData = [];
        if (prevMonths.length > 0 && currentFilters.year) {
            let prevYear = parseInt(currentFilters.year);
            if (prevMonths[0] === 'декабрь' && (currentFilters.month || [])[0] === 'январь') prevYear = prevYear - 1;
            prevData = originalData.filter(row => {
                if (currentFilters.company && row.компания !== currentFilters.company) return false;
                if (row.год != prevYear) return false;
                if (!prevMonths.includes(row.месяц)) return false;
                return true;
            });
        }
        const fPrev = prevData.length > 0 ? (window.calculateFinancials ? window.calculateFinancials(prevData) : null) : null;
        
        const revenueChange = fPrev ? getChangePercent(f.totalRevenue, fPrev.totalRevenue) : null;
        const netRevenueChange = fPrev ? getChangePercent(f.netRevenue, fPrev.netRevenue) : null;
        const expensesChange = fPrev ? getChangePercent(f.totalExpenses, fPrev.totalExpenses) : null;
        const profitChange = fPrev ? getChangePercent(f.profit, fPrev.profit) : null;
        const ndsChange = fPrev ? getChangePercent(f.totalNDS, fPrev.totalNDS) : null;
        
        let costData = currentData.filter(d => d.тип === 'Расход' && d.подканал === 'Себестоимость сырья').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const avgCost = totalSalesQuantity > 0 ? costData / totalSalesQuantity : 0;
        
        const monthlyNds = {};
        monthsOrder.forEach(month => monthlyNds[month] = 0);
        currentData.forEach(d => {
            if (d.месяц && monthsOrder.includes(d.месяц)) {
                if (d.статья === 'НДС' && d.подканал === 'НДС исходящий') monthlyNds[d.месяц] += d.сумма;
                else if (d.статья === 'НДС' && d.подканал === 'НДС входящий') monthlyNds[d.месяц] -= d.сумма;
            }
        });
        const ndsLabels = monthlyLabels;
        const ndsValues = ndsLabels.map(m => monthlyNds[m] || 0);
        const revenueForNds = ndsLabels.map(m => monthlyDataMap.get(m)?.revenue || 0);
        const totalNdsAmount = f.totalNDS;
        const totalRevenueAmount = f.totalRevenue;
        const totalNdsPercent = totalRevenueAmount > 0 ? (Math.abs(totalNdsAmount) / totalRevenueAmount) * 100 : 0;
        
        let healthStatus = { color: '#48bb78', text: 'Отлично', icon: '🚀' };
        let recommendations = [];
        if (f.profit < 0) { healthStatus = { color: '#f56565', text: 'Критично', icon: '🔴' }; recommendations.push('⚠️ Компания убыточна! Срочно оптимизируйте расходы.'); }
        else if (f.profitability < 10) { healthStatus = { color: '#ed8936', text: 'Требует внимания', icon: '⚠️' }; recommendations.push('📉 Низкая рентабельность (<10%). Пересмотрите ценообразование.'); }
        else if (f.profitability < 20) { healthStatus = { color: '#f59e0b', text: 'Средняя', icon: '📊' }; recommendations.push('📈 Рентабельность можно улучшить. Оптимизируйте затраты.'); }
        else { recommendations.push('✅ Отличная рентабельность! Масштабируйте успешные каналы.'); }
        if (avgCheck < 1000 && avgCheck > 0) recommendations.push('💰 Средний чек ниже 1000₽. Работайте над апселлингом.');
        else if (avgCheck > 5000) recommendations.push('💎 Высокий средний чек. Удерживайте качество обслуживания.');
        
        const efficiency = f.profit / (f.totalExpenses || 1);
        const revenueByChannelMap = {};
        currentData.forEach(d => { if (d.тип === 'Доход' && d.канал) revenueByChannelMap[d.канал] = (revenueByChannelMap[d.канал] || 0) + d.сумма; });
        const topChannelData = Object.entries(revenueByChannelMap).sort((a, b) => b[1] - a[1])[0];
        
        const topPanelHtml = `<div style="margin-bottom: 24px;"><div class="metrics-grid" style="margin-bottom: 20px;"><div class="metric-card" style="grid-column: span 4; padding: 20px;">
            <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;"><span style="font-size: 18px;">📊</span><span style="font-size: 14px; font-weight: 600; color: #667eea;">СОСТОЯНИЕ КОМПАНИИ</span></div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;"><div style="text-align: center; min-width: 100px;"><div style="font-size: 36px;">${healthStatus.icon}</div><div style="font-size: 11px; opacity: 0.7;">Статус</div><div style="font-size: 18px; font-weight: 700; color: ${healthStatus.color};">${healthStatus.text}</div></div>
                <div style="width: 1px; height: 50px; background: rgba(102,126,234,0.2);"></div>
                <div><div style="font-size: 11px; opacity: 0.7; margin-bottom: 6px;">💡 Ключевые рекомендации</div><div style="font-size: 13px; line-height: 1.4;">${recommendations[0] || 'Анализ данных в норме'}</div>${recommendations[1] ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 6px;">${recommendations[1]}</div>` : ''}</div></div>
                <div style="text-align: right;"><div style="font-size: 11px; opacity: 0.7;">Период анализа</div><div style="font-size: 14px; font-weight: 600;">${currentFilters.year || 'год'} ${currentFilters.month?.length ? currentFilters.month.join(', ') : 'все месяцы'}</div></div>
            </div>
        </div></div></div>`;
        
        function createCollapsibleBlock(title, icon, total, totalChange, channels, isExpense = false, monthlyDataMap = null, monthlyLabelsParam = null, monthlyValues = null, totalRevenue = null) {
            const channelItemsHtml = channels.map((channel, channelIdx) => {
                const channelPercent = (channel.total / total) * 100;
                const sortedItems = [...channel.items].sort((a, b) => b.amount - a.amount);
                const itemsHtml = sortedItems.map((item, itemIdx) => {
                    const itemPercentOfChannel = (item.amount / channel.total) * 100;
                    const gradient = isExpense ? 'linear-gradient(90deg, #f56565, #ed8936)' : 'linear-gradient(90deg, #48bb78, #8dd934)';
                    return `<div class="sub-item" style="margin-bottom: 12px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${itemIdx * 0.03}s;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;"><span style="font-size: 13px; font-weight: 500;">${item.name}</span><div style="display: flex; gap: 12px;"><span style="font-size: 13px; font-weight: 600;">${formatCurrency(item.amount)}</span></div></div>
                        <div style="background: rgba(102,126,234,0.15); height: 6px; border-radius: 3px; overflow: hidden;"><div class="sub-progress-bar" style="width: ${itemPercentOfChannel}%; height: 100%; background: ${gradient}; border-radius: 3px;"></div></div>
                    </div>`;
                }).join('');
                const channelGradient = isExpense ? 'linear-gradient(90deg, #f56565, #ed8936)' : 'linear-gradient(90deg, #48bb78, #8dd934)';
                return `<div class="channel-item" data-channel-name="${channel.name}" style="margin-bottom: 20px; border-bottom: 1px solid rgba(102,126,234,0.2); padding-bottom: 16px;">
                    <div class="channel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 10px;"><span class="channel-icon" style="font-size: 20px;">${getChannelIcon(channel.name)}</span><span style="font-weight: 700; font-size: 15px;">${channel.name}</span></div>
                        <div style="display: flex; align-items: center; gap: 12px;"><span class="channel-total" style="font-size: 14px; font-weight: 600;">${formatCurrency(channel.total)}</span><span class="expand-icon" style="font-size: 14px; transition: transform 0.3s; cursor: pointer;">▶</span></div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; margin-bottom: 12px; overflow: hidden;"><div class="channel-progress-bar" style="width: ${channelPercent}%; height: 100%; background: ${channelGradient}; border-radius: 4px;"></div></div>
                    <div class="channel-details" style="max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);"><div style="padding-top: 12px; padding-left: 30px;">${itemsHtml}</div></div>
                </div>`;
            }).join('');
            const chartHtml = (monthlyValues && monthlyValues.length > 0) ? `<div class="revenue-chart-wrapper" style="margin-top: 16px;"><canvas id="${isExpense ? 'expenseMiniChartNew' : 'revenueMiniChartNew'}" style="height: 100px; width: 100%; display: block;"></canvas></div>` : '';
            return `<div class="metric-card" style="overflow: hidden; padding: 20px; height: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;"><div class="metric-title" style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 20px;">${icon}</span><span style="font-size: 16px; font-weight: 700;">${title}</span></div>
                <button class="toggle-channels-${isExpense ? 'expense' : 'revenue'}-btn" style="background: rgba(102,126,234,0.15); border: none; border-radius: 20px; padding: 4px 12px; font-size: 11px; color: #667eea; cursor: pointer;"><span class="toggle-icon-main">▶</span> Показать каналы</button></div>
                <div style="margin-bottom: 20px;"><div class="metric-value" style="font-size: 32px;">${formatCurrency(total)}</div>${getChangeHtml(totalChange, isExpense)}</div>
                <div class="channels-${isExpense ? 'expense' : 'revenue'}-container" style="max-height: 0; opacity: 0; overflow-y: auto; transition: max-height 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;">${channelItemsHtml}<button class="toggle-all-channels-btn" style="margin-top: 16px; background: none; border: none; color: #667eea; cursor: pointer;"><span>▶</span> Раскрыть подканалы</button></div>
                ${chartHtml}
            </div>`;
        }
        
        const revenueHtml = createCollapsibleBlock('Доходы по каналам', '💰', f.totalRevenue, revenueChange, revenueChannelsList, false, monthlyDataMap, monthlyLabels, monthlyRevenues, null);
        const expensesHtml = createCollapsibleBlock('Расходы по каналам', '📉', f.totalExpenses, expensesChange, expenseChannelsList, true, monthlyDataMap, monthlyLabels, monthlyExpensesArray, f.totalRevenue);
        const tabsPanel = generateTabsPanel();
        
        const dashboardHtml = `${topPanelHtml}<div class="dashboard-two-columns"><div class="dashboard-col">${revenueHtml}</div><div class="dashboard-col">${tabsPanel}</div></div><div class="dashboard-full-width">${expensesHtml}</div>`;
        document.getElementById('dashboardMetrics').innerHTML = dashboardHtml;
        
        setTimeout(() => {
            renderMiniChartJS('revenueMiniChartNew', monthlyLabels, monthlyRevenues, '#48bb78');
            renderExpenseMiniChartJS('expenseMiniChartNew', monthlyLabels, monthlyExpensesArray, '#f56565');
            renderNetRevenueMiniChart();
            renderProfitMiniChart();
        }, 100);
        
        // Дополнительные блоки (водопад, тепловая карта, сценарный анализ, аномалии, матрица)
        let waterfallContainer = document.getElementById('waterfallChartContainer');
        let heatmapContainer = document.getElementById('heatmapContainer');
        if (!waterfallContainer && document.getElementById('dashboardMetrics')) {
            const newSection = document.createElement('div'); newSection.id = 'newChartsSection'; newSection.className = 'metrics-grid'; newSection.style.marginTop = '24px';
            newSection.innerHTML = `<div class="metric-card" style="grid-column: span 2; padding: 20px;"><div id="waterfallChartContainer" style="height: 380px; width: 100%;"></div></div><div class="metric-card" style="grid-column: span 2; padding: 20px;"><div id="heatmapContainer" style="min-height: 300px;"></div></div>`;
            document.getElementById('dashboardMetrics').appendChild(newSection);
            waterfallContainer = document.getElementById('waterfallChartContainer'); heatmapContainer = document.getElementById('heatmapContainer');
        }
        if (waterfallContainer) renderWaterfallSVG('waterfallChartContainer', f);
        if (heatmapContainer) renderHeatmapTable('heatmapContainer', currentData);
        
        let scenarioContainer = document.getElementById('scenarioAnalysisContainer');
        if (!scenarioContainer && document.getElementById('dashboardMetrics')) {
            const scenarioSection = document.createElement('div'); scenarioSection.id = 'scenarioSection'; scenarioSection.className = 'metrics-grid'; scenarioSection.style.marginTop = '24px';
            scenarioSection.innerHTML = `<div class="metric-card" style="grid-column: span 4; padding: 20px;"><div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;"><span style="font-size: 20px;">🎯</span><span>Сценарный анализ</span><span style="font-size: 11px; color: #a0aec0; margin-left: auto;">двигайте ползунки — результаты меняются в реальном времени</span></div><div id="scenarioAnalysisContainer"></div></div>`;
            document.getElementById('dashboardMetrics').appendChild(scenarioSection);
            scenarioContainer = document.getElementById('scenarioAnalysisContainer');
        }
        if (scenarioContainer) {
            scenarioContainer.innerHTML = renderScenarioAnalysis(f, totalSalesQuantity, avgCheck, avgCost, costData);
            initScenarioHandlers(f, totalSalesQuantity, avgCheck, avgCost, costData);
        }
        
        let anomaliesContainer = document.getElementById('anomaliesContainer');
        if (!anomaliesContainer && document.getElementById('dashboardMetrics')) {
            const anomaliesSection = document.createElement('div'); anomaliesSection.id = 'anomaliesSection'; anomaliesSection.className = 'metrics-grid'; anomaliesSection.style.marginTop = '24px';
            anomaliesSection.innerHTML = `<div class="metric-card" style="grid-column: span 4; padding: 20px;"><div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;"><span style="font-size: 20px;">🔍</span><span>Аномалии и выбросы</span><span style="font-size: 11px; color: #a0aec0; margin-left: auto;">автоматическое обнаружение отклонений</span></div><div id="anomaliesContainer"></div></div>`;
            document.getElementById('dashboardMetrics').appendChild(anomaliesSection);
            anomaliesContainer = document.getElementById('anomaliesContainer');
        }
        if (anomaliesContainer) anomaliesContainer.innerHTML = renderAnomaliesBlock(currentData, f, totalSalesQuantity, avgCheck);
        
        let quadrantContainer = document.getElementById('quadrantMatrixContainer');
        if (!quadrantContainer && document.getElementById('dashboardMetrics')) {
            const quadrantSection = document.createElement('div'); quadrantSection.id = 'quadrantSection'; quadrantSection.className = 'metrics-grid'; quadrantSection.style.marginTop = '24px';
            quadrantSection.innerHTML = `<div class="metric-card" style="grid-column: span 4; padding: 20px;"><div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;"><span style="font-size: 20px;">🎯</span><span>Матрица "Маржинальность vs Оборачиваемость"</span><span style="font-size: 11px; color: #a0aec0; margin-left: auto;">4 квадранта стратегии</span></div><div id="quadrantMatrixContainer"></div></div>`;
            document.getElementById('dashboardMetrics').appendChild(quadrantSection);
            quadrantContainer = document.getElementById('quadrantMatrixContainer');
        }
        if (quadrantContainer) quadrantContainer.innerHTML = renderQuadrantMatrix(currentData, f);
        
        // Обработчики для коллапсируемых блоков
        setTimeout(() => {
            const toggleRevenueBtn = document.querySelector('.toggle-channels-revenue-btn');
            const revenueContainer = document.querySelector('.channels-revenue-container');
            if (toggleRevenueBtn && revenueContainer) {
                toggleRevenueBtn.onclick = () => {
                    if (revenueContainer.style.maxHeight !== '0px') {
                        revenueContainer.style.maxHeight = '0'; revenueContainer.style.opacity = '0';
                        toggleRevenueBtn.innerHTML = '<span class="toggle-icon-main">▶</span> Показать каналы';
                    } else {
                        revenueContainer.style.maxHeight = revenueContainer.scrollHeight + 'px'; revenueContainer.style.opacity = '1';
                        toggleRevenueBtn.innerHTML = '<span class="toggle-icon-main">▼</span> Скрыть каналы';
                    }
                };
            }
            const toggleExpenseBtn = document.querySelector('.toggle-channels-expense-btn');
            const expenseContainer = document.querySelector('.channels-expense-container');
            if (toggleExpenseBtn && expenseContainer) {
                toggleExpenseBtn.onclick = () => {
                    if (expenseContainer.style.maxHeight !== '0px') {
                        expenseContainer.style.maxHeight = '0'; expenseContainer.style.opacity = '0';
                        toggleExpenseBtn.innerHTML = '<span class="toggle-icon-main">▶</span> Показать каналы';
                    } else {
                        expenseContainer.style.maxHeight = expenseContainer.scrollHeight + 'px'; expenseContainer.style.opacity = '1';
                        toggleExpenseBtn.innerHTML = '<span class="toggle-icon-main">▼</span> Скрыть каналы';
                    }
                };
            }
            const toggleAllSubChannelsBtns = document.querySelectorAll('.toggle-all-channels-btn');
            toggleAllSubChannelsBtns.forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const container = btn.closest('.channels-revenue-container, .channels-expense-container');
                    if (!container) return;
                    const allDetailsDivs = container.querySelectorAll('.channel-details');
                    const allExpandIcons = container.querySelectorAll('.expand-icon');
                    const allOpen = Array.from(allDetailsDivs).every(details => details.style.maxHeight && details.style.maxHeight !== '0px');
                    if (allOpen) {
                        allDetailsDivs.forEach(details => details.style.maxHeight = '0');
                        allExpandIcons.forEach(icon => icon.style.transform = 'rotate(0deg)');
                        btn.innerHTML = '<span>▶</span> Раскрыть подканалы';
                    } else {
                        allDetailsDivs.forEach(details => details.style.maxHeight = details.scrollHeight + 'px');
                        allExpandIcons.forEach(icon => icon.style.transform = 'rotate(90deg)');
                        btn.innerHTML = '<span>▼</span> Скрыть подканалы';
                        allDetailsDivs.forEach((details, idx) => {
                            const items = details.querySelectorAll('.sub-item');
                            items.forEach((item, itemIdx) => { setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, idx * 50 + itemIdx * 30); });
                        });
                    }
                };
            });
            document.querySelectorAll('.channel-header').forEach(header => {
                const channelDiv = header.closest('.channel-item');
                const detailsDiv = channelDiv.querySelector('.channel-details');
                const expandIcon = header.querySelector('.expand-icon');
                header.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (detailsDiv.style.maxHeight && detailsDiv.style.maxHeight !== '0px') {
                        detailsDiv.style.maxHeight = '0';
                        if (expandIcon) expandIcon.style.transform = 'rotate(0deg)';
                    } else {
                        detailsDiv.style.maxHeight = detailsDiv.scrollHeight + 'px';
                        if (expandIcon) expandIcon.style.transform = 'rotate(90deg)';
                        const items = detailsDiv.querySelectorAll('.sub-item');
                        items.forEach((item, idx) => { setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, idx * 30); });
                    }
                });
            });
        }, 200);
        
    } catch(e) { console.error('Ошибка рендера:', e); }
    finally { isRendering = false; }
}

// ========================
// СТРАНИЦА КАНАЛА
// ========================

function renderChannelPage(channelKey) {
    const channel = window.CHANNEL_MAPPING ? window.CHANNEL_MAPPING[channelKey] : null;
    if (!channel) return;
    const f = window.calculateFinancials ? window.calculateFinancials(currentData, channelKey) : { totalRevenue: 0, netRevenue: 0, totalNDS: 0, totalExpenses: 0, profit: 0, profitability: 0 };
    let sales = currentData.filter(d => d.канал === channel.displayName && d.статья === 'Продажи шт.').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    let costData = currentData.filter(d => d.канал === channel.displayName && d.тип === 'Расход' && d.подканал === 'Себестоимость сырья').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    const avgCheck = sales > 0 ? f.netRevenue / sales : 0;
    const avgCost = sales > 0 ? costData / sales : 0;
    const container = document.getElementById(`channel${channelKey.charAt(0).toUpperCase() + channelKey.slice(1)}Metrics`);
    if (container) {
        container.innerHTML = `<div class="metrics-grid"><div class="metric-card"><div class="metric-title">💰 Выручка (с НДС)</div><div class="metric-value">${formatCurrency(f.totalRevenue)}</div></div>
            <div class="metric-card"><div class="metric-title">💸 НДС</div><div class="metric-value">${formatCurrency(f.totalNDS)}</div></div>
            <div class="metric-card"><div class="metric-title">📊 Выручка чистая</div><div class="metric-value">${formatCurrency(f.netRevenue)}</div></div>
            <div class="metric-card"><div class="metric-title">📉 Расходы</div><div class="metric-value">${formatCurrency(f.totalExpenses)}</div></div>
            <div class="metric-card"><div class="metric-title">📈 Прибыль</div><div class="metric-value ${f.profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(f.profit)}</div></div>
            <div class="metric-card"><div class="metric-title">📊 Рентабельность</div><div class="metric-value">${f.profitability.toFixed(1)}%</div></div>
        </div><div class="metrics-grid" style="margin-top:20px">
            <div class="metric-card"><div class="metric-title">📦 Продажи (шт)</div><div class="metric-value">${new Intl.NumberFormat('ru-RU').format(sales)}</div></div>
            <div class="metric-card"><div class="metric-title">💰 Средний чек</div><div class="metric-value">${formatCurrency(avgCheck)}</div></div>
            <div class="metric-card"><div class="metric-title">🏭 Себестоимость</div><div class="metric-value">${formatCurrency(costData)}</div></div>
            <div class="metric-card"><div class="metric-title">📊 Себестоимость 1 шт</div><div class="metric-value">${formatCurrency(avgCost)}</div></div>
        </div>`;
    }
}

// Экспортируем в window
window.renderDashboard = renderDashboard;
window.renderChannelPage = renderChannelPage;

console.log('✅ dashboardRender.js: все функции загружены');
