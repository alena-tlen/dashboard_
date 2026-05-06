// ========================
// dashboardRender.js - ПОЛНАЯ ОТРИСОВКА ДАШБОРДА
// ========================

// Глобальные переменные для графиков
let revenueChart = null;
let miniRevenueChart = null;
let miniExpenseChart = null;
let netRevenueMiniChart = null;
let profitMiniChart = null;
let isRendering = false;

// Синхронизация глобальных данных
function syncGlobalData() {
    window.originalData = window.originalData || [];
    window.currentData = window.currentData || [];
    window.currentFilters = window.currentFilters || { company: '', year: '', month: [], channel: '' };
}

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

function formatCurrency(value) {
    if (value === undefined || value === null) return '0 ₽';
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
// ФУНКЦИЯ ДЛЯ ПОКАЗА УВЕДОМЛЕНИЙ
// ========================

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
    notification.innerHTML = `<span style="font-size: 20px;">${style.icon}</span><span>${message}</span><span style="margin-left: 8px; opacity: 0.7; font-size: 12px;">×</span>`;
    
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
// МИНИ-ГРАФИКИ (CHART.JS)
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
        data: { 
            labels: labels, 
            datasets: [{ 
                data: data, 
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
        data: { 
            labels: labels, 
            datasets: [{ 
                data: data, 
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
        data: { 
            labels: labels, 
            datasets: [{ 
                data: values, 
                borderColor: lineColor, 
                backgroundColor: areaColor, 
                borderWidth: 2, 
                pointRadius: 0, 
                pointHoverRadius: 5, 
                tension: 0.4, 
                fill: true 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true, 
            plugins: { legend: { display: false }, tooltip: { enabled: false } }, 
            scales: { x: { display: false }, y: { display: false } } 
        }
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
        data: { 
            labels: labels, 
            datasets: [{ 
                data: values, 
                borderColor: lineColor, 
                backgroundColor: areaColor, 
                borderWidth: 2, 
                pointRadius: 0, 
                pointHoverRadius: 5, 
                tension: 0.4, 
                fill: true 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true, 
            plugins: { legend: { display: false }, tooltip: { enabled: false } }, 
            scales: { x: { display: false }, y: { display: false } } 
        }
    });
}

function renderMonthlyLineChart(labels, revenues) {
    const canvas = document.getElementById('monthlyRevenueChart');
    if (!canvas) return;
    if (window.monthlyLineChart) { try { window.monthlyLineChart.destroy(); } catch(e) {} window.monthlyLineChart = null; }
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    const textColor = isDarkMode ? '#e2e8f0' : '#4a5568';
    
    window.monthlyLineChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: labels, 
            datasets: [{ 
                label: 'Выручка (тыс. ₽)', 
                data: revenues, 
                borderColor: '#48bb78', 
                backgroundColor: 'rgba(72,187,120,0.1)', 
                borderWidth: 3, 
                pointRadius: 4, 
                pointHoverRadius: 8, 
                pointBackgroundColor: '#48bb78',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                fill: true, 
                tension: 0.4 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true, 
            plugins: { 
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: '#48bb78',
                    borderWidth: 1,
                    callbacks: { label: function(context) { return `💰 ${context.parsed.y.toFixed(0)} тыс. ₽`; } }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11, weight: '500' }, maxRotation: 45, minRotation: 45 } },
                y: { grid: { color: isDarkMode ? '#2d3748' : '#e2e8f0' }, ticks: { color: textColor } }
            }
        }
    });
}

function renderSalesChart(labels, salesData) {
    const canvas = document.getElementById('salesChart');
    if (!canvas || !labels || labels.length === 0 || !salesData || salesData.length === 0) return;
    if (window.salesChart) { try { window.salesChart.destroy(); } catch(e) {} window.salesChart = null; }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    const maxSales = Math.max(...salesData);
    const minSales = Math.min(...salesData);
    
    const createGradient = (colorStart, colorEnd, colorMiddle = null) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, colorStart);
        if (colorMiddle) gradient.addColorStop(0.5, colorMiddle);
        gradient.addColorStop(1, colorEnd);
        return gradient;
    };
    
    const gradients = salesData.map((value) => {
        if (value === maxSales && maxSales > 0) {
            return createGradient('#6ee7b7', '#48bb78', '#38a169');
        } else if (value === minSales && salesData.length > 1 && minSales !== maxSales) {
            return createGradient('#fc8181', '#f56565', '#e53e3e');
        } else {
            return createGradient('#93c5fd', '#60a5fa', '#3b82f6');
        }
    });
    
    window.salesChart = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: labels, 
            datasets: [{ 
                label: 'Продажи (шт)', 
                data: salesData, 
                backgroundColor: gradients, 
                borderColor: '#ffffff',
                borderWidth: 1,
                borderRadius: 10,
                barPercentage: 0.7,
                categoryPercentage: 0.85
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true, 
            plugins: { 
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                    titleColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    bodyColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) { return context[0].label; },
                        label: function(context) { return `📦 Продажи: ${context.parsed.y.toFixed(0)} шт`; },
                        afterBody: function(context) {
                            const value = context[0].parsed.y;
                            if (value === maxSales && maxSales > 0) return '🏆 Лучший месяц! 🎉';
                            if (value === minSales && salesData.length > 1 && minSales !== maxSales) return '⚠️ Худший месяц. Требуется анализ.';
                            return '';
                        }
                    }
                }
            },
            scales: { x: { display: false }, y: { display: false } },
            layout: { padding: { top: 15, bottom: 5, left: 5, right: 5 } },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });
}

function renderNdsToRevenueChart(labels, ndsValues, revenueValues) {
    const canvas = document.getElementById('ndsToRevenueChart');
    if (!canvas) return;
    if (window.ndsToRevenueChart) { try { window.ndsToRevenueChart.destroy(); } catch(e) {} window.ndsToRevenueChart = null; }
    
    const isDarkMode = document.body.classList.contains('dark');
    const ndsPercentages = ndsValues.map((nds, idx) => { const revenue = revenueValues[idx] || 0; return revenue > 0 ? (Math.abs(nds) / revenue) * 100 : 0; });
    const barColors = ndsPercentages.map(percent => {
        if (percent > 20) return '#f56565';
        if (percent > 15) return '#ed8936';
        if (percent > 10) return '#fbbf24';
        return '#48bb78';
    });
    
    const ctx = canvas.getContext('2d');
    window.ndsToRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: labels, 
            datasets: [{ 
                label: 'НДС (% от чистой выручки)', 
                data: ndsPercentages, 
                backgroundColor: barColors,
                borderColor: barColors,
                borderRadius: 10,
                barPercentage: 0.65,
                categoryPercentage: 0.8,
                borderWidth: 1
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true, 
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                    titleColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    bodyColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const idx = context.dataIndex;
                            const percent = context.parsed.y;
                            const nds = ndsValues[idx];
                            const netRevenue = revenueValues[idx];
                            return [`📊 НДС: ${percent.toFixed(1)}% от чистой выручки`, `💰 НДС: ${formatCurrency(Math.abs(nds))}`, `📈 Чистая выручка: ${formatCurrency(netRevenue)}`];
                        }
                    }
                }
            },
            scales: { 
                x: { ticks: { color: isDarkMode ? '#e2e8f0' : '#4a5568', maxRotation: 45, minRotation: 45 }, grid: { display: false } },
                y: { title: { display: true, text: 'НДС (% от чистой выручки)', color: isDarkMode ? '#e2e8f0' : '#4a5568', font: { size: 10 } }, ticks: { color: isDarkMode ? '#e2e8f0' : '#4a5568', callback: (value) => value + '%' }, grid: { color: isDarkMode ? '#2d3748' : '#e2e8f0' }, min: 0, max: 30 }
            },
            layout: { padding: { top: 10, bottom: 10, left: 5, right: 5 } },
            animation: { duration: 1000, easing: 'easeOutQuart' }
        }
    });
}

function renderNdsStatsCard(ndsPercent, ndsAmount, revenue) {
    const container = document.getElementById('ndsStatsCard');
    if (!container) return;
    
    let status = { color: '#48bb78', text: 'Оптимально', icon: '✅', recommendation: 'Нормальная налоговая нагрузка. Хороший показатель!' };
    if (ndsPercent > 20) status = { color: '#f56565', text: 'Критично', icon: '🔴', recommendation: 'Срочно оптимизируйте налоги! Рассмотрите возможность увеличения входящего НДС через закупки у плательщиков НДС.' };
    else if (ndsPercent > 15) status = { color: '#ed8936', text: 'Высокая', icon: '⚠️', recommendation: 'Высокая налоговая нагрузка. Проверьте возможность применения налоговых вычетов и работу с поставщиками на ОСНО.' };
    else if (ndsPercent > 10) status = { color: '#fbbf24', text: 'Средняя', icon: '📊', recommendation: 'Средний уровень. Можно оптимизировать через увеличение входящего НДС.' };
    else if (ndsPercent > 5) status = { color: '#48bb78', text: 'Низкая', icon: '✅', recommendation: 'Хороший показатель! Поддерживайте текущий уровень.' };
    else status = { color: '#48bb78', text: 'Минимальная', icon: '🎯', recommendation: 'Отличный результат! Вы эффективно управляете налоговой нагрузкой.' };
    
    container.innerHTML = `<div class="nds-stats-card" style="background: ${status.color}15; border-radius: 16px; padding: 14px; margin-top: 16px; border: 1px solid ${status.color}30;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
            <div style="font-size: 32px;">${status.icon}</div>
            <div><div style="font-size: 13px; font-weight: 600; color: ${status.color};">${status.text} нагрузка</div><div style="font-size: 22px; font-weight: 700;">${ndsPercent.toFixed(1)}%</div></div>
            <div style="margin-left: auto; text-align: right;"><div style="font-size: 10px; opacity: 0.7;">НДС / Выручка</div><div style="font-size: 12px; font-weight: 500;">${formatCurrency(Math.abs(ndsAmount))} / ${formatCurrency(revenue)}</div></div>
        </div>
        <div style="background: rgba(0,0,0,0.05); border-radius: 8px; padding: 10px; font-size: 12px; line-height: 1.4;">💡 ${status.recommendation}</div>
        <div style="margin-top: 12px;"><div style="font-size: 10px; opacity: 0.6; margin-bottom: 6px;">📊 Шкала налоговой нагрузки:</div>
        <div style="display: flex; gap: 2px;">
            <div style="flex: 1; height: 6px; background: #48bb78; border-radius: 3px 0 0 3px;" class="nds-scale"></div>
            <div style="flex: 1; height: 6px; background: #fbbf24;" class="nds-scale"></div>
            <div style="flex: 1; height: 6px; background: #ed8936;" class="nds-scale"></div>
            <div style="flex: 1; height: 6px; background: #f56565; border-radius: 0 3px 3px 0;" class="nds-scale"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; margin-top: 4px;"><span>0-5%</span><span>5-10%</span><span>10-15%</span><span>15%+</span></div></div>
    </div>`;
}

// ========================
// СЦЕНАРНЫЙ АНАЛИЗ С ПОЛЗУНКАМИ (из монолита)
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
    if (scenarioProfit > baseProfit * 1.2) recommendationText = '🚀 Отличный сценарий! Прибыль выросла более чем на 20%. Рассмотрите возможность увеличения маркетингового бюджета.';
    else if (scenarioProfit > baseProfit) recommendationText = '📈 Положительная динамика. Продолжайте в том же духе, но следите за расходами.';
    else if (scenarioProfit > baseProfit * 0.9) recommendationText = '⚠️ Прибыль немного снизилась. Проанализируйте структуру расходов.';
    else recommendationText = '🔴 Критическое снижение прибыли! Требуется немедленная оптимизация затрат или повышение цен.';
    if (currentScenario.priceChange > 10 && currentScenario.volumeChange < -5) recommendationText += ' Внимание: повышение цены привело к падению продаж. Возможно, стоит пересмотреть ценовую политику.';
    if (currentScenario.expenseGrowth > 20) recommendationText += ' Расходы выросли слишком сильно. Ищите точки оптимизации.';
    
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
// АНОМАЛИИ И ВЫБРОСЫ (из монолита)
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
            <thead><tr style="background: rgba(102,126,234,0.1);"><th style="padding: 10px; text-align: left;">Канал</th><th style="padding: 10px; text-align: right;">Маржинальность</th><th style="padding: 10px; text-align: right;">Продажи (шт)</th><th style="padding: 10px; text-align: right;">Выручка</th><th style="padding: 10px; text-align: left;">Стратегия</th> </tr></thead>
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
// КОЛЛАПСИБЕЛЬНЫЙ БЛОК (с анимацией)
// ========================

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

// ========================
// ВКЛАДКИ (modern-tabs-container)
// ========================

function generateTabsPanel() {
    if (!window.currentData || window.currentData.length === 0) {
        return '<div class="metric-card" style="padding: 40px; text-align: center;">📊 Нет данных для отображения</div>';
    }
    
    const f = window.calculateFinancials ? window.calculateFinancials(window.currentData) : { netRevenue: 0, profit: 0, totalExpenses: 1 };
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
    window.currentData.forEach(d => {
        const article = d.статья?.toLowerCase() || '';
        if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) salesFromArticle += Math.abs(d.сумма || 0);
        if (d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))) salesFromReference += Math.abs(d.сумма || 0);
    });
    const totalSalesQuantity = salesFromArticle + salesFromReference;
    const avgCheck = totalSalesQuantity > 0 ? f.netRevenue / totalSalesQuantity : 0;
    const efficiency = f.profit / (f.totalExpenses || 1);
    
    const netRevenueByChannel = window.calculateNetRevenueByChannel ? window.calculateNetRevenueByChannel(window.currentData) : [];
    const salesByChannel = calculateSalesByChannel(window.currentData);
    const avgCheckByChannel = calculateAvgCheckByChannel(window.currentData);
    
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
            <div class="tab-breakdown-content" id="breakdown_${tab.id}">
    ${tab.id === 'netRevenue' ? generateFullChannelBreakdown('ВЫРУЧКА ЧИСТАЯ ПО КАНАЛАМ', netRevenueByChannel, true, '') : 
      tab.id === 'sales' ? generateFullSalesBreakdown(window.currentData) :
      tab.id === 'avgCheck' ? generateFullAverageCheckBreakdown(window.currentData) :
      generateFullEfficiencyBreakdown(window.currentData)}
</div>
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
// ПОЛНЫЕ РАЗБИВКИ ДЛЯ ВКЛАДОК (ИДЕНТИЧНЫ БЛОКАМ НИЖЕ)
// ========================

/**
 * Полная разбивка по каналам (как в блоке чистой выручки)
 */
function generateFullChannelBreakdown(title, channels, isCurrency = true, suffix = '') {
    if (!channels || channels.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    }
    
    const total = channels.reduce((sum, ch) => sum + (ch.value || 0), 0);
    
    let html = `<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">
        <span style="font-size: 12px; font-weight: 600; color: #667eea;">${title}</span>
    </div>`;
    
    channels.forEach((channel, idx) => {
        const value = channel.value || 0;
        const percent = total > 0 ? (value / total) * 100 : 0;
        const formattedValue = isCurrency ? formatCurrency(value) : value.toLocaleString('ru-RU') + suffix;
        
        html += `
            <div class="breakdown-channel-item" style="margin-bottom: 16px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 2;">
                        <span style="font-weight: 600; font-size: 14px;">${channel.name}</span>
                        <span style="font-weight: 700; font-size: 13px;">${formattedValue}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end;">
                        <span style="font-size: 11px; background: rgba(102,126,234,0.15); padding: 2px 8px; border-radius: 12px;">${percent.toFixed(1)}%</span>
                    </div>
                </div>
                <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="breakdown-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px;"></div>
                </div>
            </div>
        `;
    });
    
    setTimeout(() => {
        document.querySelectorAll('#tabsContent .breakdown-progress-bar').forEach((bar, i) => {
            const targetPercent = channels[i] ? (channels[i].value / total) * 100 : 0;
            setTimeout(() => { bar.style.width = Math.min(targetPercent, 100) + '%'; }, 100);
        });
        document.querySelectorAll('#tabsContent .breakdown-channel-item').forEach((item, i) => {
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 50);
        });
    }, 200);
    
    return html;
}

/**
 * Полная разбивка продаж по каналам (как в блоке продаж)
 */
function generateFullSalesBreakdown(data) {
    let salesByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    allChannels.forEach(channel => {
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSales = sales + salesRef;
        if (totalSales > 0) {
            salesByChannel.push({ name: channel, sales: totalSales });
        }
    });
    
    if (salesByChannel.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по продажам</div>';
    }
    
    salesByChannel.sort((a, b) => b.sales - a.sales);
    const totalSales = salesByChannel.reduce((sum, ch) => sum + ch.sales, 0);
    
    let html = `<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">
        <span style="font-size: 12px; font-weight: 600; color: #667eea;">ПРОДАЖИ ПО КАНАЛАМ (ШТ)</span>
    </div>`;
    
    salesByChannel.forEach((channel, idx) => {
        const percent = (channel.sales / totalSales) * 100;
        html += `
            <div class="sales-channel-item" style="margin-bottom: 16px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 2;">
                        <span style="font-weight: 600; font-size: 14px;">${channel.name}</span>
                        <span style="font-weight: 700; font-size: 13px;">${new Intl.NumberFormat('ru-RU').format(channel.sales)} шт</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end;">
                        <span style="font-size: 11px; background: rgba(102,126,234,0.15); padding: 2px 8px; border-radius: 12px;">${percent.toFixed(1)}%</span>
                    </div>
                </div>
                <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="sales-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4299e1, #667eea); border-radius: 4px;"></div>
                </div>
            </div>
        `;
    });
    
    setTimeout(() => {
        document.querySelectorAll('#tabsContent .sales-progress-bar').forEach((bar, i) => {
            const targetWidth = salesByChannel[i] ? (salesByChannel[i].sales / totalSales) * 100 : 0;
            setTimeout(() => { bar.style.width = targetWidth + '%'; }, 100);
        });
        document.querySelectorAll('#tabsContent .sales-channel-item').forEach((item, i) => {
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 50);
        });
    }, 200);
    
    return html;
}

/**
 * Полная разбивка среднего чека по каналам (как в блоке среднего чека)
 */
function generateFullAverageCheckBreakdown(data) {
    let avgCheckByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    let totalNetRevenue = 0;
    let totalSales = 0;
    
    allChannels.forEach(channel => {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSalesChannel = sales + salesRef;
        const netRevenue = revenue - ndsOut;
        const avgCheck = totalSalesChannel > 0 ? netRevenue / totalSalesChannel : 0;
        if (netRevenue > 0 && totalSalesChannel > 0) {
            avgCheckByChannel.push({ name: channel, avgCheck: avgCheck, netRevenue: netRevenue, sales: totalSalesChannel, revenuePercent: 0 });
            totalNetRevenue += netRevenue;
            totalSales += totalSalesChannel;
        }
    });
    
    const overallAvgCheck = totalSales > 0 ? totalNetRevenue / totalSales : 0;
    avgCheckByChannel.forEach(channel => { channel.revenuePercent = totalNetRevenue > 0 ? (channel.netRevenue / totalNetRevenue) * 100 : 0; });
    avgCheckByChannel.sort((a, b) => b.avgCheck - a.avgCheck);
    
    if (avgCheckByChannel.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    }
    
    const topChannel = avgCheckByChannel[0];
    const forecastAvgCheck = overallAvgCheck * 1.05;
    
    let html = `<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">
        <span style="font-size: 12px; font-weight: 600; color: #667eea;">СРЕДНИЙ ЧЕК ПО КАНАЛАМ</span>
        <span style="font-size: 11px; margin-left: 8px;">(сортировка по убыванию)</span>
    </div>
    <div style="margin-bottom: 16px; padding: 12px; background: rgba(102,126,234,0.1); border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <div style="font-size: 12px;">Общий средний чек</div>
                <div style="font-size: 24px; font-weight: 700;">${formatCurrency(overallAvgCheck)}</div>
            </div>
            <div>
                <div style="font-size: 12px;">🏆 Лидер по чеку</div>
                <div style="font-size: 16px; font-weight: 600;">${topChannel.name} <span style="font-size: 14px; color: #667eea;">${formatCurrency(topChannel.avgCheck)}</span></div>
            </div>
            <div>
                <div style="font-size: 12px;">📈 Прогноз на след. месяц</div>
                <div style="font-size: 16px; font-weight: 600; color: #48bb78;">${formatCurrency(forecastAvgCheck)}</div>
                <div style="font-size: 10px;">+5% оптимистичный</div>
            </div>
        </div>
    </div>`;
    
    avgCheckByChannel.forEach((channel, idx) => {
        const deviation = ((channel.avgCheck - overallAvgCheck) / overallAvgCheck) * 100;
        const deviationClass = deviation >= 0 ? 'positive' : 'negative';
        const deviationText = deviation >= 0 ? `↑ ${deviation.toFixed(1)}% выше среднего` : `↓ ${Math.abs(deviation).toFixed(1)}% ниже среднего`;
        let medal = '';
        if (idx === 0) medal = '🥇';
        else if (idx === 1) medal = '🥈';
        else if (idx === 2) medal = '🥉';
        
        html += `
            <div class="avgcheck-channel-item" style="margin-bottom: 20px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">${medal}</span>
                        <span style="font-weight: 600; font-size: 15px;">${channel.name}</span>
                        <span style="font-weight: 700; font-size: 16px; color: #667eea;">${formatCurrency(channel.avgCheck)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="${deviationClass}" style="font-size: 12px; font-weight: 500;">${deviationText}</span>
                    </div>
                </div>
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; font-size: 12px;">
                    <span>📊 Доля в выручке: ${channel.revenuePercent.toFixed(1)}%</span>
                    <span>📦 Продажи: ${new Intl.NumberFormat('ru-RU').format(channel.sales)} шт</span>
                    <span>💰 Выручка: ${formatCurrency(channel.netRevenue)}</span>
                </div>
                <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="avgcheck-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px;"></div>
                </div>
            </div>
        `;
    });
    
    setTimeout(() => {
        document.querySelectorAll('#tabsContent .avgcheck-progress-bar').forEach((bar, i) => {
            const targetWidth = avgCheckByChannel[i] ? Math.min((avgCheckByChannel[i].avgCheck / (overallAvgCheck * 2)) * 100, 100) : 0;
            setTimeout(() => { bar.style.width = targetWidth + '%'; }, 100);
        });
        document.querySelectorAll('#tabsContent .avgcheck-channel-item').forEach((item, i) => {
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 50);
        });
    }, 200);
    
    return html;
}

/**
 * Полная разбивка эффективности по каналам (как в блоке эффективности)
 */
function generateFullEfficiencyBreakdown(data) {
    let efficiencyByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    allChannels.forEach(channel => {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        const expenses = data.filter(d => d.канал === channel && d.тип === 'Расход').reduce((sum, d) => sum + Math.abs(d.сумма), 0);
        const netRevenue = revenue - ndsOut;
        const profit = netRevenue - expenses;
        const efficiency = expenses > 0 ? profit / expenses : 0;
        if (netRevenue > 0 && expenses > 0) {
            efficiencyByChannel.push({ name: channel, profit: profit, expenses: expenses, efficiency: efficiency, efficiencyPercent: (efficiency * 100).toFixed(1) });
        }
    });
    
    efficiencyByChannel.sort((a, b) => b.efficiency - a.efficiency);
    const avgEfficiency = efficiencyByChannel.length > 0 ? efficiencyByChannel.reduce((sum, ch) => sum + ch.efficiency, 0) / efficiencyByChannel.length : 0;
    
    if (efficiencyByChannel.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    }
    
    let html = `<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">
        <span style="font-size: 12px; font-weight: 600; color: #667eea;">ЭФФЕКТИВНОСТЬ ПО КАНАЛАМ</span>
        <span style="font-size: 11px; margin-left: 8px;">(прибыль на 1₽ расходов)</span>
    </div>`;
    
    efficiencyByChannel.forEach((channel, idx) => {
        const efficiencyClass = channel.efficiency >= 1 ? 'positive' : 'negative';
        const vsAvg = channel.efficiency - avgEfficiency;
        const vsAvgText = vsAvg > 0 ? `+${(vsAvg * 100).toFixed(1)}% выше среднего` : vsAvg < 0 ? `${(vsAvg * 100).toFixed(1)}% ниже среднего` : 'на уровне среднего';
        const vsAvgClass = vsAvg > 0 ? 'positive' : vsAvg < 0 ? 'negative' : '';
        let medal = '';
        if (idx === 0) medal = '🥇 ';
        else if (idx === 1) medal = '🥈 ';
        else if (idx === 2) medal = '🥉 ';
        
        html += `
            <div class="efficiency-channel-item" style="margin-bottom: 20px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">${medal}</span>
                        <span style="font-weight: 600; font-size: 14px;">${channel.name}</span>
                        <span class="${efficiencyClass}" style="font-weight: 700; font-size: 13px;">${channel.efficiency.toFixed(2)} ₽</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 11px;">прибыли на 1₽ расходов</span>
                        <span style="font-size: 11px; background: rgba(102,126,234,0.15); padding: 2px 8px; border-radius: 12px;">${channel.efficiencyPercent}%</span>
                    </div>
                </div>
                <div style="margin-bottom: 4px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                        <span>💰 Прибыль: ${formatCurrency(channel.profit)}</span>
                        <span>📉 Расходы: ${formatCurrency(channel.expenses)}</span>
                    </div>
                </div>
                <div style="background: rgba(102,126,234,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                    <div class="efficiency-progress-bar" style="width: 0%; height: 100%; background: ${channel.efficiency >= 1 ? 'linear-gradient(90deg, #48bb78, #38a169)' : 'linear-gradient(90deg, #f56565, #ed8936)'}; border-radius: 3px;"></div>
                </div>
                <div style="margin-top: 4px;">
                    <span class="${vsAvgClass}" style="font-size: 10px;">${vsAvgText}</span>
                </div>
            </div>
        `;
    });
    
    html += `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(102,126,234,0.2); text-align: center;">
        <span style="font-size: 11px;">Средняя эффективность: <strong>${avgEfficiency.toFixed(2)} ₽</strong> прибыли на 1₽ расходов</span>
    </div>`;
    
    setTimeout(() => {
        document.querySelectorAll('#tabsContent .efficiency-progress-bar').forEach((bar, i) => {
            const targetWidth = efficiencyByChannel[i] ? Math.min(Math.abs(efficiencyByChannel[i].efficiency) * 50, 100) : 0;
            setTimeout(() => { bar.style.width = targetWidth + '%'; }, 100);
        });
        document.querySelectorAll('#tabsContent .efficiency-channel-item').forEach((item, i) => {
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 50);
        });
    }, 200);
    
    return html;
}

/**
 * Генерирует разбивку НДС по каналам
 */
function generateNDSBreakdown(data) {
    const ndsByChannel = {};
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    allChannels.forEach(channel => {
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        const ndsIn = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС входящий').reduce((sum, d) => sum + d.сумма, 0);
        const total = ndsOut - ndsIn;
        if (ndsOut !== 0 || ndsIn !== 0 || total !== 0) {
            ndsByChannel[channel] = { ndsOut: ndsOut, ndsIn: ndsIn, total: total };
        }
    });
    
    const channelsList = Object.entries(ndsByChannel).filter(([_, d]) => d.total !== 0).sort((a, b) => b[1].total - a[1].total).map(([name, d]) => ({ name, ndsOut: d.ndsOut, ndsIn: d.ndsIn, total: d.total }));
    const totalOut = channelsList.reduce((sum, ch) => sum + ch.ndsOut, 0);
    const totalIn = channelsList.reduce((sum, ch) => sum + ch.ndsIn, 0);
    const totalNDS = totalOut - totalIn;
    
    if (channelsList.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    }
    
    let html = '<div class="nds-channels-list">';
    html += '<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">';
    html += '<span style="font-size: 12px; font-weight: 600; color: #667eea;">РАЗБИВКА НДС ПО КАНАЛАМ</span>';
    html += '<span style="font-size: 11px; margin-left: 8px;">(нажмите на канал для деталей)</span>';
    html += '</div>';
    
    for (let idx = 0; idx < channelsList.length; idx++) {
        const channel = channelsList[idx];
        const outPercent = totalOut > 0 ? (channel.ndsOut / totalOut) * 100 : 0;
        const inPercent = totalIn > 0 ? (channel.ndsIn / totalIn) * 100 : 0;
        const totalPercent = totalNDS !== 0 ? (Math.abs(channel.total) / Math.abs(totalNDS)) * 100 : 0;
        const formattedOut = formatCurrency(channel.ndsOut);
        const formattedIn = formatCurrency(channel.ndsIn);
        const formattedTotal = formatCurrency(channel.total);
        const totalClass = channel.total >= 0 ? 'negative' : 'positive';
        
        html += '<div class="nds-channel-item" data-channel="' + channel.name + '" style="margin-bottom: 16px; border-bottom: 1px solid rgba(102,126,234,0.2); padding-bottom: 12px;">';
        html += '<div class="nds-channel-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 8px 0; border-radius: 8px;">';
        html += '<div style="display: flex; align-items: center; gap: 10px;">';
        html += '<span class="nds-expand-icon" style="font-size: 12px; transition: transform 0.3s; display: inline-block;">▶</span>';
        html += '<span style="font-weight: 600; font-size: 15px;">' + channel.name + '</span>';
        html += '</div>';
        html += '<div style="display: flex; align-items: center; gap: 12px;">';
        html += '<span class="' + totalClass + '" style="font-weight: 700; font-size: 14px;">' + formattedTotal + '</span>';
        html += '<span style="font-size: 11px; background: rgba(102,126,234,0.15); padding: 2px 8px; border-radius: 12px;">' + totalPercent.toFixed(1) + '%</span>';
        html += '</div></div>';
        
        html += '<div class="nds-channel-details" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; padding-left: 20px;">';
        html += '<div style="padding-top: 8px; padding-bottom: 8px;">';
        
        html += '<div style="margin-bottom: 8px;">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">';
        html += '<span style="font-size: 12px;">Исходящий</span>';
        html += '<div style="display: flex; align-items: center; gap: 12px;">';
        html += '<span style="font-size: 13px; font-weight: 600; color: #f56565;">' + formattedOut + '</span>';
        html += '<span style="font-size: 11px; background: rgba(102,126,234,0.1); padding: 2px 8px; border-radius: 12px;">' + outPercent.toFixed(1) + '%</span>';
        html += '</div></div>';
        html += '<div style="background: rgba(245,101,101,0.2); height: 4px; border-radius: 2px; overflow: hidden;">';
        html += '<div style="width: ' + outPercent + '%; height: 100%; background: #f56565; border-radius: 2px;"></div>';
        html += '</div></div>';
        
        html += '<div>';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">';
        html += '<span style="font-size: 12px;">Входящий</span>';
        html += '<div style="display: flex; align-items: center; gap: 12px;">';
        html += '<span style="font-size: 13px; font-weight: 600; color: #48bb78;">' + formattedIn + '</span>';
        html += '<span style="font-size: 11px; background: rgba(102,126,234,0.1); padding: 2px 8px; border-radius: 12px;">' + inPercent.toFixed(1) + '%</span>';
        html += '</div></div>';
        html += '<div style="background: rgba(72,187,120,0.2); height: 4px; border-radius: 2px; overflow: hidden;">';
        html += '<div style="width: ' + inPercent + '%; height: 100%; background: #48bb78; border-radius: 2px;"></div>';
        html += '</div></div>';
        
        html += '</div></div></div>';
    }
    
    html += '</div>';
    
    setTimeout(function() {
        document.querySelectorAll('.nds-channel-header').forEach(function(header) {
            if (header.hasClickListener) return;
            header.hasClickListener = true;
            header.addEventListener('click', function(e) {
                e.stopPropagation();
                var channelItem = header.closest('.nds-channel-item');
                var details = channelItem.querySelector('.nds-channel-details');
                var expandIcon = header.querySelector('.nds-expand-icon');
                if (details.style.maxHeight && details.style.maxHeight !== '0px') {
                    details.style.maxHeight = '0';
                    if (expandIcon) expandIcon.style.transform = 'rotate(0deg)';
                } else {
                    details.style.maxHeight = details.scrollHeight + 'px';
                    if (expandIcon) expandIcon.style.transform = 'rotate(90deg)';
                }
            });
        });
    }, 100);
    
    return html;
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
// ОБРАБОТЧИКИ КОЛЛАПСИБЕЛЬНЫХ БЛОКОВ
// ========================

function setupCollapsibleHandlers() {
    const toggleRevenueBtn = document.querySelector('.toggle-channels-revenue-btn');
    const revenueContainer = document.querySelector('.channels-revenue-container');
    if (toggleRevenueBtn && revenueContainer) {
        toggleRevenueBtn.onclick = () => {
            const isVisible = revenueContainer.style.maxHeight !== '0px';
            if (isVisible) {
                revenueContainer.style.maxHeight = '0';
                revenueContainer.style.opacity = '0';
                toggleRevenueBtn.innerHTML = '<span class="toggle-icon-main">▶</span> Показать каналы';
            } else {
                revenueContainer.style.maxHeight = revenueContainer.scrollHeight + 'px';
                revenueContainer.style.opacity = '1';
                toggleRevenueBtn.innerHTML = '<span class="toggle-icon-main">▼</span> Скрыть каналы';
            }
        };
    }
    
    const toggleExpenseBtn = document.querySelector('.toggle-channels-expense-btn');
    const expenseContainer = document.querySelector('.channels-expense-container');
    if (toggleExpenseBtn && expenseContainer) {
        toggleExpenseBtn.onclick = () => {
            const isVisible = expenseContainer.style.maxHeight !== '0px';
            if (isVisible) {
                expenseContainer.style.maxHeight = '0';
                expenseContainer.style.opacity = '0';
                toggleExpenseBtn.innerHTML = '<span class="toggle-icon-main">▶</span> Показать каналы';
            } else {
                expenseContainer.style.maxHeight = expenseContainer.scrollHeight + 'px';
                expenseContainer.style.opacity = '1';
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
                    items.forEach((item, itemIdx) => {
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'translateX(0)';
                        }, idx * 50 + itemIdx * 30);
                    });
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
                items.forEach((item, idx) => {
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateX(0)';
                    }, idx * 30);
                });
            }
        });
    });
}

// ========================
// ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРИНГА ДАШБОРДА (ПОЛНАЯ ВЕРСИЯ)
// ========================

function renderDashboard() {
    syncGlobalData();
    if (isRendering) { console.log('Рендер уже выполняется'); return; }
    isRendering = true;
    
    try {
        if (!window.currentData || window.currentData.length === 0) {
            document.getElementById('dashboardMetrics').innerHTML = '<div class="loading">Нет данных</div>';
            isRendering = false;
            return;
        }
        
        const f = window.calculateFinancials ? window.calculateFinancials(window.currentData) : { 
            totalRevenue: 0, netRevenue: 0, totalNDS: 0, totalExpenses: 0, profit: 0, profitability: 0,
            totalSalesQuantity: 0, costData: 0, avgCheck: 0, avgCost: 0
        };
        
        // ========================
        // СБОР ДОХОДОВ И РАСХОДОВ ПО КАНАЛАМ
        // ========================
        const revenueByChannel = {}, expensesByChannel = {};
        window.currentData.forEach(d => {
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
        
        const revenueChannelsList = Object.entries(revenueByChannel).filter(([_, data]) => data.total > 0)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([name, data]) => ({ name, total: data.total, items: Object.entries(data.items).map(([itemName, amount]) => ({ name: itemName, amount })) }));
        
        const expenseChannelsList = Object.entries(expensesByChannel).filter(([_, data]) => data.total > 0)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([name, data]) => ({ name, total: data.total, items: Object.entries(data.items).map(([itemName, amount]) => ({ name: itemName, amount })) }));
        
        // ========================
        // ПРОДАЖИ И СРЕДНИЙ ЧЕК
        // ========================
        let salesFromArticle = 0, salesFromReference = 0;
        window.currentData.forEach(d => {
            const article = d.статья?.toLowerCase() || '';
            if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) salesFromArticle += Math.abs(d.сумма || 0);
            if (d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))) salesFromReference += Math.abs(d.сумма || 0);
        });
        const totalSalesQuantity = salesFromArticle + salesFromReference;
        const avgCheck = totalSalesQuantity > 0 ? f.netRevenue / totalSalesQuantity : 0;
        
        // ========================
        // МЕСЯЧНЫЕ ДАННЫЕ ДЛЯ ГРАФИКОВ
        // ========================
        const monthsOrder = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
        const monthlyDataMap = new Map();
        monthsOrder.forEach(month => monthlyDataMap.set(month, { revenue: 0, profit: 0, expenses: 0 }));
        
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
        
        const monthlyLabels = monthsOrder.filter(m => monthlyDataMap.get(m).revenue > 0 || monthlyDataMap.get(m).profit !== 0);
        const monthlyRevenues = monthlyLabels.map(m => monthlyDataMap.get(m).revenue / 1000);
        const monthlyExpensesArray = monthlyLabels.map(m => (monthlyDataMap.get(m)?.expenses || 0) / 1000);
        const monthlyProfits = monthlyLabels.map(m => monthlyDataMap.get(m).profit / 1000);
        
        // ========================
        // НДС ДАННЫЕ
        // ========================
        const monthlyNds = {};
        monthsOrder.forEach(month => monthlyNds[month] = 0);
        window.currentData.forEach(d => {
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
        
        // ========================
        // ДИНАМИКА ИЗМЕНЕНИЙ
        // ========================
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
        const profitabilityChange = fPrev ? getChangePercent(f.profitability, fPrev.profitability) : null;
        
        // ========================
        // СЕБЕСТОИМОСТЬ
        // ========================
        let costData = window.currentData.filter(d => d.тип === 'Расход' && d.подканал === 'Себестоимость сырья').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        costData += window.currentData.filter(d => d.статья === 'Себестоимость сырья').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        costData += window.currentData.filter(d => d.статья === 'Себестоимость товаров').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        costData += window.currentData.filter(d => d.статья === 'Себестоимость').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        
        const avgCost = totalSalesQuantity > 0 ? costData / totalSalesQuantity : 0;
        const costChange = fPrev ? getChangePercent(costData, fPrev.costData || 0) : null;
        const avgCostChange = fPrev ? getChangePercent(avgCost, fPrev.avgCost || 0) : null;
        const salesChange = fPrev ? getChangePercent(totalSalesQuantity, fPrev.totalSalesQuantity || 0) : null;
        const avgCheckChange = fPrev ? getChangePercent(avgCheck, fPrev.avgCheck || 0) : null;
        
        // ========================
        // СОСТОЯНИЕ КОМПАНИИ И РЕКОМЕНДАЦИИ
        // ========================
        let healthStatus = { color: '#48bb78', text: 'Отлично', icon: '🚀' };
        let recommendations = [];
        if (f.profit < 0) {
            healthStatus = { color: '#f56565', text: 'Критично', icon: '🔴' };
            recommendations.push('⚠️ Компания убыточна! Срочно оптимизируйте расходы.');
        } else if (f.profitability < 10) {
            healthStatus = { color: '#ed8936', text: 'Требует внимания', icon: '⚠️' };
            recommendations.push('📉 Низкая рентабельность (<10%). Пересмотрите ценообразование.');
        } else if (f.profitability < 20) {
            healthStatus = { color: '#f59e0b', text: 'Средняя', icon: '📊' };
            recommendations.push('📈 Рентабельность можно улучшить. Оптимизируйте затраты.');
        } else {
            recommendations.push('✅ Отличная рентабельность! Масштабируйте успешные каналы.');
        }
        
        if (avgCheck < 1000 && avgCheck > 0) recommendations.push('💰 Средний чек ниже 1000₽. Работайте над апселлингом.');
        else if (avgCheck > 5000) recommendations.push('💎 Высокий средний чек. Удерживайте качество обслуживания.');
        
        const efficiency = f.profit / (f.totalExpenses || 1);
        
        // ========================
        // ВЕРХНЯЯ ПАНЕЛЬ
        // ========================
        const topPanelHtml = `
        <div style="margin-bottom: 24px;">
            <div class="metrics-grid" style="margin-bottom: 20px;">
                <div class="metric-card" style="grid-column: span 4; padding: 20px;">
                    <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 18px;">📊</span>
                        <span style="font-size: 14px; font-weight: 600; color: #667eea;">СОСТОЯНИЕ КОМПАНИИ</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                            <div style="text-align: center; min-width: 100px;">
                                <div style="font-size: 36px;">${healthStatus.icon}</div>
                                <div style="font-size: 11px; opacity: 0.7;">Статус</div>
                                <div style="font-size: 18px; font-weight: 700; color: ${healthStatus.color};">${healthStatus.text}</div>
                            </div>
                            <div style="width: 1px; height: 50px; background: rgba(102,126,234,0.2);"></div>
                            <div>
                                <div style="font-size: 11px; opacity: 0.7; margin-bottom: 6px;">💡 Ключевые рекомендации</div>
                                <div style="font-size: 13px; line-height: 1.4;">${recommendations[0] || 'Анализ данных в норме'}</div>
                                ${recommendations[1] ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 6px;">${recommendations[1]}</div>` : ''}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px; opacity: 0.7;">Период анализа</div>
                            <div style="font-size: 14px; font-weight: 600;">${currentFilters.year || 'год'} ${currentFilters.month?.length ? currentFilters.month.join(', ') : 'все месяцы'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        
        // ========================
        // ФУНКЦИЯ ДЛЯ КОЛЛАПСИБЕЛЬНЫХ БЛОКОВ
        // ========================
        function createCollapsibleBlock(title, icon, total, totalChange, channels, isExpense = false, monthlyValues = null) {
            const channelItemsHtml = channels.map((channel, channelIdx) => {
                const channelPercent = (channel.total / total) * 100;
                const sortedItems = [...channel.items].sort((a, b) => b.amount - a.amount);
                const itemsHtml = sortedItems.map((item, itemIdx) => {
                    const itemPercentOfChannel = (item.amount / channel.total) * 100;
                    const gradient = isExpense ? 'linear-gradient(90deg, #f56565, #ed8936)' : 'linear-gradient(90deg, #48bb78, #8dd934)';
                    return `<div class="sub-item" style="margin-bottom: 12px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${itemIdx * 0.03}s;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                            <span style="font-size: 13px; font-weight: 500;">${item.name}</span>
                            <div style="display: flex; gap: 12px;"><span style="font-size: 13px; font-weight: 600;">${formatCurrency(item.amount)}</span></div>
                        </div>
                        <div style="background: rgba(102,126,234,0.15); height: 6px; border-radius: 3px; overflow: hidden;">
                            <div class="sub-progress-bar" style="width: ${itemPercentOfChannel}%; height: 100%; background: ${gradient}; border-radius: 3px;"></div>
                        </div>
                    </div>`;
                }).join('');
                const channelGradient = isExpense ? 'linear-gradient(90deg, #f56565, #ed8936)' : 'linear-gradient(90deg, #48bb78, #8dd934)';
                return `<div class="channel-item" data-channel-name="${channel.name}" style="margin-bottom: 20px; border-bottom: 1px solid rgba(102,126,234,0.2); padding-bottom: 16px;">
                    <div class="channel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="channel-icon" style="font-size: 20px;">${getChannelIcon(channel.name)}</span>
                            <span style="font-weight: 700; font-size: 15px;">${channel.name}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span class="channel-total" style="font-size: 14px; font-weight: 600;">${formatCurrency(channel.total)}</span>
                            <span class="expand-icon" style="font-size: 14px; transition: transform 0.3s; cursor: pointer;">▶</span>
                        </div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; margin-bottom: 12px; overflow: hidden;">
                        <div class="channel-progress-bar" style="width: ${channelPercent}%; height: 100%; background: ${channelGradient}; border-radius: 4px;"></div>
                    </div>
                    <div class="channel-details" style="max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
                        <div style="padding-top: 12px; padding-left: 30px;">${itemsHtml}</div>
                    </div>
                </div>`;
            }).join('');
            
            const chartHtml = (monthlyValues && monthlyValues.length > 0) ? `
                <div class="revenue-chart-wrapper" style="margin-top: 16px;">
                    <canvas id="${isExpense ? 'expenseMiniChartNew' : 'revenueMiniChartNew'}" style="height: 100px; width: 100%; display: block;"></canvas>
                </div>
            ` : '';
            
            return `<div class="metric-card" style="overflow: hidden; padding: 20px; height: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div class="metric-title" style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">${icon}</span>
                        <span style="font-size: 16px; font-weight: 700;">${title}</span>
                    </div>
                    <button class="toggle-channels-${isExpense ? 'expense' : 'revenue'}-btn" 
                        style="background: rgba(102,126,234,0.15); border: none; border-radius: 20px; padding: 4px 12px; font-size: 11px; color: #667eea; cursor: pointer;">
                        <span class="toggle-icon-main">▶</span> Показать каналы
                    </button>
                </div>
                <div style="margin-bottom: 20px;">
                    <div class="metric-value" style="font-size: 32px;">${formatCurrency(total)}</div>
                    ${getChangeHtml(totalChange, isExpense)}
                </div>
                <div class="channels-${isExpense ? 'expense' : 'revenue'}-container" 
                    style="max-height: 0; opacity: 0; overflow-y: auto; transition: max-height 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;">
                    ${channelItemsHtml}
                    <button class="toggle-all-channels-btn" style="margin-top: 16px; background: none; border: none; color: #667eea; cursor: pointer;">
                        <span>▶</span> Раскрыть подканалы
                    </button>
                </div>
                ${chartHtml}
            </div>`;
        }
        
        // Генерируем основные блоки
        const revenueHtml = createCollapsibleBlock('Доходы по каналам', '💰', f.totalRevenue, revenueChange, revenueChannelsList, false, monthlyRevenues);
        const expensesHtml = createCollapsibleBlock('Расходы по каналам', '📉', f.totalExpenses, expensesChange, expenseChannelsList, true, monthlyExpensesArray);
        const tabsPanel = generateTabsPanel();
        
        // ========================
        // БЛОК НДС
        // ========================
        const ndsHtml = `
        <div class="metric-card">
            <div class="metric-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">💸</span>
                    <span>НДС</span>
                </div>
                <button class="toggle-nds-breakdown-btn" style="background: none; border: none; color: #667eea; cursor: pointer;">
                    <span>▶</span> Показать по каналам
                </button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                <div>
                    <div class="metric-value" id="mainNdsValue">${formatCurrency(f.totalNDS)}</div>
                    <div class="metric-sub">${f.totalNDS >= 0 ? '↗ НДС к уплате' : '↙ НДС к возмещению'}</div>
                    ${ndsChange ? getChangeHtml(ndsChange) : ''}
                </div>
                <div style="text-align: right;">
                    <div class="metric-value" id="ndsPercentValue" style="font-size: 28px;">${totalNdsPercent.toFixed(1)}%</div>
                    <div class="metric-sub">от выручки</div>
                </div>
            </div>
            <canvas id="ndsToRevenueChart" style="height: 140px; width: 100%; margin-top: 8px;"></canvas>
            <div id="ndsStatsCard"></div>
            <div class="nds-channels-container" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease;">
                <div style="padding-top: 16px;">${generateNDSBreakdown(window.currentData)}</div>
            </div>
        </div>`;
        
        // ========================
        // БЛОК ЧИСТОЙ ВЫРУЧКИ
        // ========================
        const netRevenueHtml = `
        <div class="metric-card">
            <div class="metric-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">📊</span>
                    <span>Выручка чистая</span>
                </div>
                <button class="toggle-breakdown-btn" data-type="netRevenue" style="background: none; border: none; color: #667eea; cursor: pointer;">
                    <span>▶</span> Показать по каналам
                </button>
            </div>
            <div>
                <div class="metric-value">${formatCurrency(f.netRevenue)}</div>
                ${netRevenueChange ? getChangeHtml(netRevenueChange) : ''}
            </div>
            <div class="revenue-chart-wrapper" style="margin-top: 16px;">
                <canvas id="netRevenueMiniChart" style="height: 100px; width: 100%;"></canvas>
            </div>
            <div class="netrevenue-channels-container" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease; margin-top: 16px;">
                <div style="padding-top: 16px;">${generateChannelBreakdown('ВЫРУЧКА ЧИСТАЯ ПО КАНАЛАМ', 'value', window.calculateNetRevenueByChannel ? window.calculateNetRevenueByChannel(window.currentData) : [], true, '')}</div>
            </div>
        </div>`;
        
        // ========================
        // БЛОК МАРЖИНАЛЬНОЙ ПРИБЫЛИ
        // ========================
        const profitHtml = `
        <div class="metric-card" style="${f.profit < 0 ? 'border: 2px solid #f56565; animation: pulseRed 1s ease-in-out infinite;' : ''}">
            <div class="metric-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">${f.profit < 0 ? '🔴' : '📈'}</span>
                    <span>Маржинальная прибыль</span>
                    ${f.profit < 0 ? '<span style="background: #f56565; color: white; padding: 2px 8px; border-radius: 20px; font-size: 10px;">УБЫТОК!</span>' : ''}
                </div>
                <button class="toggle-channels-profit-btn" style="background: none; border: none; color: #667eea; cursor: pointer;">
                    <span>▶</span> Показать по каналам
                </button>
            </div>
            <div>
                <div class="metric-value ${f.profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(f.profit)}</div>
                ${profitChange ? getChangeHtml(profitChange) : ''}
            </div>
            <div class="metric-sub">Рентабельность: ${f.profitability.toFixed(1)}% ${profitabilityChange ? getChangeHtml(profitabilityChange) : ''}</div>
            <div class="revenue-chart-wrapper" style="margin-top: 16px;">
                <canvas id="profitMiniChart" style="height: 100px; width: 100%;"></canvas>
            </div>
            <div class="profit-channels-container" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease; margin-top: 16px;">
                <div style="padding-top: 16px;">${generateProfitByChannels(f, revenueChannelsList, expenseChannelsList, window.calculateNetRevenueByChannel ? window.calculateNetRevenueByChannel(window.currentData) : [])}</div>
            </div>
        </div>`;
        
        // ========================
        // БЛОК ПРОДАЖ (ШТ)
        // ========================
        const salesHtml = `
        <div class="metric-card">
            <div class="metric-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">📦</span>
                    <span>Продажи (шт)</span>
                </div>
                <button class="toggle-sales-breakdown-btn" style="background: none; border: none; color: #667eea; cursor: pointer;">
                    <span>▶</span> Показать по каналам
                </button>
            </div>
            <div>
                <div class="metric-value">${new Intl.NumberFormat('ru-RU').format(totalSalesQuantity)}</div>
                ${salesChange ? getChangeHtml(salesChange) : ''}
            </div>
            <canvas id="salesChart" style="height: 100px; width: 100%; margin-top: 8px; border-radius: 8px; cursor: pointer;"></canvas>
            <div class="sales-channels-container" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease; margin-top: 16px;">
                <div style="padding-top: 16px;">${generateSalesBreakdown(window.currentData)}</div>
            </div>
        </div>`;
        
        // ========================
        // БЛОК СРЕДНЕГО ЧЕКА
        // ========================
        const avgCheckHtml = `
        <div class="metric-card">
            <div class="metric-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">💰</span>
                    <span>Средний чек</span>
                </div>
                <button class="toggle-avgcheck-breakdown-btn" style="background: none; border: none; color: #667eea; cursor: pointer;">
                    <span>▶</span> Показать по каналам
                </button>
            </div>
            <div>
                <div class="metric-value">${formatCurrency(avgCheck)}</div>
                ${avgCheckChange ? getChangeHtml(avgCheckChange) : ''}
            </div>
            <div class="avgcheck-channels-container" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease; margin-top: 16px;">
                <div style="padding-top: 16px;">${generateAverageCheckBreakdown(window.currentData)}</div>
            </div>
        </div>`;
        
        // ========================
        // БЛОК СЕБЕСТОИМОСТИ (СЫРЬЯ)
        // ========================
        const costHtml = `
        <div class="metric-card">
            <div class="metric-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">🏭</span>
                    <span>Себестоимость сырья</span>
                </div>
                <button class="toggle-cost-breakdown-btn" style="background: none; border: none; color: #667eea; cursor: pointer;">
                    <span>▶</span> Показать по каналам
                </button>
            </div>
            <div>
                <div class="metric-value">${formatCurrency(costData)}</div>
                ${costChange ? getChangeHtml(costChange, true) : ''}
            </div>
            <div class="cost-channels-container" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease; margin-top: 16px;">
                <div style="padding-top: 16px;">${generateCostBreakdown(window.currentData)}</div>
            </div>
        </div>`;
        
        // ========================
        // БЛОК СЕБЕСТОИМОСТИ 1 ШТ
        // ========================
        const avgCostHtml = `
        <div class="metric-card">
            <div class="metric-title">📊 Себестоимость 1 шт</div>
            <div>
                <div class="metric-value">${formatCurrency(avgCost)}</div>
                ${avgCostChange ? getChangeHtml(avgCostChange, true) : ''}
            </div>
        </div>`;
        
        // ========================
        // АНАЛИЗ ТОЧКИ БЕЗУБЫТОЧНОСТИ
        // ========================
        const breakEvenAnalysis = window.generateBreakEvenAnalysis ? window.generateBreakEvenAnalysis(window.currentData, f, totalSalesQuantity) : null;
        
        const breakEvenHtml = `
        <div class="metric-card" style="grid-column: span 4;">
            <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                <span style="font-size: 18px;">⚖️</span>
                <span>Точка безубыточности</span>
                <span style="font-size: 12px; color: var(--text-secondary); margin-left: auto;">анализ постоянных и переменных затрат</span>
            </div>
            <div class="break-even-container">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
                    <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">📊 Точка безубыточности (шт)</div>
                        <div style="font-size: 28px; font-weight: 700;">${breakEvenAnalysis ? new Intl.NumberFormat('ru-RU').format(breakEvenAnalysis.breakEvenUnits) : '—'}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">минимальный объем продаж</div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">💰 Точка безубыточности (₽)</div>
                        <div style="font-size: 28px; font-weight: 700;">${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.breakEvenRevenue) : '—'}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">минимальная выручка</div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">🛡️ Запас финансовой прочности</div>
                        <div style="font-size: 28px; font-weight: 700; ${(breakEvenAnalysis?.safetyMargin || 0) >= 30 ? 'color: #48bb78;' : (breakEvenAnalysis?.safetyMargin || 0) >= 10 ? 'color: #f59e0b;' : 'color: #f56565;'}">${breakEvenAnalysis ? breakEvenAnalysis.safetyMargin.toFixed(1) : '—'}%</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.safetyMarginAbsolute) : '—'} выше точки</div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">⚡ Операционный рычаг</div>
                        <div style="font-size: 28px; font-weight: 700;">${breakEvenAnalysis ? breakEvenAnalysis.operatingLeverage.toFixed(2) : '—'}x</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">прирост прибыли на 1% роста продаж</div>
                    </div>
                </div>
                <div style="margin-bottom: 20px; padding: 16px; background: rgba(102,126,234,0.05); border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <span style="font-size: 13px; font-weight: 600;">📈 Маржинальный доход на единицу</span>
                            <div style="font-size: 20px; font-weight: 700; color: #48bb78;">${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.contributionMarginPerUnit) : '—'}</div>
                            <div style="font-size: 11px;">(средняя цена ${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.avgPrice) : '—'} - переменные затраты ${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.avgVariableCostPerUnit) : '—'})</div>
                        </div>
                        <div>
                            <span style="font-size: 13px; font-weight: 600;">📊 Коэффициент маржинального дохода</span>
                            <div style="font-size: 20px; font-weight: 700; color: #667eea;">${breakEvenAnalysis ? breakEvenAnalysis.contributionMarginRatio.toFixed(1) : '—'}%</div>
                            <div style="font-size: 11px;">доля в выручке</div>
                        </div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; margin: 12px 0; overflow: hidden;">
                        <div style="width: ${breakEvenAnalysis ? Math.min((breakEvenAnalysis.totalRevenue - breakEvenAnalysis.breakEvenRevenue) / breakEvenAnalysis.totalRevenue * 100, 100) : 0}%; height: 100%; background: linear-gradient(90deg, #48bb78, #667eea); border-radius: 4px;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px;">
                        <span>🔴 Постоянные затраты: ${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.totalFixedCosts) : '—'}</span>
                        <span>🟢 Переменные затраты: ${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.totalVariableCosts) : '—'}</span>
                        <span>💰 Текущая выручка: ${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.totalRevenue) : '—'}</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="padding: 12px; background: rgba(72,187,120,0.1); border-radius: 12px;">
                        <div style="font-size: 12px; color: #48bb78; margin-bottom: 8px;">🎯 Прогноз для целевой прибыли (+20%)</div>
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                            <div><div style="font-size: 11px;">Целевая прибыль</div><div style="font-size: 16px; font-weight: 600;">${breakEvenAnalysis ? formatCurrency(breakEvenAnalysis.targetProfit) : '—'}</div></div>
                            <div><div style="font-size: 11px;">Необходимо продать</div><div style="font-size: 16px; font-weight: 600;">${breakEvenAnalysis ? new Intl.NumberFormat('ru-RU').format(breakEvenAnalysis.targetUnits) : '—'} шт</div></div>
                        </div>
                    </div>
                    <div style="padding: 12px; background: rgba(245,101,101,0.1); border-radius: 12px;">
                        <div style="font-size: 12px; color: #f56565; margin-bottom: 8px;">⚠️ Риски и рекомендации</div>
                        <div style="font-size: 11px; line-height: 1.4;">
                            ${breakEvenAnalysis ? (breakEvenAnalysis.safetyMargin < 10 ? '🔴 Критический запас прочности! Срочно требуются меры.' : breakEvenAnalysis.safetyMargin < 30 ? '🟡 Запас прочности ниже нормы. Рекомендуется оптимизация.' : '🟢 Хороший запас прочности.') : '—'}
                            ${breakEvenAnalysis ? (breakEvenAnalysis.contributionMarginPerUnit < 0 ? '❌ Отрицательный маржинальный доход! Себестоимость выше цены.' : '✅ Маржинальный доход положительный.') : '—'}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        
        // ========================
        // АНАЛИЗ ТРЕНДОВ
        // ========================
        const trendsAnalysis = window.generateTrendsAnalysis ? window.generateTrendsAnalysis(window.currentData, f, totalSalesQuantity) : null;
        
        const trendsHtml = `
        <div class="metric-card" style="grid-column: span 4;">
            <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                <span style="font-size: 18px;">📈</span>
                <span>Анализ трендов</span>
                <span style="font-size: 12px; color: var(--text-secondary); margin-left: auto;">динамика, сезонность, прогноз</span>
            </div>
            <div class="trends-container">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
                    <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">📈 Скользящая средняя (3 мес)</div>
                        <div style="font-size: 24px; font-weight: 700;">${trendsAnalysis ? formatCurrency(trendsAnalysis.lastMovingAverage3) : '—'}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">тренд ${trendsAnalysis ? trendsAnalysis.trend3to6Text : '—'}</div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">📊 Скользящая средняя (6 мес)</div>
                        <div style="font-size: 24px; font-weight: 700;">${trendsAnalysis ? formatCurrency(trendsAnalysis.lastMovingAverage6) : '—'}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">сглаживает колебания</div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">📉 Общий рост прибыли</div>
                        <div style="font-size: 24px; font-weight: 700; ${(trendsAnalysis?.totalProfitGrowth || 0) >= 0 ? 'color: #48bb78;' : 'color: #f56565;'}">${trendsAnalysis ? (trendsAnalysis.totalProfitGrowth >= 0 ? '+' : '') + trendsAnalysis.totalProfitGrowth.toFixed(1) + '%' : '—'}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">с начала периода</div>
                    </div>
                    <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 16px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">🏆 Лучший месяц</div>
                        <div style="font-size: 16px; font-weight: 700;">${trendsAnalysis ? trendsAnalysis.bestMonth?.split('-')[1] : '—'}</div>
                        <div style="font-size: 11px; color: #48bb78;">прибыль ${trendsAnalysis ? formatCurrency(trendsAnalysis.profits?.[trendsAnalysis.profits.length - 1] || 0) : '—'}</div>
                    </div>
                </div>
                <div style="margin-bottom: 20px; padding: 16px; background: rgba(102,126,234,0.05); border-radius: 12px;">
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">📊 Темп роста (месяц к месяцу)</div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary);">Выручка</div>
                            <div style="font-size: 18px; font-weight: 700; ${(trendsAnalysis?.lastGrowth?.revenueGrowth || 0) >= 0 ? 'color: #48bb78;' : 'color: #f56565;'}">
                                ${trendsAnalysis?.lastGrowth ? (trendsAnalysis.lastGrowth.revenueGrowth >= 0 ? '+' : '') + trendsAnalysis.lastGrowth.revenueGrowth.toFixed(1) + '%' : 'Нет данных'}
                            </div>
                            <div style="font-size: 10px;">средний: ${trendsAnalysis?.avgRevenueGrowth?.toFixed(1) || '0'}%</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary);">Прибыль</div>
                            <div style="font-size: 18px; font-weight: 700; ${(trendsAnalysis?.lastGrowth?.profitGrowth || 0) >= 0 ? 'color: #48bb78;' : 'color: #f56565;'}">
                                ${trendsAnalysis?.lastGrowth ? (trendsAnalysis.lastGrowth.profitGrowth >= 0 ? '+' : '') + trendsAnalysis.lastGrowth.profitGrowth.toFixed(1) + '%' : 'Нет данных'}
                            </div>
                            <div style="font-size: 10px;">средний: ${trendsAnalysis?.avgProfitGrowth?.toFixed(1) || '0'}%</div>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 20px; padding: 16px; background: rgba(102,126,234,0.05); border-radius: 12px;">
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">📅 Сезонность продаж</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                        ${trendsAnalysis?.seasonalityCoeff ? Object.entries(trendsAnalysis.seasonalityCoeff).map(([month, coeff]) => {
                            const height = Math.min(Math.max(coeff * 30, 20), 60);
                            const color = coeff > 1.1 ? '#48bb78' : coeff < 0.9 ? '#f56565' : '#667eea';
                            return `<div style="text-align: center; flex: 1; min-width: 50px;">
                                <div style="font-size: 10px; margin-bottom: 4px;">${month.slice(0, 3)}</div>
                                <div style="height: ${height}px; background: ${color}; border-radius: 4px; width: 100%;"></div>
                                <div style="font-size: 10px; margin-top: 4px;">${coeff.toFixed(1)}x</div>
                            </div>`;
                        }).join('') : '<div>Нет данных</div>'}
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; flex-wrap: wrap; gap: 8px;">
                        <span>🟢 Высокий сезон: ${trendsAnalysis?.highSeasonMonths?.length > 0 ? trendsAnalysis.highSeasonMonths.join(', ') : 'нет'}</span>
                        <span>🔴 Низкий сезон: ${trendsAnalysis?.lowSeasonMonths?.length > 0 ? trendsAnalysis.lowSeasonMonths.join(', ') : 'нет'}</span>
                    </div>
                </div>
                <div style="margin-bottom: 20px; padding: 16px; background: rgba(102,126,234,0.1); border-radius: 12px;">
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">🔮 Прогноз на следующий месяц</div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary);">Прогнозируемая прибыль</div>
                            <div style="font-size: 20px; font-weight: 700; ${(trendsAnalysis?.forecastProfit || 0) >= 0 ? 'color: #48bb78;' : 'color: #f56565;'}">
                                ${trendsAnalysis?.forecastProfit !== null ? formatCurrency(trendsAnalysis.forecastProfit) : 'Недостаточно данных'}
                            </div>
                            <div style="font-size: 10px;">относительно текущей: ${trendsAnalysis?.forecastProfit !== null && f.profit !== 0 ? ((trendsAnalysis.forecastProfit - f.profit) / f.profit * 100).toFixed(1) : '?'}%</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary);">Прогнозируемая выручка</div>
                            <div style="font-size: 20px; font-weight: 700;">${trendsAnalysis?.forecastRevenue !== null ? formatCurrency(trendsAnalysis.forecastRevenue) : 'Недостаточно данных'}</div>
                            <div style="font-size: 10px;">чистая, без НДС</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary);">Точность прогноза</div>
                            <div style="font-size: 20px; font-weight: 700;">${trendsAnalysis?.forecastConfidence !== null ? (trendsAnalysis.forecastConfidence * 100).toFixed(0) + '%' : '?'}</div>
                            <div style="font-size: 10px;">${trendsAnalysis?.forecastConfidence !== null ? (trendsAnalysis.forecastConfidence > 0.7 ? 'высокая достоверность' : trendsAnalysis.forecastConfidence > 0.5 ? 'средняя достоверность' : 'низкая достоверность') : ''}</div>
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div style="padding: 12px; background: rgba(72,187,120,0.1); border-radius: 12px;">
                        <div style="font-size: 11px; color: #48bb78;">📈 Рекомендации</div>
                        <div style="font-size: 12px; margin-top: 8px;">
                            ${trendsAnalysis?.avgProfitGrowth > 10 ? '🚀 Отличный рост! Увеличивайте маркетинговый бюджет.' : 
                              trendsAnalysis?.avgProfitGrowth > 0 ? '📊 Стабильный рост. Работайте над увеличением среднего чека.' :
                              '⚠️ Прибыль снижается. Анализируйте причины и оптимизируйте расходы.'}
                            ${trendsAnalysis?.highSeasonMonths?.length > 0 ? `\n🎯 Готовьтесь к высокому сезону (${trendsAnalysis.highSeasonMonths[0]}).` : ''}
                            ${trendsAnalysis?.forecastProfit !== null && trendsAnalysis.forecastProfit > f.profit ? '\n📈 Прогноз положительный. Увеличивайте запасы.' : trendsAnalysis?.forecastProfit !== null && trendsAnalysis.forecastProfit < f.profit ? '\n📉 Прогноз отрицательный. Будьте готовы к снижению.' : ''}
                        </div>
                    </div>
                    <div style="padding: 12px; background: rgba(102,126,234,0.1); border-radius: 12px;">
                        <div style="font-size: 11px;">📌 Ключевые выводы</div>
                        <div style="font-size: 11px; margin-top: 8px; line-height: 1.4;">
                            • ${trendsAnalysis?.totalProfitGrowth >= 0 ? 'Прибыль растет' : 'Прибыль снижается'} (${trendsAnalysis?.totalProfitGrowth >= 0 ? '+' : ''}${trendsAnalysis?.totalProfitGrowth?.toFixed(1) || '0'}% за период)<br>
                            • Средний рост выручки: ${trendsAnalysis?.avgRevenueGrowth?.toFixed(1) || '0'}% в месяц<br>
                            • ${trendsAnalysis?.highSeasonMonths?.length > 0 ? `Пик продаж ожидается в ${trendsAnalysis.highSeasonMonths[0]}` : 'Ярко выраженной сезонности нет'}<br>
                            • ${trendsAnalysis?.forecastProfit !== null ? (trendsAnalysis.forecastProfit > 0 ? 'Ожидается прибыль' : 'Ожидается убыток') : 'Недостаточно данных для прогноза'}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        
        // ========================
        // СБОРКА ДАШБОРДА
        // ========================
        const dashboardHtml = `${topPanelHtml}
        <div class="dashboard-two-columns">
            <div class="dashboard-col">${revenueHtml}</div>
            <div class="dashboard-col">${tabsPanel}</div>
        </div>
        <div class="dashboard-full-width">${expensesHtml}</div>
        <div class="dashboard-metrics-grid">
            ${ndsHtml}
            ${netRevenueHtml}
            ${profitHtml}
            ${salesHtml}
            ${avgCheckHtml}
            ${costHtml}
            ${avgCostHtml}
        </div>
        <div class="dashboard-full-width">${breakEvenHtml}</div>
        <div class="dashboard-full-width">${trendsHtml}</div>`;
        
        document.getElementById('dashboardMetrics').innerHTML = dashboardHtml;
        
        // ========================
        // ОТРИСОВКА ГРАФИКОВ
        // ========================
        setTimeout(() => {
            renderMiniChartJS('revenueMiniChartNew', monthlyLabels, monthlyRevenues, '#48bb78');
            renderExpenseMiniChartJS('expenseMiniChartNew', monthlyLabels, monthlyExpensesArray, '#f56565');
            renderNetRevenueMiniChart();
            renderProfitMiniChart();
            renderMonthlyLineChart(monthlyLabels, monthlyRevenues);
            renderNdsToRevenueChart(ndsLabels, ndsValues, revenueForNds);
            renderNdsStatsCard(totalNdsPercent, totalNdsAmount, totalRevenueAmount);
            renderSalesChart(monthlyLabels, getMonthlySalesData(window.currentData, monthlyLabels));
        }, 100);
        
        // ========================
        // СЦЕНАРНЫЙ АНАЛИЗ
        // ========================
        let scenarioContainer = document.getElementById('scenarioAnalysisContainer');
        if (!scenarioContainer && document.getElementById('dashboardMetrics')) {
            const scenarioSection = document.createElement('div');
            scenarioSection.id = 'scenarioSection';
            scenarioSection.className = 'metrics-grid';
            scenarioSection.style.marginTop = '24px';
            scenarioSection.innerHTML = `
                <div class="metric-card" style="grid-column: span 4; padding: 20px;">
                    <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 20px;">🎯</span>
                        <span>Сценарный анализ</span>
                        <span style="font-size: 11px; color: #a0aec0; margin-left: auto;">двигайте ползунки — результаты меняются в реальном времени</span>
                    </div>
                    <div id="scenarioAnalysisContainer"></div>
                </div>
            `;
            document.getElementById('dashboardMetrics').appendChild(scenarioSection);
            scenarioContainer = document.getElementById('scenarioAnalysisContainer');
        }
        if (scenarioContainer) {
            scenarioContainer.innerHTML = renderScenarioAnalysis(f, totalSalesQuantity, avgCheck, avgCost, costData);
            initScenarioHandlers(f, totalSalesQuantity, avgCheck, avgCost, costData);
        }
        
        // ========================
        // АНОМАЛИИ
        // ========================
        let anomaliesContainer = document.getElementById('anomaliesContainer');
        if (!anomaliesContainer && document.getElementById('dashboardMetrics')) {
            const anomaliesSection = document.createElement('div');
            anomaliesSection.id = 'anomaliesSection';
            anomaliesSection.className = 'metrics-grid';
            anomaliesSection.style.marginTop = '24px';
            anomaliesSection.innerHTML = `
                <div class="metric-card" style="grid-column: span 4; padding: 20px;">
                    <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 20px;">🔍</span>
                        <span>Аномалии и выбросы</span>
                        <span style="font-size: 11px; color: #a0aec0; margin-left: auto;">автоматическое обнаружение отклонений</span>
                    </div>
                    <div id="anomaliesContainer"></div>
                </div>
            `;
            document.getElementById('dashboardMetrics').appendChild(anomaliesSection);
            anomaliesContainer = document.getElementById('anomaliesContainer');
        }
        if (anomaliesContainer) {
            anomaliesContainer.innerHTML = renderAnomaliesBlock(window.currentData, f, totalSalesQuantity, avgCheck);
        }
        
        // ========================
        // МАТРИЦА 4 КВАДРАНТОВ
        // ========================
        let quadrantContainer = document.getElementById('quadrantMatrixContainer');
        if (!quadrantContainer && document.getElementById('dashboardMetrics')) {
            const quadrantSection = document.createElement('div');
            quadrantSection.id = 'quadrantSection';
            quadrantSection.className = 'metrics-grid';
            quadrantSection.style.marginTop = '24px';
            quadrantSection.innerHTML = `
                <div class="metric-card" style="grid-column: span 4; padding: 20px;">
                    <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 20px;">🎯</span>
                        <span>Матрица "Маржинальность vs Оборачиваемость"</span>
                        <span style="font-size: 11px; color: #a0aec0; margin-left: auto;">4 квадранта стратегии</span>
                    </div>
                    <div id="quadrantMatrixContainer"></div>
                </div>
            `;
            document.getElementById('dashboardMetrics').appendChild(quadrantSection);
            quadrantContainer = document.getElementById('quadrantMatrixContainer');
        }
        if (quadrantContainer) {
            quadrantContainer.innerHTML = renderQuadrantMatrix(window.currentData, f);
        }
        
        // ========================
        // НАСТРОЙКА ОБРАБОТЧИКОВ
        // ========================
        setTimeout(() => {
            setupCollapsibleHandlers();
            initTabs();
        }, 200);
        
    } catch(e) {
        console.error('Ошибка рендера:', e);
    } finally {
        isRendering = false;
    }
}

function getMonthlySalesData(data, monthlyLabels) {
    const salesByMonth = {};
    monthlyLabels.forEach(month => { salesByMonth[month] = 0; });
    data.forEach(d => {
        if (d.месяц && monthlyLabels.includes(d.месяц)) {
            const article = d.статья?.toLowerCase() || '';
            if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) {
                salesByMonth[d.месяц] += Math.abs(d.сумма || 0);
            }
        }
    });
    return monthlyLabels.map(m => salesByMonth[m] || 0);
}

// ========================
// СТРАНИЦА КАНАЛА
// ========================

function renderChannelPage(channelKey) {
    const channel = window.CHANNEL_MAPPING ? window.CHANNEL_MAPPING[channelKey] : null;
    if (!channel) return;
    const f = window.calculateFinancials ? window.calculateFinancials(window.currentData, channelKey) : { totalRevenue: 0, netRevenue: 0, totalNDS: 0, totalExpenses: 0, profit: 0, profitability: 0 };
    let sales = window.currentData.filter(d => d.канал === channel.displayName && d.статья === 'Продажи шт.').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    let costData = window.currentData.filter(d => d.канал === channel.displayName && d.тип === 'Расход' && d.подканал === 'Себестоимость сырья').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
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

// ========================
// РАЗБИВКА ПО КАНАЛАМ (ДЛЯ БЛОКА ЧИСТОЙ ВЫРУЧКИ)
// ========================

/**
 * Генерирует разбивку по каналам для чистой выручки
 */
function generateChannelBreakdown(title, dataKey, channels, isCurrency = true, suffix = '') {
    if (!channels || channels.length === 0) {
        return `<div style="padding: 16px; text-align: center;">Нет данных по каналам для ${title}</div>`;
    }
    
    let html = `<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">
        <span style="font-size: 12px; font-weight: 600; color: #667eea;">${title}</span>
    </div>`;
    
    const total = channels.reduce((sum, ch) => sum + (ch[dataKey] || ch.value || 0), 0);
    
    channels.forEach((channel, idx) => {
        const value = channel[dataKey] || channel.value || 0;
        const percent = total > 0 ? (value / total) * 100 : 0;
        const formattedValue = isCurrency ? formatCurrency(value) : value.toLocaleString('ru-RU') + (suffix || '');
        
        html += `
            <div class="breakdown-channel-item" style="margin-bottom: 16px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 2;">
                        <span style="font-weight: 600; font-size: 14px;">${channel.name}</span>
                        <span style="font-weight: 700; font-size: 13px;">${formattedValue}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end;">
                        <span style="font-size: 11px; background: rgba(102,126,234,0.15); padding: 2px 8px; border-radius: 12px;">${percent.toFixed(1)}%</span>
                    </div>
                </div>
                <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="breakdown-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px;"></div>
                </div>
            </div>
        `;
    });
    
    setTimeout(() => {
        document.querySelectorAll('.breakdown-progress-bar').forEach((bar, i) => {
            const targetPercent = channels[i] ? (channels[i].value / total) * 100 : 0;
            setTimeout(() => { bar.style.width = Math.min(targetPercent, 100) + '%'; }, 100);
        });
        document.querySelectorAll('.breakdown-channel-item').forEach((item, i) => {
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 50);
        });
    }, 200);
    
    return html;
}

/**
 * Генерирует разбивку прибыли по каналам
 */
function generateProfitByChannels(f, revenueChannels, expenseChannels, netRevenueByChannel) {
    let channelsProfit = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    allChannels.forEach(channel => {
        const netRevenueData = netRevenueByChannel.find(r => r.name === channel);
        const expenseData = expenseChannels.find(e => e.name === channel);
        const netRevenue = netRevenueData ? netRevenueData.value : 0;
        const expense = expenseData ? expenseData.total : 0;
        const profit = netRevenue - expense;
        const profitability = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
        if (profit !== 0 && netRevenue > 0) {
            channelsProfit.push({ name: channel, netRevenue: netRevenue, expense: expense, profit: profit, profitability: profitability });
        }
    });
    
    channelsProfit.sort((a, b) => b.profit - a.profit);
    const totalProfit = channelsProfit.reduce((sum, ch) => sum + ch.profit, 0);
    
    if (channelsProfit.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    }
    
    let html = '<div class="profit-channels-list">';
    html += '<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">';
    html += '<span style="font-size: 12px; font-weight: 600; color: #667eea;">РАЗБИВКА ПО КАНАЛАМ</span>';
    html += '</div>';
    
    channelsProfit.forEach((channel, idx) => {
        const profitClass = channel.profit >= 0 ? 'positive' : 'negative';
        const profitPercent = totalProfit > 0 ? (channel.profit / totalProfit) * 100 : 0;
        html += `
            <div class="profit-channel-item" style="margin-bottom: 16px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 2;">
                        <span style="font-weight: 600; font-size: 14px;">${channel.name}</span>
                        <span class="${profitClass}" style="font-weight: 700; font-size: 13px;">${formatCurrency(channel.profit)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end;">
                        <span style="font-size: 12px; font-weight: 600;">Рентабельность: ${channel.profitability.toFixed(1)}%</span>
                        <span style="font-size: 11px; background: rgba(102,126,234,0.15); padding: 2px 8px; border-radius: 12px;">${profitPercent.toFixed(1)}%</span>
                    </div>
                </div>
                <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="profit-progress-bar" style="width: 0%; height: 100%; background: ${channel.profit >= 0 ? 'linear-gradient(90deg, #48bb78, #38a169)' : 'linear-gradient(90deg, #f56565, #ed8936)'}; border-radius: 4px;"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    setTimeout(() => {
        document.querySelectorAll('.profit-progress-bar').forEach((bar, i) => {
            const targetWidth = channelsProfit[i] ? Math.min(Math.abs((channelsProfit[i].profit / totalProfit) * 100), 100) : 0;
            setTimeout(() => { bar.style.width = targetWidth + '%'; }, 100);
        });
        document.querySelectorAll('.profit-channel-item').forEach((item, i) => {
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 50);
        });
    }, 200);
    
    return html;
}

/**
 * Генерирует разбивку продаж по каналам
 */
function generateSalesBreakdown(data) {
    let salesByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    allChannels.forEach(channel => {
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSales = sales + salesRef;
        if (totalSales > 0) {
            salesByChannel.push({ name: channel, sales: totalSales });
        }
    });
    
    if (salesByChannel.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по продажам</div>';
    }
    
    salesByChannel.sort((a, b) => b.sales - a.sales);
    const totalSales = salesByChannel.reduce((sum, ch) => sum + ch.sales, 0);
    
    let html = '<div class="sales-channels-list">';
    html += '<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">';
    html += '<span style="font-size: 12px; font-weight: 600; color: #667eea;">ПРОДАЖИ ПО КАНАЛАМ (ШТ)</span>';
    html += '</div>';
    
    salesByChannel.forEach((channel, idx) => {
        const percent = (channel.sales / totalSales) * 100;
        html += `
            <div class="sales-channel-item" style="margin-bottom: 16px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 2;">
                        <span style="font-weight: 600; font-size: 14px;">${channel.name}</span>
                        <span style="font-weight: 700; font-size: 13px;">${new Intl.NumberFormat('ru-RU').format(channel.sales)} шт</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end;">
                        <span style="font-size: 11px; background: rgba(102,126,234,0.15); padding: 2px 8px; border-radius: 12px;">${percent.toFixed(1)}%</span>
                    </div>
                </div>
                <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="sales-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4299e1, #667eea); border-radius: 4px;"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    setTimeout(() => {
        document.querySelectorAll('.sales-progress-bar').forEach((bar, i) => {
            const targetWidth = salesByChannel[i] ? (salesByChannel[i].sales / totalSales) * 100 : 0;
            setTimeout(() => { bar.style.width = targetWidth + '%'; }, 100);
        });
        document.querySelectorAll('.sales-channel-item').forEach((item, i) => {
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 50);
        });
    }, 200);
    
    return html;
}

/**
 * Генерирует разбивку среднего чека по каналам
 */
function generateAverageCheckBreakdown(data) {
    let avgCheckByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    let totalNetRevenue = 0;
    let totalSales = 0;
    
    allChannels.forEach(channel => {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSalesChannel = sales + salesRef;
        const netRevenue = revenue - ndsOut;
        const avgCheck = totalSalesChannel > 0 ? netRevenue / totalSalesChannel : 0;
        if (netRevenue > 0 && totalSalesChannel > 0) {
            avgCheckByChannel.push({ name: channel, avgCheck: avgCheck });
        }
    });
    
    if (avgCheckByChannel.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    }
    
    avgCheckByChannel.sort((a, b) => b.avgCheck - a.avgCheck);
    const overallAvgCheck = avgCheckByChannel.reduce((sum, ch) => sum + ch.avgCheck, 0) / avgCheckByChannel.length;
    
    let html = '<div class="avgcheck-channels-list">';
    html += '<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">';
    html += '<span style="font-size: 12px; font-weight: 600; color: #667eea;">СРЕДНИЙ ЧЕК ПО КАНАЛАМ</span>';
    html += '<span style="font-size: 11px; margin-left: 8px;">(сортировка по убыванию)</span>';
    html += '</div>';
    
    avgCheckByChannel.forEach((channel, idx) => {
        const deviation = ((channel.avgCheck - overallAvgCheck) / overallAvgCheck) * 100;
        const deviationClass = deviation >= 0 ? 'positive' : 'negative';
        const deviationText = deviation >= 0 ? `↑ ${deviation.toFixed(1)}% выше среднего` : `↓ ${Math.abs(deviation).toFixed(1)}% ниже среднего`;
        let medal = '';
        if (idx === 0) medal = '🥇';
        else if (idx === 1) medal = '🥈';
        else if (idx === 2) medal = '🥉';
        
        html += `
            <div class="avgcheck-channel-item" style="margin-bottom: 20px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">${medal}</span>
                        <span style="font-weight: 600; font-size: 15px;">${channel.name}</span>
                        <span style="font-weight: 700; font-size: 16px; color: #667eea;">${formatCurrency(channel.avgCheck)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="${deviationClass}" style="font-size: 12px; font-weight: 500;">${deviationText}</span>
                    </div>
                </div>
                <div style="background: rgba(102,126,234,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="avgcheck-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px;"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    setTimeout(() => {
        document.querySelectorAll('.avgcheck-progress-bar').forEach((bar, i) => {
            const targetWidth = avgCheckByChannel[i] ? (avgCheckByChannel[i].avgCheck / (overallAvgCheck * 2)) * 100 : 0;
            setTimeout(() => { bar.style.width = targetWidth + '%'; }, 100);
        });
        document.querySelectorAll('.avgcheck-channel-item').forEach((item, i) => {
            setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateX(0)'; }, i * 50);
        });
    }, 200);
    
    return html;
}

// Экспорт в window
window.renderDashboard = renderDashboard;
window.renderChannelPage = renderChannelPage;
window.formatCurrency = formatCurrency;
window.showNotification = showNotification;
window.getPreviousMonths = getPreviousMonths;

console.log('✅ dashboardRender.js: ПОЛНЫЙ файл загружен (' + document.querySelectorAll('script').length + ' скриптов)');
