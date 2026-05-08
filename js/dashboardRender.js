// ========================
// dashboardRender.js - ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРИНГА ДАШБОРДА
// ========================

// Глобальные переменные
let revenueChart = null;
let isRendering = false;

// ========================
// КОЛЛАПСИБЕЛЬНЫЙ БЛОК (с анимацией)
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
    
    const chartHtml = (monthlyValues && monthlyValues.length >= 2) ? 
    `<div class="revenue-chart-wrapper" style="margin-top: 12px; width: 100%;">
        <canvas id="${isExpense ? 'expenseMiniChartNew' : 'revenueMiniChartNew'}" style="height: 70px; width: 100%; display: block;"></canvas>
    </div>` : '';
    
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
// РАЗБИВКИ ДЛЯ ОСНОВНЫХ БЛОКОВ
// ========================

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
            totalNetRevenue += netRevenue;
            totalSales += totalSalesChannel;
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

function generateCostBreakdown(data) {
    let costByChannel = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    let totalCost = 0;
    let totalRevenue = 0;
    
    allChannels.forEach(channel => {
        let cost = data.filter(d => d.канал === channel && d.тип === 'Расход' && d.подканал === 'Себестоимость сырья')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        
        cost += data.filter(d => d.канал === channel && d.статья === 'Себестоимость сырья')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        cost += data.filter(d => d.канал === channel && d.статья === 'Себестоимость товаров')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        cost += data.filter(d => d.канал === channel && d.статья === 'Себестоимость')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        cost += data.filter(d => d.канал === channel && d.подканал === 'Закупка товаров' && d.тип === 'Расход')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        const netRevenue = revenue - ndsOut;
        const costToRevenue = netRevenue > 0 ? (cost / netRevenue) * 100 : 0;
        const profit = netRevenue - cost;
        const marginAfterCost = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
        
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && 
            (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи')))
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSales = sales + salesRef;
        const costPerUnit = totalSales > 0 ? cost / totalSales : 0;
        
        if (cost > 0) {
            costByChannel.push({
                name: channel,
                cost: cost,
                costToRevenue: costToRevenue,
                marginAfterCost: marginAfterCost,
                costPerUnit: costPerUnit,
                netRevenue: netRevenue,
                sales: totalSales
            });
            totalCost += cost;
            totalRevenue += netRevenue;
        }
    });
    
    if (costByChannel.length === 0) {
        return '<div style="text-align: center; padding: 16px; color: var(--text-secondary);">Нет данных по себестоимости<br><small>Проверьте наличие подканала "Себестоимость сырья" в Excel</small></div>';
    }
    
    costByChannel.sort((a, b) => b.cost - a.cost);
    const avgCostToRevenue = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;
    
    let html = '<div class="cost-channels-list">';
    html += '<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(102,126,234,0.2);">';
    html += '<span style="font-size: 12px; font-weight: 600; color: #667eea;">СЕБЕСТОИМОСТЬ ПО КАНАЛАМ</span>';
    html += '<span style="font-size: 11px; color: var(--text-secondary); margin-left: 8px;">(доля в выручке и эффективность)</span>';
    html += '</div>';
    
    costByChannel.forEach((channel, idx) => {
        const percentOfTotal = (channel.cost / totalCost) * 100;
        const efficiencyClass = channel.costToRevenue <= avgCostToRevenue ? 'positive' : 'negative';
        const efficiencyText = channel.costToRevenue <= avgCostToRevenue 
            ? `↓ на ${(avgCostToRevenue - channel.costToRevenue).toFixed(1)}% лучше среднего` 
            : `↑ на ${(channel.costToRevenue - avgCostToRevenue).toFixed(1)}% хуже среднего`;
        
        let costLevelClass = '';
        let costLevelText = '';
        if (channel.costToRevenue < 30) {
            costLevelClass = 'positive';
            costLevelText = 'Низкая';
        } else if (channel.costToRevenue < 50) {
            costLevelClass = '';
            costLevelText = 'Средняя';
        } else {
            costLevelClass = 'negative';
            costLevelText = 'Высокая';
        }
        
        html += `
            <div class="cost-channel-item" style="margin-bottom: 20px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 600; font-size: 15px;">${channel.name}</span>
                        <span style="font-weight: 700; font-size: 16px; color: #f56565;">${formatCurrency(channel.cost)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="${efficiencyClass}" style="font-size: 12px; font-weight: 500;">${efficiencyText}</span>
                    </div>
                </div>
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); flex-wrap: wrap; gap: 8px;">
                    <span>📊 Доля в общей себестоимости: <strong>${percentOfTotal.toFixed(1)}%</strong></span>
                    <span>💰 Себестоимость 1 шт: <strong>${formatCurrency(channel.costPerUnit)}</strong></span>
                    <span class="${costLevelClass}">📈 Уровень: <strong>${costLevelText}</strong> (${channel.costToRevenue.toFixed(1)}% от выручки)</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                        <span>Маржинальность после себестоимости: ${channel.marginAfterCost.toFixed(1)}%</span>
                        <span>Продажи: ${new Intl.NumberFormat('ru-RU').format(channel.sales)} шт</span>
                    </div>
                </div>
                <div style="background: rgba(245,101,101,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="cost-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #f56565, #ed8936); border-radius: 4px;"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    setTimeout(() => {
        document.querySelectorAll('.cost-progress-bar').forEach((bar, i) => {
            const targetWidth = costByChannel[i] ? (costByChannel[i].cost / totalCost) * 100 : 0;
            setTimeout(() => { bar.style.width = targetWidth + '%'; }, 100);
        });
        document.querySelectorAll('.cost-channel-item').forEach((item, i) => {
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, i * 50);
        });
    }, 200);
    
    return html;
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
        container.innerHTML = `<div class="metrics-grid">
            <div class="metric-card"><div class="metric-title">💰 Выручка (с НДС)</div><div class="metric-value">${formatCurrency(f.totalRevenue)}</div></div>
            <div class="metric-card"><div class="metric-title">💸 НДС</div><div class="metric-value">${formatCurrency(f.totalNDS)}</div></div>
            <div class="metric-card"><div class="metric-title">📊 Выручка чистая</div><div class="metric-value">${formatCurrency(f.netRevenue)}</div></div>
            <div class="metric-card"><div class="metric-title">📉 Расходы</div><div class="metric-value">${formatCurrency(f.totalExpenses)}</div></div>
            <div class="metric-card"><div class="metric-title">📈 Прибыль</div><div class="metric-value ${f.profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(f.profit)}</div></div>
            <div class="metric-card"><div class="metric-title">📊 Рентабельность</div><div class="metric-value">${f.profitability.toFixed(1)}%</div></div>
        </div>
        <div class="metrics-grid" style="margin-top:20px">
            <div class="metric-card"><div class="metric-title">📦 Продажи (шт)</div><div class="metric-value">${new Intl.NumberFormat('ru-RU').format(sales)}</div></div>
            <div class="metric-card"><div class="metric-title">💰 Средний чек</div><div class="metric-value">${formatCurrency(avgCheck)}</div></div>
            <div class="metric-card"><div class="metric-title">🏭 Себестоимость</div><div class="metric-value">${formatCurrency(costData)}</div></div>
            <div class="metric-card"><div class="metric-title">📊 Себестоимость 1 шт</div><div class="metric-value">${formatCurrency(avgCost)}</div></div>
        </div>`;
    }
}

// ========================
// ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРИНГА ДАШБОРДА
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
        // ГЕНЕРАЦИЯ ОСНОВНЫХ БЛОКОВ
        // ========================
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
                <canvas id="netRevenueMiniChart" style="height: 70px; width: 100%;"></canvas>
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
                <canvas id="profitMiniChart" style="height: 70px; width: 100%;"></canvas>
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
        
        // Фиксим отступы у карточек без графиков
        setTimeout(() => {
            document.querySelectorAll('.metric-card').forEach(card => {
                const hasCanvas = card.querySelector('canvas');
                const hasChartWrapper = card.querySelector('.revenue-chart-wrapper');
                if (!hasCanvas || (hasChartWrapper && hasChartWrapper.style.display === 'none')) {
                    card.classList.add('no-chart');
                } else {
                    card.classList.remove('no-chart');
                }
            });
        }, 200);
        
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
            initTabsNew();
        }, 200);
        
    } catch(e) {
        console.error('Ошибка рендера:', e);
    } finally {
        isRendering = false;
    }
}

// Экспорт в window
window.renderDashboard = renderDashboard;
window.renderChannelPage = renderChannelPage;

console.log('✅ dashboardRender.js: загружен');
