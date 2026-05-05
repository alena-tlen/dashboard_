// ========================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================

let isRendering = false;           // Флаг, чтобы избежать двойного рендера
let revenueChart = null;           // Экземпляр графика Chart.js для выручки
let miniRevenueChart = null;       // Мини-график выручки
let miniExpenseChart = null;       // Мини-график расходов
let netRevenueMiniChart = null;    // Мини-график чистой выручки
let profitMiniChart = null;        // Мини-график прибыли

// ========================
// ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРИНГА
// ========================

/**
 * Главная функция отрисовки дашборда
 * Собирает все компоненты и отображает их на странице
 */
function renderDashboard() {
    // Защита от одновременного выполнения
    if (isRendering) {
        console.log('Рендер уже выполняется, пропускаем');
        return;
    }
    isRendering = true;
    
    try {
        // Проверяем, есть ли данные
        if (!currentData.length) {
            document.getElementById('dashboardMetrics').innerHTML = '<div class="loading">Нет данных</div>';
            isRendering = false;
            return;
        }
        
        // ========================
        // 1. ПОЛУЧАЕМ ОСНОВНЫЕ ПОКАЗАТЕЛИ
        // ========================
        
        // Базовые финансовые расчеты
        const f = calculateFinancials(currentData);
        
        // Собираем доходы и расходы по каналам
        const revenueByChannel = {};
        const expensesByChannel = {};
        
        currentData.forEach(d => {
            if (d.тип === 'Доход' && d.канал) {
                if (!revenueByChannel[d.канал]) revenueByChannel[d.канал] = { total: 0, items: {} };
                revenueByChannel[d.канал].total += d.сумма;
                if (d.подканал) {
                    revenueByChannel[d.канал].items[d.подканал] = 
                        (revenueByChannel[d.канал].items[d.подканал] || 0) + d.сумма;
                }
            }
            if (d.тип === 'Расход' && d.канал) {
                if (!expensesByChannel[d.канал]) expensesByChannel[d.канал] = { total: 0, items: {} };
                const amount = Math.abs(d.сумма);
                expensesByChannel[d.канал].total += amount;
                if (d.подканал) {
                    expensesByChannel[d.канал].items[d.подканал] = 
                        (expensesByChannel[d.канал].items[d.подканал] || 0) + amount;
                }
            }
        });
        
        // Преобразуем в массивы для отображения
        const revenueChannelsList = Object.entries(revenueByChannel)
            .filter(([_, data]) => data.total > 0)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([name, data]) => ({
                name,
                total: data.total,
                items: Object.entries(data.items).map(([itemName, amount]) => ({ name: itemName, amount }))
            }));
        
        const expenseChannelsList = Object.entries(expensesByChannel)
            .filter(([_, data]) => data.total > 0)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([name, data]) => ({
                name,
                total: data.total,
                items: Object.entries(data.items).map(([itemName, amount]) => ({ name: itemName, amount }))
            }));
        
        // ========================
        // 2. РАСЧЕТ ПРОДАЖ И СРЕДНЕГО ЧЕКА
        // ========================
        
        let salesFromArticle = currentData.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) 
                   || d.статья === 'Продажи шт.';
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        
        let salesFromReference = currentData.filter(d => 
            d.тип === 'Справочная' && 
            (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))
        ).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        
        const totalSalesQuantity = salesFromArticle + salesFromReference;
        const avgCheck = totalSalesQuantity > 0 ? f.netRevenue / totalSalesQuantity : 0;
        
        // ========================
        // 3. СБОР ДАННЫХ ПО МЕСЯЦАМ ДЛЯ ГРАФИКОВ
        // ========================
        
        const monthlyDataMap = new Map();
        MONTHS_ORDER.forEach(month => { 
            monthlyDataMap.set(month, { revenue: 0, profit: 0, expenses: 0 }); 
        });
        
        currentData.forEach(d => {
            if (d.месяц && MONTHS_ORDER.includes(d.месяц)) {
                const monthData = monthlyDataMap.get(d.месяц);
                if (d.тип === 'Доход') monthData.revenue += d.сумма;
                if (d.тип === 'Расход') monthData.expenses += Math.abs(d.сумма);
            }
        });
        
        monthlyDataMap.forEach((data, month) => {
            const ndsOut = currentData
                .filter(d => d.месяц === month && d.статья === 'НДС' && d.подканал === 'НДС исходящий')
                .reduce((sum, d) => sum + d.сумма, 0);
            const netRev = data.revenue - ndsOut;
            data.profit = netRev - data.expenses;
            data.netRevenue = netRev;
        });
        
        const monthlyLabels = MONTHS_ORDER.filter(m => monthlyDataMap.get(m).revenue > 0 || monthlyDataMap.get(m).profit !== 0);
        const monthlyRevenues = monthlyLabels.map(m => monthlyDataMap.get(m).revenue / 1000);
        const monthlyExpensesArray = monthlyLabels.map(m => (monthlyDataMap.get(m)?.expenses || 0) / 1000);
        
        // ========================
        // 4. РАСЧЕТ ДИНАМИКИ (ИЗМЕНЕНИЯ)
        // ========================
        
        function getChangePercent(current, previous) {
            if (!previous || previous === 0) return null;
            const change = ((current - previous) / previous) * 100;
            return { 
                percent: change, 
                isPositive: change >= 0, 
                formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%` 
            };
        }
        
        function getChangeHtml(change, isExpense = false) {
            if (!change) return '';
            let isPositive = change.isPositive;
            if (isExpense) isPositive = !isPositive;
            const colorClass = isPositive ? 'change-positive' : 'change-negative';
            return `<span class="metric-change ${colorClass}" style="font-size: 11px; padding: 2px 6px; border-radius: 12px; display: inline-block; margin-left: 8px;">${change.formatted}</span>`;
        }
        
        // Получаем данные за предыдущий период для сравнения
        const prevMonths = getPreviousMonths(currentFilters.month || [], 1);
        let prevData = [];
        if (prevMonths.length > 0 && currentFilters.year) {
            let prevYear = parseInt(currentFilters.year);
            if (prevMonths[0] === 'декабрь' && (currentFilters.month || [])[0] === 'январь') {
                prevYear = prevYear - 1;
            }
            prevData = originalData.filter(row => {
                if (currentFilters.company && row.компания !== currentFilters.company) return false;
                if (row.год != prevYear) return false;
                if (!prevMonths.includes(row.месяц)) return false;
                return true;
            });
        }
        
        const fPrev = prevData.length > 0 ? calculateFinancials(prevData) : null;
        
        // Вычисляем изменения
        const revenueChange = fPrev ? getChangePercent(f.totalRevenue, fPrev.totalRevenue) : null;
        const netRevenueChange = fPrev ? getChangePercent(f.netRevenue, fPrev.netRevenue) : null;
        const expensesChange = fPrev ? getChangePercent(f.totalExpenses, fPrev.totalExpenses) : null;
        const profitChange = fPrev ? getChangePercent(f.profit, fPrev.profit) : null;
        const profitabilityChange = fPrev ? getChangePercent(f.profitability, fPrev.profitability) : null;
        const ndsChange = fPrev ? getChangePercent(f.totalNDS, fPrev.totalNDS) : null;

        // ========================
        // 5. СЕБЕСТОИМОСТЬ
        // ========================
        
        let costData = currentData
            .filter(d => d.тип === 'Расход' && d.подканал === 'Себестоимость сырья')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        
        costData += currentData.filter(d => d.статья === 'Себестоимость сырья')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        costData += currentData.filter(d => d.статья === 'Себестоимость товаров')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        costData += currentData.filter(d => d.статья === 'Себестоимость')
            .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        
        const avgCost = totalSalesQuantity > 0 ? costData / totalSalesQuantity : 0;
        
        // ========================
        // 6. НДС ПО МЕСЯЦАМ
        // ========================
        
        const monthlyNds = {};
        MONTHS_ORDER.forEach(month => { monthlyNds[month] = 0; });
        
        currentData.forEach(d => {
            if (d.месяц && MONTHS_ORDER.includes(d.месяц)) {
                if (d.статья === 'НДС' && d.подканал === 'НДС исходящий') {
                    monthlyNds[d.месяц] += d.сумма;
                } else if (d.статья === 'НДС' && d.подканал === 'НДС входящий') {
                    monthlyNds[d.месяц] -= d.сумма;
                }
            }
        });
        
        const ndsLabels = monthlyLabels;
        const ndsValues = ndsLabels.map(m => monthlyNds[m] || 0);
        const revenueForNds = ndsLabels.map(m => monthlyDataMap.get(m)?.revenue || 0);
        
        const totalNdsAmount = f.totalNDS;
        const totalRevenueAmount = f.totalRevenue;
        const totalNdsPercent = totalRevenueAmount > 0 ? (Math.abs(totalNdsAmount) / totalRevenueAmount) * 100 : 0;
        
        // ========================
        // 7. АНАЛИЗ ДЛЯ РЕКОМЕНДАЦИЙ
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
        
        if (avgCheck < 1000 && avgCheck > 0) {
            recommendations.push('💰 Средний чек ниже 1000₽. Работайте над апселлингом.');
        } else if (avgCheck > 5000) {
            recommendations.push('💎 Высокий средний чек. Удерживайте качество обслуживания.');
        }
        
        const efficiency = f.profit / (f.totalExpenses || 1);
        
        // Определяем лидера по выручке
        const revenueByChannelMap = {};
        currentData.forEach(d => {
            if (d.тип === 'Доход' && d.канал) {
                revenueByChannelMap[d.канал] = (revenueByChannelMap[d.канал] || 0) + d.сумма;
            }
        });
        const topChannelData = Object.entries(revenueByChannelMap).sort((a, b) => b[1] - a[1])[0];
        
        // ========================
        // 8. ГЕНЕРАЦИЯ HTML
        // ========================
        
        // Верхняя панель с состоянием компании
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
            </div>
        `;
        
        // Генерируем блок доходов
        const revenueHtml = createCollapsibleBlock(
            'Доходы по каналам', '💰', f.totalRevenue, revenueChange, 
            revenueChannelsList, false, monthlyDataMap, monthlyLabels, monthlyRevenues, null
        );
        
        // Генерируем блок расходов
        const expensesHtml = createCollapsibleBlock(
            'Расходы по каналам', '📉', f.totalExpenses, expensesChange, 
            expenseChannelsList, true, monthlyDataMap, monthlyLabels, monthlyExpensesArray, f.totalRevenue
        );
        
        // Генерируем метрики для карусели
        const carouselItems = generateCarouselItems();
        
        // Генерируем блок НДС
        const ndsHtml = generateNdsBlock(f, ndsChange, ndsLabels, ndsValues, revenueForNds, totalNdsPercent, totalNdsAmount, totalRevenueAmount);
        
        // Генерируем блок чистой выручки
        const netRevenueHtml = generateNetRevenueBlock(f, netRevenueChange, monthlyLabels, monthlyRevenues);
        
        // Генерируем блок прибыли
        const profitHtml = generateProfitBlock(f, profitChange, profitabilityChange, monthlyLabels, monthlyDataMap);
        
        // Генерируем блок продаж
        const salesHtml = generateSalesBlock(totalSalesQuantity, salesChange, monthlyLabels);
        
        // Генерируем блок среднего чека
        const avgCheckHtml = generateAvgCheckBlock(avgCheck, avgCheckChange);
        
        // Генерируем блок себестоимости
        const costHtml = generateCostBlock(costData, costChange, avgCost, avgCostChange);
        
        // Генерируем блок себестоимости 1 шт
        const avgCostHtml = generateAvgCostBlock(avgCost, avgCostChange);
        
        // ========================
        // 9. СБОРКА ВСЕГО ДАШБОРДА
        // ========================
        
        const dashboardHtml = `
            ${topPanelHtml}
            
            <div class="metrics-grid" style="margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="height: 100%;">${revenueHtml}</div>
                <div class="metric-card" style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
                    <div class="modern-carousel" style="flex: 1; position: relative;">
                        <button class="carousel-nav-btn carousel-nav-prev" id="carouselPrevBtn">◀</button>
                        <div class="modern-carousel-track" id="carouselTrack">${carouselItems}</div>
                        <button class="carousel-nav-btn carousel-nav-next" id="carouselNextBtn">▶</button>
                        <div class="carousel-indicators" id="carouselIndicators"></div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 24px;">${expensesHtml}</div>
            
            <div class="metrics-grid" style="margin-top: 24px;">
                ${ndsHtml}
                ${netRevenueHtml}
                ${profitHtml}
                ${salesHtml}
                ${avgCheckHtml}
                ${costHtml}
                ${avgCostHtml}
            </div>
            
            <div class="metrics-grid" style="margin-top: 24px;">
                <div class="metric-card" style="grid-column: span 4;">
                    <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 18px;">⚖️</span>
                        <span>Точка безубыточности</span>
                    </div>
                    ${renderBreakEvenAnalysisHtml(currentData, f, totalSalesQuantity)}
                </div>
            </div>
            
            <div class="metrics-grid" style="margin-top: 24px;">
                <div class="metric-card" style="grid-column: span 4;">
                    <div class="metric-title" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 18px;">📈</span>
                        <span>Анализ трендов</span>
                    </div>
                    ${renderTrendsAnalysisHtml(currentData, f, totalSalesQuantity)}
                </div>
            </div>
        `;
        
        // Вставляем в DOM
        document.getElementById('dashboardMetrics').innerHTML = dashboardHtml;
        
        // ========================
        // 10. ОТРИСОВКА ГРАФИКОВ
        // ========================
        
        setTimeout(() => {
            renderMiniChartJS('revenueMiniChartNew', monthlyLabels, monthlyRevenues, '#48bb78');
            renderExpenseMiniChartJS('expenseMiniChartNew', monthlyLabels, monthlyExpensesArray, '#f56565');
            renderNetRevenueMiniChart();
            renderProfitMiniChart();
            renderMonthlyLineChart(monthlyLabels, monthlyRevenues);
            renderNdsToRevenueChart(ndsLabels, ndsValues, revenueForNds);
            renderNdsStatsCard(totalNdsPercent, totalNdsAmount, totalRevenueAmount);
            renderSalesChart(monthlyLabels, getMonthlySalesData(currentData, monthlyLabels));
        }, 100);
        
        // ========================
        // 11. НАСТРОЙКА ОБРАБОТЧИКОВ
        // ========================
        
        setTimeout(() => {
            setupCollapsibleHandlers();
            setupCarousel();
        }, 200);
        
    } catch(e) {
        console.error('Ошибка рендера:', e);
    } finally {
        isRendering = false;
    }
}

// ========================
// СОЗДАНИЕ КОЛЛАПСИБЕЛЬНОГО БЛОКА
// ========================

/**
 * Создает блок с возможностью сворачивания/разворачивания
 * @param {string} title - заголовок блока
 * @param {string} icon - иконка
 * @param {number} total - общая сумма
 * @param {Object} totalChange - изменение в процентах
 * @param {Array} channels - массив каналов
 * @param {boolean} isExpense - блок расходов
 * @param {Map} monthlyDataMap - данные по месяцам
 * @param {Array} monthlyLabels - метки месяцев
 * @param {Array} monthlyValues - значения по месяцам
 * @param {number} totalRevenue - общая выручка (для расчета процентов)
 * @returns {string} HTML блока
 */
function createCollapsibleBlock(title, icon, total, totalChange, channels, isExpense = false, 
                                 monthlyDataMap = null, monthlyLabelsParam = null, 
                                 monthlyValues = null, totalRevenue = null) {
    
    // Вычисляем процент изменения
    let changePercent = 0;
    let changeColor = '#48bb78';
    
    if (monthlyValues && monthlyValues.length >= 2) {
        const firstValue = monthlyValues[0];
        const lastValue = monthlyValues[monthlyValues.length - 1];
        if (firstValue !== 0) {
            changePercent = ((lastValue - firstValue) / firstValue) * 100;
            if (changePercent < 0) {
                changeColor = '#f56565';
            }
        }
    }
    
    // Генерируем HTML для каналов
    const channelItemsHtml = channels.map((channel, channelIdx) => {
        const channelPercent = (channel.total / total) * 100;
        const channelPercentOfRevenue = (totalRevenue && totalRevenue > 0) ? (channel.total / totalRevenue) * 100 : null;
        
        const sortedItems = [...channel.items].sort((a, b) => b.amount - a.amount);
        const itemsHtml = sortedItems.map((item, itemIdx) => {
            const itemPercentOfChannel = (item.amount / channel.total) * 100;
            const gradient = isExpense ? 'linear-gradient(90deg, #f56565, #ed8936)' : 'linear-gradient(90deg, #48bb78, #8dd934)';
            
            return `
                <div class="sub-item" style="margin-bottom: 12px; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; transition-delay: ${itemIdx * 0.03}s;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                        <span style="font-size: 13px; font-weight: 500;">${item.name}</span>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <span style="font-size: 13px; font-weight: 600;">${formatCurrency(item.amount)}</span>
                        </div>
                    </div>
                    <div style="background: rgba(102,126,234,0.15); height: 6px; border-radius: 3px; overflow: hidden;">
                        <div class="sub-progress-bar" style="width: ${itemPercentOfChannel}%; height: 100%; background: ${gradient}; border-radius: 3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
        
        const channelGradient = isExpense ? 'linear-gradient(90deg, #f56565, #ed8936)' : 'linear-gradient(90deg, #48bb78, #8dd934)';
        
        return `
            <div class="channel-item" data-channel-name="${channel.name}" style="margin-bottom: 20px; border-bottom: 1px solid rgba(102,126,234,0.2); padding-bottom: 16px;">
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
            </div>
        `;
    }).join('');
    
    // HTML графика
    const chartHtml = (monthlyValues && monthlyValues.length > 0) ? `
        <div class="revenue-chart-wrapper" style="margin-top: 16px;">
            <canvas id="${isExpense ? 'expenseMiniChartNew' : 'revenueMiniChartNew'}" style="height: 100px; width: 100%; display: block;"></canvas>
        </div>
    ` : '';
    
    return `
        <div class="metric-card" style="overflow: hidden; padding: 20px; height: 100%;">
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
        </div>
    `;
}

/**
 * Возвращает иконку для канала
 */
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

// ========================
// ГЕНЕРАЦИЯ БЛОКА НДС
// ========================

function generateNdsBlock(f, ndsChange, ndsLabels, ndsValues, revenueForNds, totalNdsPercent, totalNdsAmount, totalRevenueAmount) {
    return `
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
                    <div class="metric-value" id="ndsPercentValue" style="font-size: 28px;">0%</div>
                    <div class="metric-sub">от выручки</div>
                </div>
            </div>
            
            <canvas id="ndsToRevenueChart" style="height: 140px; width: 100%; margin-top: 8px;"></canvas>
            <div id="ndsStatsCard"></div>
            
            <div class="nds-channels-container" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease;">
                <div style="padding-top: 16px;">${generateNDSBreakdown(currentData)}</div>
            </div>
        </div>
    `;
}

// ========================
// ПРОСТАЯ РАЗБИВКА ДЛЯ ЭФФЕКТИВНОСТИ
// ========================

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
        
        if (netRevenue > 0 && expenses > 0) {
            efficiencyByChannel.push({ 
                name: channel, 
                efficiency: efficiency, 
                profit: profit, 
                expenses: expenses 
            });
        }
    });
    
    if (efficiencyByChannel.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    }
    
    efficiencyByChannel.sort((a, b) => b.efficiency - a.efficiency);
    const avgEfficiency = efficiencyByChannel.reduce((sum, ch) => sum + ch.efficiency, 0) / efficiencyByChannel.length;
    const topChannel = efficiencyByChannel[0];
    
    return `
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 12px; color: #667eea;">📊 ЭФФЕКТИВНОСТЬ ПО КАНАЛАМ</div>
        
        <div style="margin-bottom: 16px; padding: 12px; background: rgba(102,126,234,0.1); border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <div style="font-size: 12px; opacity: 0.7;">Средняя эффективность</div>
                    <div style="font-size: 22px; font-weight: 700; ${avgEfficiency >= 1 ? 'color: #48bb78' : 'color: #f56565'}">${avgEfficiency.toFixed(2)} ₽</div>
                    <div style="font-size: 10px;">прибыли на 1₽ расходов</div>
                </div>
                <div>
                    <div style="font-size: 12px; opacity: 0.7;">🏆 Лидер по эффективности</div>
                    <div style="font-size: 14px; font-weight: 600;">${topChannel.name}</div>
                    <div style="font-size: 12px; color: #48bb78;">${topChannel.efficiency.toFixed(2)} ₽ на 1₽ расходов</div>
                </div>
            </div>
        </div>
        
        ${efficiencyByChannel.map((item, idx) => {
            const color = item.efficiency >= 1 ? '#48bb78' : '#f56565';
            const percent = Math.min((item.efficiency / (avgEfficiency * 2)) * 100, 100);
            let medal = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '';
            
            return `
                <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(102,126,234,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 14px; font-weight: 600;">${medal}${item.name}</span>
                        <span style="font-size: 15px; font-weight: 700; color: ${color};">${item.efficiency.toFixed(2)} ₽</span>
                    </div>
                    <div style="font-size: 12px; opacity: 0.7;">💰 Прибыль: ${formatCurrency(item.profit)}</div>
                    <div style="margin-top: 6px;">
                        <div style="background: #e2e8f0; height: 4px; border-radius: 2px; overflow: hidden;">
                            <div style="width: ${percent}%; height: 100%; background: ${color}; border-radius: 2px;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}


// ========================
// ГЕНЕРАЦИЯ КАРУСЕЛИ МЕТРИК
// ========================

function generateCarouselItems() {
    const f = calculateFinancials(currentData);
    
    // Продажи
    let salesFromArticle = currentData.filter(d => {
        const article = d.статья?.toLowerCase() || '';
        return (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) || d.статья === 'Продажи шт.';
    }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    
    let salesFromReference = currentData.filter(d => d.тип === 'Справочная' && 
        (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи')))
        .reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    
    const totalSalesQuantity = salesFromArticle + salesFromReference;
    const avgCheck = totalSalesQuantity > 0 ? f.netRevenue / totalSalesQuantity : 0;
    const efficiency = f.profit / (f.totalExpenses || 1);
    
    // Данные для разбивки по каналам
    const netRevenueByChannel = calculateNetRevenueByChannel(currentData);
    const salesByChannel = calculateSalesByChannel(currentData);
    const avgCheckByChannel = calculateAvgCheckByChannel(currentData);
    
    return `
        <div class="modern-carousel-slide">
            <div class="metric-card-mini">
                <div class="metric-header">
                    <div class="metric-label">💰 ЧИСТАЯ ВЫРУЧКА</div>
                    <button class="carousel-breakdown-btn" data-type="netRevenue">📊</button>
                </div>
                <div class="metric-value">${formatCurrency(f.netRevenue)}</div>
                <div class="carousel-breakdown-content" id="breakdown-netRevenue" style="display: none;">
                    ${generateSimpleBreakdown(netRevenueByChannel, 'value', true)}
                </div>
            </div>
        </div>
        
        <div class="modern-carousel-slide">
            <div class="metric-card-mini">
                <div class="metric-header">
                    <div class="metric-label">📦 ПРОДАЖИ</div>
                    <button class="carousel-breakdown-btn" data-type="sales">📊</button>
                </div>
                <div class="metric-value">${new Intl.NumberFormat('ru-RU').format(totalSalesQuantity)}</div>
                <div class="carousel-breakdown-content" id="breakdown-sales" style="display: none;">
                    ${generateSimpleBreakdown(salesByChannel, 'sales', false, 'шт')}
                </div>
            </div>
        </div>
        
        <div class="modern-carousel-slide">
            <div class="metric-card-mini">
                <div class="metric-header">
                    <div class="metric-label">💳 СРЕДНИЙ ЧЕК</div>
                    <button class="carousel-breakdown-btn" data-type="avgCheck">📊</button>
                </div>
                <div class="metric-value">${formatCurrency(avgCheck)}</div>
                <div class="carousel-breakdown-content" id="breakdown-avgCheck" style="display: none;">
                    ${generateSimpleBreakdown(avgCheckByChannel, 'avgCheck', true)}
                </div>
            </div>
        </div>
        
        <div class="modern-carousel-slide">
            <div class="metric-card-mini">
                <div class="metric-header">
                    <div class="metric-label">⚡ ЭФФЕКТИВНОСТЬ</div>
                    <button class="carousel-breakdown-btn" data-type="efficiency">📊</button>
                </div>
                <div class="metric-value">${efficiency.toFixed(2)} ₽</div>
                <div class="carousel-breakdown-content" id="breakdown-efficiency" style="display: none;">
                    ${generateEfficiencySimpleBreakdown(currentData)}
                </div>
            </div>
        </div>
    `;
}

// ========================
// ПРОСТАЯ РАЗБИВКА ДЛЯ КАРУСЕЛИ
// ========================

function generateSimpleBreakdown(data, valueKey, isCurrency = true, suffix = '') {
    if (!data || data.length === 0) {
        return '<div style="text-align: center; padding: 16px;">Нет данных по каналам</div>';
    }
    
    const total = data.reduce((sum, item) => sum + item[valueKey], 0);
    const overallAvg = total / data.length;
    
    return `
        <div class="breakdown-list">
            ${data.map((item, idx) => {
                const percent = total > 0 ? (item[valueKey] / total) * 100 : 0;
                const formattedValue = isCurrency ? formatCurrency(item[valueKey]) : item[valueKey].toLocaleString('ru-RU') + suffix;
                const deviation = ((item[valueKey] - overallAvg) / overallAvg) * 100;
                const deviationClass = deviation >= 0 ? 'positive' : 'negative';
                
                return `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="font-size: 12px; font-weight: 500;">${item.name}</span>
                            <span style="font-size: 12px; font-weight: 600;">${formattedValue}</span>
                        </div>
                        <div style="font-size: 10px; margin-bottom: 4px;">
                            <span class="${deviationClass}">${deviation >= 0 ? '↑' : '↓'} ${Math.abs(deviation).toFixed(1)}%</span>
                            <span style="margin-left: 8px;">${percent.toFixed(1)}% доли</span>
                        </div>
                        <div style="background: #e2e8f0; height: 4px; border-radius: 2px; overflow: hidden;">
                            <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ========================
// ГЕНЕРАЦИЯ БЛОКА НДС ПО КАНАЛАМ
// ========================

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
    
    const channelsList = Object.entries(ndsByChannel)
        .filter(([_, d]) => d.total !== 0)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, d]) => ({ name, ndsOut: d.ndsOut, ndsIn: d.ndsIn, total: d.total }));
    
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
    
    // Добавляем обработчики кликов через setTimeout после вставки в DOM
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
// МИНИ-ГРАФИКИ (CHART.JS)
// ========================

function renderMiniChartJS(elementId, labels, data, color) {
    const canvas = document.getElementById(elementId);
    if (!canvas || !labels || labels.length === 0 || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    const areaColor = isDarkMode ? 'rgba(72, 187, 120, 0.08)' : 'rgba(72, 187, 120, 0.05)';
    const lineColor = data[data.length-1] >= data[0] ? '#48bb78' : '#f56565';
    
    if (miniRevenueChart) {
        miniRevenueChart.destroy();
        miniRevenueChart = null;
    }
    
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
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } },
            elements: { point: { radius: 0 } }
        }
    });
}

function renderExpenseMiniChartJS(elementId, labels, data, color) {
    const canvas = document.getElementById(elementId);
    if (!canvas || !labels || labels.length === 0 || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark');
    const areaColor = isDarkMode ? 'rgba(245, 101, 101, 0.08)' : 'rgba(245, 101, 101, 0.05)';
    
    if (miniExpenseChart) {
        miniExpenseChart.destroy();
        miniExpenseChart = null;
    }
    
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

// ========================
// НАСТРОЙКА КАРУСЕЛИ
// ========================

function setupCarousel() {
    const track = document.querySelector('.modern-carousel-track');
    const slides = document.querySelectorAll('.modern-carousel-slide');
    const indicatorsContainer = document.getElementById('carouselIndicators');
    let currentIndex = 0;
    let autoInterval = null;
    let isAnimating = false;
    
    if (!track || slides.length === 0) return;
    
    function updateCarousel(index) {
        if (isAnimating) return;
        isAnimating = true;
        
        currentIndex = (index + slides.length) % slides.length;
        const offset = -currentIndex * 100;
        track.style.transform = `translateX(${offset}%)`;
        
        document.querySelectorAll('.carousel-indicator').forEach((ind, i) => {
            ind.classList.toggle('active', i === currentIndex);
        });
        
        // Закрываем все открытые разбивки
        document.querySelectorAll('.carousel-breakdown-content').forEach(content => {
            content.style.display = 'none';
        });
        document.querySelectorAll('.carousel-breakdown-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        setTimeout(() => { isAnimating = false; }, 300);
    }
    
    function startAutoPlay() {
        if (autoInterval) clearInterval(autoInterval);
        autoInterval = setInterval(() => updateCarousel(currentIndex + 1), 5000);
    }
    
    function stopAutoPlay() {
        if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
    }
    
    // Создаем индикаторы
    indicatorsContainer.innerHTML = '';
    slides.forEach((_, i) => {
        const indicator = document.createElement('div');
        indicator.className = `carousel-indicator ${i === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => { stopAutoPlay(); updateCarousel(i); startAutoPlay(); });
        indicatorsContainer.appendChild(indicator);
    });
    
    // Кнопки навигации
    const prevBtn = document.getElementById('carouselPrevBtn');
    const nextBtn = document.getElementById('carouselNextBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoPlay(); updateCarousel(currentIndex - 1); startAutoPlay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoPlay(); updateCarousel(currentIndex + 1); startAutoPlay(); });
    
    // Пауза при наведении
    const carouselContainer = document.querySelector('.modern-carousel');
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', stopAutoPlay);
        carouselContainer.addEventListener('mouseleave', startAutoPlay);
    }
    
    updateCarousel(0);
    startAutoPlay();
    
    // Обработчики кнопок разбивки
    setTimeout(() => {
        document.querySelectorAll('.carousel-breakdown-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                const content = document.getElementById(`breakdown-${type}`);
                
                document.querySelectorAll('.carousel-breakdown-content').forEach(c => {
                    if (c.id !== `breakdown-${type}`) c.style.display = 'none';
                });
                document.querySelectorAll('.carousel-breakdown-btn').forEach(b => {
                    if (b !== btn) b.classList.remove('active');
                });
                
                if (content.style.display === 'none' || !content.style.display) {
                    content.style.display = 'block';
                    btn.classList.add('active');
                } else {
                    content.style.display = 'none';
                    btn.classList.remove('active');
                }
            });
        });
    }, 100);
}

// ========================
// НАСТРОЙКА КОЛЛАПСИБЕЛЬНЫХ БЛОКОВ
// ========================

function setupCollapsibleHandlers() {
    // Обработчики для доходов/расходов
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
    
    // Обработчики для раскрытия подканалов
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
                
                // Анимация появления подканалов
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
    
    // Обработчики для заголовков каналов
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
