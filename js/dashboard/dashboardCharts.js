// =======================
// dashboardCharts.js - ВСЕ ФУНКЦИИ ГРАФИКОВ
// =======================

// Глобальные переменные для графиков
let miniRevenueChart = null;
let miniExpenseChart = null;

function renderMiniChartJS(elementId, labels, data, color) {
    const canvas = document.getElementById(elementId);
    if (!canvas) return;
    
    const card = canvas.closest('.metric-card');
    
    if (!data || data.length < 2) {
        canvas.style.display = 'none';
        if (card) card.classList.add('no-chart');
        return;
    }
    
    canvas.style.display = 'block';
    if (card) card.classList.remove('no-chart');
    
    if (miniRevenueChart) {
        try { miniRevenueChart.destroy(); } catch(e) {}
        miniRevenueChart = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.width = '100%';
    canvas.style.height = '70px';
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 70);
    gradient.addColorStop(0, 'rgba(72, 187, 120, 0.35)');
    gradient.addColorStop(0.5, 'rgba(72, 187, 120, 0.12)');
    gradient.addColorStop(1, 'rgba(72, 187, 120, 0)');
    
    miniRevenueChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: labels, 
            datasets: [{ 
                data: data, 
                borderColor: '#48bb78', 
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#48bb78',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.3,
                fill: true,
                backgroundColor: gradient,
                segment: {
                    borderDash: (ctx) => ctx.p0.parsed.y === null || ctx.p1.parsed.y === null ? [5, 5] : undefined
                }
            }] 
        },
        options: { 
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                    titleColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    bodyColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    borderColor: '#48bb78',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `💰 ${(context.parsed.y * 1000).toLocaleString('ru-RU')} ₽`;
                        }
                    }
                }
            }, 
            scales: { 
                x: { display: false, grid: { display: false }, ticks: { display: false } },
                y: { display: false, grid: { display: false }, ticks: { display: false }, beginAtZero: false }
            },
            elements: { line: { borderJoin: 'round', borderCap: 'round' } },
            layout: { padding: { top: 5, bottom: 0, left: 0, right: 0 } },
            animation: { duration: 600, easing: 'easeOutCubic' }
        }
    });
}

function renderExpenseMiniChartJS(elementId, labels, data, color) {
    const canvas = document.getElementById(elementId);
    if (!canvas) return;
    
    const card = canvas.closest('.metric-card');
    
    if (!data || data.length < 2) {
        canvas.style.display = 'none';
        if (card) card.classList.add('no-chart');
        return;
    }
    
    canvas.style.display = 'block';
    if (card) card.classList.remove('no-chart');
    
    if (miniExpenseChart) {
        try { miniExpenseChart.destroy(); } catch(e) {}
        miniExpenseChart = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.width = '100%';
    canvas.style.height = '70px';
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 70);
    gradient.addColorStop(0, 'rgba(245, 101, 101, 0.35)');
    gradient.addColorStop(0.5, 'rgba(245, 101, 101, 0.12)');
    gradient.addColorStop(1, 'rgba(245, 101, 101, 0)');
    
    miniExpenseChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: labels, 
            datasets: [{ 
                data: data, 
                borderColor: '#f56565', 
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#f56565',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.3,
                fill: true,
                backgroundColor: gradient
            }] 
        },
        options: { 
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    enabled: true,
                    backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                    titleColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    bodyColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    borderColor: '#f56565',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `📉 ${(context.parsed.y * 1000).toLocaleString('ru-RU')} ₽`;
                        }
                    }
                }
            }, 
            scales: { 
                x: { display: false, grid: { display: false }, ticks: { display: false } },
                y: { display: false, grid: { display: false }, ticks: { display: false } }
            },
            layout: { padding: { top: 5, bottom: 0, left: 0, right: 0 } },
            animation: { duration: 600, easing: 'easeOutCubic' }
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
    
    const card = canvas.closest('.metric-card');
    
    if (values.length < 2) {
        canvas.style.display = 'none';
        if (card) card.classList.add('no-chart');
        return;
    }
    
    canvas.style.display = 'block';
    if (card) card.classList.remove('no-chart');
    
    if (window.netRevenueMiniChartInstance) {
        try { window.netRevenueMiniChartInstance.destroy(); } catch(e) {}
        window.netRevenueMiniChartInstance = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    
    canvas.style.width = '100%';
    canvas.style.height = '70px';
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 70);
    gradient.addColorStop(0, 'rgba(72, 187, 120, 0.35)');
    gradient.addColorStop(0.5, 'rgba(72, 187, 120, 0.12)');
    gradient.addColorStop(1, 'rgba(72, 187, 120, 0)');
    
    window.netRevenueMiniChartInstance = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: labels, 
            datasets: [{ 
                data: values, 
                borderColor: '#48bb78', 
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#48bb78',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.3,
                fill: true,
                backgroundColor: gradient
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true,
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    enabled: values.length >= 2,
                    backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                    titleColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    bodyColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    borderColor: '#48bb78',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `💰 ${(context.parsed.y * 1000).toLocaleString('ru-RU')} ₽`;
                        }
                    }
                }
            }, 
            scales: { 
                x: { display: false, grid: { display: false }, ticks: { display: false } },
                y: { display: false, grid: { display: false }, ticks: { display: false } }
            },
            layout: { padding: { top: 5, bottom: 0, left: 0, right: 0 } },
            animation: { duration: 600, easing: 'easeOutCubic' }
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
    
    const card = canvas.closest('.metric-card');
    
    if (values.length < 2) {
        canvas.style.display = 'none';
        if (card) card.classList.add('no-chart');
        return;
    }
    
    canvas.style.display = 'block';
    if (card) card.classList.remove('no-chart');
    
    if (window.profitMiniChartInstance) {
        try { window.profitMiniChartInstance.destroy(); } catch(e) {}
        window.profitMiniChartInstance = null;
    }
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    
    canvas.style.width = '100%';
    canvas.style.height = '70px';
    
    const lineColor = values[values.length-1] >= values[0] ? '#48bb78' : '#f56565';
    const gradient = ctx.createLinearGradient(0, 0, 0, 70);
    gradient.addColorStop(0, lineColor === '#48bb78' ? 'rgba(72, 187, 120, 0.35)' : 'rgba(245, 101, 101, 0.35)');
    gradient.addColorStop(0.5, lineColor === '#48bb78' ? 'rgba(72, 187, 120, 0.12)' : 'rgba(245, 101, 101, 0.12)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    window.profitMiniChartInstance = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: labels, 
            datasets: [{ 
                data: values, 
                borderColor: lineColor,
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: lineColor,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.3,
                fill: true,
                backgroundColor: gradient
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true,
            plugins: { 
                legend: { display: false }, 
                tooltip: { 
                    enabled: values.length >= 2,
                    backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                    titleColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    bodyColor: isDarkMode ? '#e2e8f0' : '#4a5568',
                    borderColor: lineColor,
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const val = context.parsed.y * 1000;
                            return `${val >= 0 ? '📈' : '📉'} ${val.toLocaleString('ru-RU')} ₽`;
                        }
                    }
                }
            }, 
            scales: { 
                x: { display: false, grid: { display: false }, ticks: { display: false } },
                y: { display: false, grid: { display: false }, ticks: { display: false } }
            },
            layout: { padding: { top: 5, bottom: 0, left: 0, right: 0 } },
            animation: { duration: 600, easing: 'easeOutCubic' }
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

console.log('✅ dashboardCharts.js: загружен');
