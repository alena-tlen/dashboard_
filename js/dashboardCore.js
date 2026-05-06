// ========================
// ОСНОВНЫЕ ФИНАНСОВЫЕ РАСЧЕТЫ
// ========================

/**
 * Рассчитывает основные финансовые показатели (полная версия из монолита)
 * @param {Array} data - массив данных
 * @param {string} channelKey - опционально, для конкретного канала
 * @returns {Object} - объект с показателями
 */
function calculateFinancials(data, channelKey = null) {
    let filtered = applyFilters(data);
    
    if (channelKey && CHANNEL_MAPPING[channelKey]) {
        const targetChannel = CHANNEL_MAPPING[channelKey].displayName;
        filtered = filtered.filter(row => row.канал === targetChannel);
    }
    
    let totalRevenue = 0;
    let totalNdsOut = 0;
    let totalExpenses = 0;
    
    filtered.forEach(row => {
        if (row.тип === 'Доход') {
            totalRevenue += row.сумма;
        } else if (row.статья === 'НДС' && row.подканал === 'НДС исходящий') {
            totalNdsOut += row.сумма;
        } else if (row.тип === 'Расход') {
            totalExpenses += Math.abs(row.сумма);
        }
    });
    
    const netRevenue = totalRevenue - totalNdsOut;
    const profit = netRevenue - totalExpenses;
    const profitability = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
    
    // Общий НДС по всем данным (без фильтрации по каналу)
    let totalNdsOutAll = 0;
    let totalNdsInAll = 0;
    data.forEach(row => {
        if (row.статья === 'НДС' && row.подканал === 'НДС исходящий') {
            totalNdsOutAll += row.сумма;
        }
        if (row.статья === 'НДС' && row.подканал === 'НДС входящий') {
            totalNdsInAll += row.сумма;
        }
    });
    const totalNDS = totalNdsOutAll - totalNdsInAll;
    
    // ========== ПРОДАЖИ И СЕБЕСТОИМОСТЬ ==========
    let totalSalesQuantity = 0;
    data.forEach(row => {
        const article = row.статья?.toLowerCase() || '';
        if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) {
            totalSalesQuantity += Math.abs(row.сумма || 0);
        }
    });
    
    let costData = 0;
    data.forEach(row => {
        if (row.тип === 'Расход' && row.подканал === 'Себестоимость сырья') {
            costData += Math.abs(row.сумма || 0);
        }
    });
    costData += data.filter(d => d.статья === 'Себестоимость сырья').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    costData += data.filter(d => d.статья === 'Себестоимость товаров').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    costData += data.filter(d => d.статья === 'Себестоимость').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    costData += data.filter(d => d.подканал === 'Закупка товаров' && d.тип === 'Расход').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    costData += data.filter(d => d.статья?.toLowerCase().includes('себестоимость') && d.тип === 'Расход').reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
    
    const avgCheck = totalSalesQuantity > 0 ? netRevenue / totalSalesQuantity : 0;
    const avgCost = totalSalesQuantity > 0 ? costData / totalSalesQuantity : 0;
    
    return { 
        totalRevenue, netRevenue, totalNDS, totalExpenses, profit, profitability,
        totalSalesQuantity, costData, avgCheck, avgCost
    };
}

// ========================
// РАСЧЕТ ПО КАНАЛАМ
// ========================

/**
 * Рассчитывает чистую выручку (без НДС) по каждому каналу
 */
function calculateNetRevenueByChannel(data) {
    const netRevenueByChannel = {};
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    for (const channel of allChannels) {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        const netRevenue = revenue - ndsOut;
        if (netRevenue !== 0) {
            netRevenueByChannel[channel] = netRevenue;
        }
    }
    
    return Object.entries(netRevenueByChannel)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));
}

// ========================
// АНАЛИЗ ТОЧКИ БЕЗУБЫТОЧНОСТИ (из монолита)
// ========================

/**
 * Рассчитывает точку безубыточности
 * @param {Array} data - массив данных
 * @param {Object} f - финансовые показатели
 * @param {number} totalSalesQuantity - общее количество продаж
 * @returns {Object} - объект с показателями
 */
function generateBreakEvenAnalysis(data, f, totalSalesQuantity) {
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    let totalFixedCosts = 0;
    let totalVariableCosts = 0;
    let totalRevenue = 0;
    let totalSales = 0;
    
    const fixedCostCategories = ['Логистика', 'Маркетинг', 'Аренда', 'ФОТ', 'Зарплата', 'Аутсорсинг', 'Услуги банка', 'Комиссии'];
    const variableCostCategories = ['Себестоимость сырья', 'Себестоимость товаров', 'Закупка товаров', 'Себестоимость'];
    
    allChannels.forEach(channel => {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        const netRevenue = revenue - ndsOut;
        totalRevenue += netRevenue;
        
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && 
            (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        totalSales += sales + salesRef;
        
        const allExpenses = data.filter(d => d.канал === channel && d.тип === 'Расход');
        
        allExpenses.forEach(expense => {
            const amount = Math.abs(expense.сумма);
            const subCat = expense.подканал || '';
            const article = expense.статья || '';
            
            let isFixed = false;
            let isVariable = false;
            
            for (const cat of fixedCostCategories) {
                if (subCat.includes(cat) || article.includes(cat)) {
                    isFixed = true;
                    break;
                }
            }
            
            for (const cat of variableCostCategories) {
                if (subCat.includes(cat) || article.includes(cat)) {
                    isVariable = true;
                    break;
                }
            }
            
            if (!isFixed && !isVariable) {
                if (subCat.includes('себест') || article.includes('себест')) {
                    isVariable = true;
                } else {
                    isFixed = true;
                }
            }
            
            if (isFixed) totalFixedCosts += amount;
            if (isVariable) totalVariableCosts += amount;
        });
    });
    
    const avgPrice = totalSales > 0 ? totalRevenue / totalSales : 0;
    const avgVariableCostPerUnit = totalSales > 0 ? totalVariableCosts / totalSales : 0;
    const contributionMarginPerUnit = avgPrice - avgVariableCostPerUnit;
    const contributionMarginRatio = avgPrice > 0 ? (contributionMarginPerUnit / avgPrice) * 100 : 0;
    const breakEvenUnits = contributionMarginPerUnit > 0 ? Math.ceil(totalFixedCosts / contributionMarginPerUnit) : 0;
    const breakEvenRevenue = breakEvenUnits * avgPrice;
    const safetyMargin = totalRevenue > 0 ? ((totalRevenue - breakEvenRevenue) / totalRevenue) * 100 : 0;
    const safetyMarginAbsolute = totalRevenue - breakEvenRevenue;
    const currentProfit = f.profit;
    const targetProfit = currentProfit * 1.2;
    const targetUnits = contributionMarginPerUnit > 0 ? Math.ceil((totalFixedCosts + targetProfit) / contributionMarginPerUnit) : 0;
    const operatingLeverage = currentProfit !== 0 ? (totalRevenue - totalVariableCosts) / currentProfit : 0;
    
    return {
        breakEvenUnits, breakEvenRevenue, safetyMargin, safetyMarginAbsolute,
        contributionMarginPerUnit, contributionMarginRatio, totalFixedCosts,
        totalVariableCosts, totalRevenue, targetProfit, targetUnits, operatingLeverage,
        avgPrice, avgVariableCostPerUnit, totalSales
    };
}

// ========================
// АНАЛИЗ ТРЕНДОВ (из монолита)
// ========================

/**
 * Линейная регрессия для прогнозирования
 */
function linearRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

/**
 * Анализирует тренды, сезонность и строит прогноз
 * @param {Array} data - массив данных
 * @param {Object} f - финансовые показатели
 * @param {number} totalSalesQuantity - общее количество продаж
 * @returns {Object} - объект с результатами анализа
 */
function generateTrendsAnalysis(data, f, totalSalesQuantity) {
    const monthlyData = {};
    
    data.forEach(row => {
        if (!row.месяц || !row.год) return;
        const monthIndex = MONTHS_ORDER.indexOf(row.месяц);
        if (monthIndex === -1) return;
        const key = `${row.год}-${monthIndex}`;
        
        if (!monthlyData[key]) {
            monthlyData[key] = {
                year: row.год,
                month: row.месяц,
                monthIndex: monthIndex,
                revenue: 0,
                profit: 0,
                sales: 0,
                expenses: 0
            };
        }
        
        if (row.тип === 'Доход') {
            monthlyData[key].revenue += row.сумма;
        } else if (row.тип === 'Расход') {
            monthlyData[key].expenses += Math.abs(row.сумма);
        }
        
        const article = row.статья?.toLowerCase() || '';
        if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) {
            monthlyData[key].sales += Math.abs(row.сумма || 0);
        }
    });
    
    Object.keys(monthlyData).forEach(key => {
        const revenue = monthlyData[key].revenue;
        const ndsOut = data.filter(d => {
            const dKey = `${d.год}-${MONTHS_ORDER.indexOf(d.месяц)}`;
            return dKey === key && d.статья === 'НДС' && d.подканал === 'НДС исходящий';
        }).reduce((sum, d) => sum + d.сумма, 0);
        const netRevenue = revenue - ndsOut;
        monthlyData[key].profit = netRevenue - monthlyData[key].expenses;
        monthlyData[key].netRevenue = netRevenue;
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const profits = sortedMonths.map(key => monthlyData[key].profit);
    const revenues = sortedMonths.map(key => monthlyData[key].netRevenue);
    const sales = sortedMonths.map(key => monthlyData[key].sales);
    
    // Скользящая средняя
    const movingAverage3 = [];
    const movingAverage6 = [];
    for (let i = 0; i < profits.length; i++) {
        if (i >= 2) {
            movingAverage3.push(profits.slice(i-2, i+1).reduce((a, b) => a + b, 0) / 3);
        } else {
            movingAverage3.push(null);
        }
        if (i >= 5) {
            movingAverage6.push(profits.slice(i-5, i+1).reduce((a, b) => a + b, 0) / 6);
        } else {
            movingAverage6.push(null);
        }
    }
    
    // Темп роста
    const growthRates = [];
    for (let i = 1; i < profits.length; i++) {
        if (profits[i-1] !== 0) {
            const revenueGrowth = ((revenues[i] - revenues[i-1]) / revenues[i-1]) * 100;
            const profitGrowth = ((profits[i] - profits[i-1]) / profits[i-1]) * 100;
            const salesGrowth = sales[i-1] !== 0 ? ((sales[i] - sales[i-1]) / sales[i-1]) * 100 : 0;
            growthRates.push({
                month: sortedMonths[i],
                revenueGrowth: revenueGrowth,
                profitGrowth: profitGrowth,
                salesGrowth: salesGrowth
            });
        }
    }
    
    // Сезонность
    const seasonalityByMonth = {};
    MONTHS_ORDER.forEach(month => {
        seasonalityByMonth[month] = { sales: 0, count: 0 };
    });
    
    Object.values(monthlyData).forEach(data => {
        if (data.sales > 0) {
            seasonalityByMonth[data.month].sales += data.sales;
            seasonalityByMonth[data.month].count++;
        }
    });
    
    const avgMonthlySales = Object.values(seasonalityByMonth).reduce((sum, m) => sum + (m.sales / (m.count || 1)), 0) / 12;
    const seasonalityCoeff = {};
    MONTHS_ORDER.forEach(month => {
        const avg = seasonalityByMonth[month].sales / (seasonalityByMonth[month].count || 1);
        seasonalityCoeff[month] = avgMonthlySales > 0 ? (avg / avgMonthlySales) : 1;
    });
    
    // Прогноз (линейная регрессия)
    let forecastProfit = null;
    let forecastRevenue = null;
    let forecastSales = null;
    let forecastConfidence = null;
    
    if (profits.length >= 3) {
        const x = Array.from({ length: profits.length }, (_, i) => i + 1);
        const profitReg = linearRegression(x, profits);
        const revenueReg = linearRegression(x, revenues);
        const salesReg = linearRegression(x, sales);
        const nextX = profits.length + 1;
        forecastProfit = profitReg.slope * nextX + profitReg.intercept;
        forecastRevenue = revenueReg.slope * nextX + revenueReg.intercept;
        forecastSales = salesReg.slope * nextX + salesReg.intercept;
        
        const meanProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
        const totalSS = profits.reduce((sum, y) => sum + Math.pow(y - meanProfit, 2), 0);
        const residualSS = profits.reduce((sum, y, i) => sum + Math.pow(y - (profitReg.slope * (i+1) + profitReg.intercept), 2), 0);
        forecastConfidence = 1 - (residualSS / totalSS);
    }
    
    const bestMonth = sortedMonths.reduce((best, key) => {
        return monthlyData[key].profit > (monthlyData[best]?.profit || -Infinity) ? key : best;
    }, sortedMonths[0]);
    
    const worstMonth = sortedMonths.reduce((worst, key) => {
        return monthlyData[key].profit < (monthlyData[worst]?.profit || Infinity) ? key : worst;
    }, sortedMonths[0]);
    
    const totalProfitGrowth = profits.length >= 2 ? ((profits[profits.length-1] - profits[0]) / profits[0]) * 100 : 0;
    
    return {
        profits, revenues, sales, movingAverage3, movingAverage6, growthRates,
        seasonalityByMonth, seasonalityCoeff, forecastProfit, forecastRevenue, forecastSales,
        forecastConfidence, bestMonth, worstMonth, totalProfitGrowth
    };
}

// ========================
// ДЕТЕКТОР АНОМАЛИЙ (из монолита)
// ========================

/**
 * Обнаруживает аномалии и выбросы в данных
 * @param {Array} data - массив данных
 * @param {Object} f - финансовые показатели
 * @param {number} totalSalesQuantity - общее количество продаж
 * @param {number} avgCheck - средний чек
 * @returns {Array} - массив аномалий
 */
function detectAnomalies(data, f, totalSalesQuantity, avgCheck) {
    const anomalies = [];
    
    // Анализ выручки по месяцам
    const monthlyRevenue = {};
    data.forEach(row => {
        if (row.тип === 'Доход' && row.месяц && row.год) {
            const key = `${row.год}-${row.месяц}`;
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + row.сумма;
        }
    });
    
    const revenueValues = Object.values(monthlyRevenue);
    if (revenueValues.length >= 3) {
        const mean = revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length;
        const stdDev = Math.sqrt(revenueValues.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / revenueValues.length);
        const threshold = 2.5;
        
        Object.entries(monthlyRevenue).forEach(([month, value]) => {
            const zScore = Math.abs((value - mean) / stdDev);
            if (zScore > threshold) {
                anomalies.push({
                    type: 'Выручка',
                    period: month,
                    value: value,
                    expected: mean,
                    severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
                    message: `Выручка ${formatCurrency(value)} ${value > mean ? 'выше' : 'ниже'} среднего на ${Math.abs(((value - mean) / mean) * 100).toFixed(0)}%`
                });
            }
        });
    }
    
    // Анализ прибыли по каналам
    const channelProfits = {};
    const channels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    channels.forEach(channel => {
        let revenue = 0, ndsOut = 0, expenses = 0;
        data.forEach(row => {
            if (row.канал === channel) {
                if (row.тип === 'Доход') revenue += row.сумма;
                if (row.статья === 'НДС' && row.подканал === 'НДС исходящий') ndsOut += row.сумма;
                if (row.тип === 'Расход') expenses += Math.abs(row.сумма);
            }
        });
        const profit = (revenue - ndsOut) - expenses;
        if (profit !== 0) channelProfits[channel] = profit;
    });
    
    const profitValues = Object.values(channelProfits);
    if (profitValues.length >= 2) {
        const meanProfit = profitValues.reduce((a, b) => a + b, 0) / profitValues.length;
        const stdDevProfit = Math.sqrt(profitValues.map(v => Math.pow(v - meanProfit, 2)).reduce((a, b) => a + b, 0) / profitValues.length);
        
        Object.entries(channelProfits).forEach(([channel, profit]) => {
            const zScore = Math.abs((profit - meanProfit) / stdDevProfit);
            if (zScore > 1.5 && profitValues.length > 1) {
                anomalies.push({
                    type: 'Прибыль канала',
                    period: channel,
                    value: profit,
                    expected: meanProfit,
                    severity: zScore > 2.5 ? 'high' : 'medium',
                    message: `${channel}: прибыль ${profit > 0 ? formatCurrency(profit) : formatCurrency(profit) + ' убыток'} ${Math.abs(profit) > Math.abs(meanProfit) ? 'выше' : 'ниже'} среднего по каналам`
                });
            }
        });
    }
    
    // Отрицательная прибыль
    if (f.profit < 0) {
        anomalies.push({
            type: 'Критическое',
            period: 'Текущий период',
            value: f.profit,
            expected: 0,
            severity: 'critical',
            message: `⚠️ Компания убыточна! Прибыль: ${formatCurrency(f.profit)}`
        });
    }
    
    // Аномальный средний чек
    if (avgCheck > 0) {
        const checkAnomaly = avgCheck > 50000 ? 'high' : avgCheck < 1000 ? 'low' : null;
        if (checkAnomaly) {
            anomalies.push({
                type: 'Средний чек',
                period: 'Текущий период',
                value: avgCheck,
                expected: 0,
                severity: checkAnomaly,
                message: `Средний чек ${formatCurrency(avgCheck)} ${avgCheck > 50000 ? 'аномально высокий' : 'аномально низкий'}`
            });
        }
    }
    
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return anomalies.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
}

// Экспортируем функции в window для глобального доступа
window.calculateFinancials = calculateFinancials;
window.calculateNetRevenueByChannel = calculateNetRevenueByChannel;
window.generateBreakEvenAnalysis = generateBreakEvenAnalysis;
window.generateTrendsAnalysis = generateTrendsAnalysis;
window.linearRegression = linearRegression;
window.detectAnomalies = detectAnomalies;

console.log('✅ dashboardCore.js: все функции загружены');
