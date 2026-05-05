// =======================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =======================

let abcxyzData = null;  // Хранилище результатов ABC/XYZ анализа

// ========================
// ПАРСИНГ EXCEL ФАЙЛА С ПРОДАЖАМИ
// ========================

/**
 * Парсит Excel файл с продажами для ABC/XYZ анализа
 * @param {File} file - выбранный файл
 * @returns {Promise<Array>} - массив продаж
 * 
 * Ожидаемый формат файла:
 * - Строка с датами (например: "01.01.24", "02.01.24" и т.д.)
 * - Данные о товарах: название, артикул, затем количество и сумма по датам
 */
function parseABCXYZExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // 1. Читаем Excel
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                
                console.log('Всего строк в файле:', jsonData.length);
                
                if (!jsonData || jsonData.length < 4) {
                    reject(new Error('Неверный формат файла: недостаточно строк'));
                    return;
                }
                
                // ========================
                // 2. ПОИСК СТРОКИ С ДАТАМИ
                // ========================
                let dateRowIndex = -1;
                let dataStartRow = -1;
                
                // Ищем строку, где есть даты в формате ДД.ММ.ГГ или ДД.ММ.ГГГГ
                for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                    const row = jsonData[i];
                    if (!row) continue;
                    
                    for (let j = 0; j < row.length; j++) {
                        const cell = row[j];
                        // Проверяем формат даты: XX.XX.XX или XX.XX.XXXX
                        if (cell && typeof cell === 'string' && cell.match(/\d{2}\.\d{2}\.\d{2,4}/)) {
                            dateRowIndex = i;
                            dataStartRow = i + 2;  // Данные обычно через 2 строки после дат
                            console.log('Найдена строка с датами на индексе:', i);
                            break;
                        }
                    }
                    if (dateRowIndex !== -1) break;
                }
                
                if (dateRowIndex === -1) {
                    reject(new Error('Не найдены столбцы с датами в файле'));
                    return;
                }
                
                const dateRow = jsonData[dateRowIndex];
                console.log('Строка с датами:', dateRow);
                
                // ========================
                // 3. СОБИРАЕМ ВСЕ ДАТЫ И ИХ ИНДЕКСЫ
                // ========================
                const dates = [];
                for (let i = 2; i < dateRow.length; i++) {
                    const cell = dateRow[i];
                    if (cell && typeof cell === 'string' && cell.match(/\d{2}\.\d{2}\.\d{2,4}/)) {
                        dates.push({ 
                            qtyIndex: i,           // Индекс столбца с количеством
                            amountIndex: i + 1,    // Индекс столбца с суммой (следующий)
                            date: cell
                        });
                        console.log('Найдена дата:', cell, 'индекс кол-ва:', i, 'индекс суммы:', i + 1);
                    }
                }
                
                console.log('Найдено дат:', dates.length);
                
                if (dates.length === 0) {
                    reject(new Error('Не найдены столбцы с датами в файле'));
                    return;
                }
                
                // ========================
                // 4. ПАРСИМ ДАННЫЕ ПО ТОВАРАМ
                // ========================
                const salesMap = new Map(); // Ключ: "артикул|дата"
                
                for (let rowIdx = dataStartRow; rowIdx < jsonData.length; rowIdx++) {
                    const row = jsonData[rowIdx];
                    if (!row || row.length < 2) continue;
                    
                    // Название товара и артикул
                    const productName = row[0] ? String(row[0]).trim() : '';
                    const article = row[1] ? String(row[1]).trim() : '';
                    
                    // Пропускаем пустые строки
                    if (!productName && !article) continue;
                    
                    // Останавливаемся на строке "Итого"
                    if (productName === 'Итого' || productName === 'ИТОГО' || 
                        productName === 'Итого:' || productName === 'ИТОГО:') {
                        break;
                    }
                    
                    // Используем артикул если есть, иначе название
                    const key = (article && article !== '') ? article : productName;
                    
                    // Обрабатываем каждую дату
                    for (const d of dates) {
                        let qty = 0;
                        let amount = 0;
                        
                        if (d.qtyIndex !== undefined && row[d.qtyIndex] !== undefined && row[d.qtyIndex] !== '') {
                            qty = parseFloat(row[d.qtyIndex]) || 0;
                        }
                        if (d.amountIndex !== undefined && row[d.amountIndex] !== undefined && row[d.amountIndex] !== '') {
                            amount = parseFloat(row[d.amountIndex]) || 0;
                        }
                        
                        // Пропускаем только если оба нулевые
                        if (qty === 0 && amount === 0) continue;
                        
                        // Уникальный ключ для агрегации (на случай дублей)
                        const uniqueKey = `${key}|${d.date}`;
                        
                        if (!salesMap.has(uniqueKey)) {
                            salesMap.set(uniqueKey, {
                                productName: productName,
                                article: article,
                                key: key,
                                date: d.date,
                                quantity: 0,
                                amount: 0
                            });
                        }
                        
                        const sale = salesMap.get(uniqueKey);
                        sale.quantity += qty;
                        sale.amount += amount;
                    }
                }
                
                // Преобразуем Map в массив
                const sales = Array.from(salesMap.values())
                    .filter(sale => sale.quantity !== 0 || sale.amount !== 0);
                
                console.log('Всего продаж найдено (после агрегации):', sales.length);
                
                // Диагностика
                if (sales.length > 0) {
                    console.log('Пример первых 5 продаж:', sales.slice(0, 5));
                    
                    const negativeSales = sales.filter(s => s.quantity < 0 || s.amount < 0);
                    console.log('Из них с отрицательными значениями (возвраты):', negativeSales.length);
                }
                
                if (sales.length === 0) {
                    reject(new Error('Нет данных о продажах. Проверьте формат файла.'));
                } else {
                    resolve(sales);
                }
                
            } catch (error) {
                console.error('Ошибка парсинга ABC/XYZ:', error);
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsArrayBuffer(file);
    });
}

// ========================
// РАСЧЕТ ABC/XYZ
// ========================

/**
 * Рассчитывает ABC/XYZ анализ на основе продаж
 * @param {Array} salesData - массив продаж
 * @returns {Object} - объект с результатами
 * 
 * ABC анализ: 
 * - A: 80% выручки (топ товары)
 * - B: следующие 15% выручки
 * - C: последние 5% выручки
 * 
 * XYZ анализ (стабильность продаж):
 * - X: коэффициент вариации < 10% (очень стабильно)
 * - Y: коэффициент вариации < 25% (стабильно)
 * - Z: коэффициент вариации >= 25% (нестабильно)
 */
function calculateABCXYZ(salesData) {
    // ========================
    // 1. АГРЕГАЦИЯ ПО ТОВАРАМ
    // ========================
    const productStats = new Map();
    
    salesData.forEach(sale => {
        const key = sale.key;
        
        if (!productStats.has(key)) {
            productStats.set(key, {
                name: sale.productName,
                article: sale.article,
                totalQuantity: 0,
                totalAmount: 0,
                dailySales: []
            });
        }
        
        const stats = productStats.get(key);
        stats.totalQuantity += sale.quantity;
        stats.totalAmount += sale.amount;
        stats.dailySales.push({ 
            date: sale.date, 
            quantity: sale.quantity, 
            amount: sale.amount 
        });
    });
    
    // ========================
    // 2. РАСЧЕТ КОЭФФИЦИЕНТА ВАРИАЦИИ (XYZ)
    // ========================
    const products = Array.from(productStats.values()).map(product => {
        // Берем только количества продаж по дням
        const quantities = product.dailySales.map(d => d.quantity);
        const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length;
        
        // Стандартное отклонение
        const variance = quantities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / quantities.length;
        const stdDev = Math.sqrt(variance);
        
        // Коэффициент вариации (%)
        const cv = mean > 0 ? (stdDev / mean) * 100 : 100;
        
        // Определяем категорию XYZ
        let xyz = 'Z';
        if (cv < 10) xyz = 'X';      // Очень стабильно
        else if (cv < 25) xyz = 'Y';  // Стабильно
        
        return {
            ...product,
            cv: cv,
            xyz: xyz
        };
    });
    
    // ========================
    // 3. ABC АНАЛИЗ ПО ВЫРУЧКЕ
    // ========================
    const sortedByAmount = [...products].sort((a, b) => b.totalAmount - a.totalAmount);
    const totalAmount = sortedByAmount.reduce((sum, p) => sum + p.totalAmount, 0);
    
    let cumAmount = 0;
    sortedByAmount.forEach(p => {
        cumAmount += p.totalAmount;
        const percent = (cumAmount / totalAmount) * 100;
        
        if (percent <= 80) {
            p.abcAmount = 'A';   // Топ 80% выручки
        } else if (percent <= 95) {
            p.abcAmount = 'B';   // Следующие 15% выручки
        } else {
            p.abcAmount = 'C';   // Последние 5% выручки
        }
    });
    
    // ========================
    // 4. ABC АНАЛИЗ ПО КОЛИЧЕСТВУ
    // ========================
    const sortedByQuantity = [...products].sort((a, b) => b.totalQuantity - a.totalQuantity);
    const totalQuantity = sortedByQuantity.reduce((sum, p) => sum + p.totalQuantity, 0);
    
    let cumQuantity = 0;
    sortedByQuantity.forEach(p => {
        cumQuantity += p.totalQuantity;
        const percent = (cumQuantity / totalQuantity) * 100;
        
        if (percent <= 80) {
            p.abcQuantity = 'A';
        } else if (percent <= 95) {
            p.abcQuantity = 'B';
        } else {
            p.abcQuantity = 'C';
        }
    });
    
    return { 
        products,      // Все товары с категориями
        totalAmount,   // Общая выручка
        totalQuantity  // Общее количество продаж
    };
}

// ========================
// СТРАТЕГИИ ДЛЯ КАЖДОГО КВАДРАНТА
// ========================

const QUADRANT_RECOMMENDATIONS = {
    'AX': '🏆 Золотой стандарт - высокая выручка, стабильные продажи. Держать запас, увеличивать рекламу.',
    'AY': '📈 Стабильные лидеры - высокая выручка, небольшие колебания. Увеличить страховой запас.',
    'AZ': '⚠️ Нестабильные лидеры - высокая выручка, но сильные колебания. Нужен большой страховой запас.',
    'BX': '✅ Стабильные середняки - средняя выручка, стабильно. Оптимизировать заказы.',
    'BY': '📊 Средние с колебаниями - средняя выручка, небольшая нестабильность. Следить за трендами.',
    'BZ': '🔴 Нестабильные середняки - средняя выручка, сильные колебания. Анализировать причины.',
    'CX': '🟢 Стабильные аутсайдеры - низкая выручка, но стабильно. Можно заказывать малыми партиями.',
    'CY': '🟡 Нестабильные аутсайдеры - низкая выручка, колебания. Рассмотреть снятие.',
    'CZ': '🔴 Проблемные - низкая выручка, сильные колебания. Рекомендуется снятие с продаж.'
};

/**
 * Отрисовывает результаты ABC/XYZ анализа
 * @param {Array} products - массив товаров с категориями
 * @param {number} totalAmount - общая выручка
 * @param {number} totalQuantity - общее количество продаж
 */
function renderABCXYZ(products, totalAmount, totalQuantity) {
    const container = document.getElementById('abcxyzResults');
    if (!container) return;
    
    // ========================
    // 1. ГРУППИРОВКА ПО КВАДРАНТАМ
    // ========================
    const matrix = { 
        AX: [], AY: [], AZ: [], 
        BX: [], BY: [], BZ: [], 
        CX: [], CY: [], CZ: [] 
    };
    
    products.forEach(p => {
        const key = `${p.abcAmount}${p.xyz}`;
        if (matrix[key]) matrix[key].push(p);
    });
    
    // ========================
    // 2. ВЕРХНИЕ МЕТРИКИ
    // ========================
    const metricsHtml = `
        <div class="metrics-grid" style="margin-bottom: 24px;">
            <div class="metric-card">
                <div class="metric-title">📊 Всего товаров</div>
                <div class="metric-value">${products.length}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">💰 Общая выручка</div>
                <div class="metric-value">${formatCurrency(totalAmount)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">📦 Продано штук</div>
                <div class="metric-value">${totalQuantity.toLocaleString('ru-RU')}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">🎯 Средний чек</div>
                <div class="metric-value">${formatCurrency(totalAmount / totalQuantity)}</div>
            </div>
        </div>
    `;
    
    // ========================
    // 3. МАТРИЦА 9 КВАДРАНТОВ
    // ========================
    const matrixHtml = `
        <div class="metric-card" style="margin-bottom: 24px;">
            <div class="metric-title" style="margin-bottom: 16px;">📊 Матрица ABC/XYZ (9 квадрантов)</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                ${['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ'].map(cell => {
                    const borderColor = cell.includes('A') ? '#48bb78' : (cell.includes('B') ? '#fbbf24' : '#f56565');
                    return `
                        <div style="background: rgba(102,126,234,0.1); border-radius: 12px; padding: 12px; border-left: 3px solid ${borderColor}">
                            <div style="font-weight: 700; margin-bottom: 8px;">${cell}</div>
                            <div style="font-size: 11px; margin-bottom: 8px; opacity: 0.8;">${matrix[cell].length} товаров</div>
                            <div style="font-size: 11px; color: #667eea;">${QUADRANT_RECOMMENDATIONS[cell]}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // ========================
    // 4. ДИАГРАММА ПАРЕТО
    // ========================
    const paretoHtml = `
        <div class="metric-card" style="margin-bottom: 24px;">
            <div class="metric-title">📈 Диаграмма Парето (выручка)</div>
            <canvas id="paretoChart" style="height: 300px; width: 100%;"></canvas>
            <div class="metric-sub" style="margin-top: 12px; text-align: center;">
                💡 80% выручки дают топ-20% товаров (правило Парето)
            </div>
        </div>
    `;
    
    // ========================
    // 5. ТАБЛИЦА ТОВАРОВ
    // ========================
    const tableHtml = `
        <div class="metric-card">
            <div class="metric-title" style="margin-bottom: 16px;">📋 Детальный анализ товаров</div>
            <div style="overflow-x: auto; max-height: 500px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: rgba(102,126,234,0.1); position: sticky; top: 0;">
                            <th style="padding: 12px; text-align: left;">Артикул</th>
                            <th style="padding: 12px; text-align: left;">Номенклатура</th>
                            <th style="padding: 12px; text-align: right;">Выручка</th>
                            <th style="padding: 12px; text-align: right;">Кол-во (шт)</th>
                            <th style="padding: 12px; text-align: center;">ABC</th>
                            <th style="padding: 12px; text-align: center;">XYZ</th>
                            <th style="padding: 12px; text-align: center;">Матрица</th>
                            <th style="padding: 12px; text-align: left;">Рекомендация</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.sort((a,b) => b.totalAmount - a.totalAmount).map(p => {
                            const matrixCell = `${p.abcAmount}${p.xyz}`;
                            const bgColor = p.abcAmount === 'A' ? 'rgba(72,187,120,0.1)' : 
                                          (p.abcAmount === 'B' ? 'rgba(251,191,36,0.1)' : 'rgba(245,101,101,0.1)');
                            
                            return `
                                <tr style="border-bottom: 1px solid rgba(102,126,234,0.1); background: ${bgColor};">
                                    <td style="padding: 10px;">${p.article || '—'}</td>
                                    <td style="padding: 10px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${p.name}">
                                        ${p.name.length > 40 ? p.name.substring(0, 40) + '...' : p.name}
                                    </td>
                                    <td style="padding: 10px; text-align: right;">${formatCurrency(p.totalAmount)}</td>
                                    <td style="padding: 10px; text-align: right;">${p.totalQuantity.toLocaleString('ru-RU')}</td>
                                    <td style="padding: 10px; text-align: center; font-weight: 700; color: ${p.abcAmount === 'A' ? '#48bb78' : (p.abcAmount === 'B' ? '#fbbf24' : '#f56565')}">
                                        ${p.abcAmount}
                                    </td>
                                    <td style="padding: 10px; text-align: center; font-weight: 700; color: ${p.xyz === 'X' ? '#48bb78' : (p.xyz === 'Y' ? '#fbbf24' : '#f56565')}">
                                        ${p.xyz}
                                    </td>
                                    <td style="padding: 10px; text-align: center; font-weight: 700;">${matrixCell}</td>
                                    <td style="padding: 10px; font-size: 11px;">${QUADRANT_RECOMMENDATIONS[matrixCell]}</td>
                                 </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Собираем всё вместе
    container.innerHTML = metricsHtml + matrixHtml + paretoHtml + tableHtml;
    container.style.display = 'block';
    
    // ========================
    // 6. ОТРИСОВКА ДИАГРАММЫ ПАРЕТО
    // ========================
    setTimeout(() => {
        renderParetoChart(products);
    }, 100);
}

/**
 * Отрисовывает диаграмму Парето (столбцы + кумулятивная линия)
 * @param {Array} products - массив товаров
 */
function renderParetoChart(products) {
    const sorted = [...products].sort((a, b) => b.totalAmount - a.totalAmount);
    const topCount = Math.min(20, sorted.length);
    
    const labels = sorted.slice(0, topCount).map(p => p.article || p.name.substring(0, 15));
    const amounts = sorted.slice(0, topCount).map(p => p.totalAmount);
    
    // Кумулятивная доля
    const cumulative = [];
    let sum = 0;
    const total = amounts.reduce((a, b) => a + b, 0);
    
    amounts.forEach(a => { 
        sum += a; 
        cumulative.push((sum / total) * 100); 
    });
    
    // 80% линия Парето
    const paretoLine80 = cumulative.map(() => 80);
    
    const canvas = document.getElementById('paretoChart');
    if (!canvas) return;
    
    // Уничтожаем старый график
    if (window.paretoChart && typeof window.paretoChart.destroy === 'function') {
        window.paretoChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    window.paretoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Выручка (₽)', 
                    data: amounts, 
                    type: 'bar', 
                    backgroundColor: '#667eea', 
                    borderRadius: 6, 
                    yAxisID: 'y' 
                },
                { 
                    label: 'Кумулятивная доля (%)', 
                    data: cumulative, 
                    type: 'line', 
                    borderColor: '#f56565', 
                    borderWidth: 3, 
                    fill: false, 
                    tension: 0.4, 
                    yAxisID: 'y1', 
                    pointRadius: 4, 
                    pointBackgroundColor: '#f56565',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                { 
                    label: '80% (правило Парето)', 
                    data: paretoLine80, 
                    type: 'line', 
                    borderColor: '#fbbf24', 
                    borderWidth: 2, 
                    borderDash: [5, 5], 
                    fill: false, 
                    yAxisID: 'y1', 
                    pointRadius: 0 
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                tooltip: { 
                    callbacks: { 
                        label: (ctx) => {
                            if (ctx.dataset.label === 'Выручка (₽)') {
                                return formatCurrency(ctx.raw);
                            }
                            return ctx.raw.toFixed(1) + '%';
                        }
                    } 
                },
                legend: { position: 'top' }
            },
            scales: { 
                y: { 
                    title: { display: true, text: 'Выручка (₽)' }, 
                    ticks: { callback: (v) => formatCurrency(v) } 
                }, 
                y1: { 
                    position: 'right', 
                    title: { display: true, text: 'Кумулятивная доля (%)' }, 
                    min: 0, 
                    max: 100, 
                    ticks: { callback: (v) => v + '%' } 
                } 
            }
        }
    });
}

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

/**
 * Рассчитывает коэффициент вариации для массива значений
 * @param {Array} values - массив чисел
 * @returns {number} - коэффициент вариации в %
 */
function calculateCoefficientOfVariation(values) {
    if (values.length === 0) return 100;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 100;
    
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return (stdDev / mean) * 100;
}

/**
 * Получает цвет для квадранта матрицы
 * @param {string} quadrant - код квадранта (AX, BY и т.д.)
 * @returns {string} - цвет
 */
function getQuadrantColor(quadrant) {
    if (quadrant.startsWith('A')) return '#48bb78';
    if (quadrant.startsWith('B')) return '#fbbf24';
    return '#f56565';
}

/**
 * Получает рекомендацию для квадранта
 * @param {string} quadrant - код квадранта
 * @returns {string} - текст рекомендации
 */
function getQuadrantRecommendation(quadrant) {
    const recommendations = {
        'AX': '🏆 Держать и масштабировать. Увеличивайте запасы, инвестируйте в продвижение.',
        'AY': '📈 Работать над стабильностью. Увеличьте страховой запас.',
        'AZ': '⚠️ Нужен большой запас. Прогнозируйте спрос, используйте статистику.',
        'BX': '✅ Оптимизировать заказы. Можно заказывать по расписанию.',
        'BY': '📊 Следить за трендами. Анализируйте причины колебаний.',
        'BZ': '🔴 Анализировать. Возможно, сезонный товар или проблемы с поставками.',
        'CX': '🟢 Заказывать малыми партиями. Минимальный запас.',
        'CY': '🟡 Рассмотреть снятие. Если нет роста - исключить.',
        'CZ': '🔴 Снять с продаж. Заменяйте на более перспективные товары.'
    };
    return recommendations[quadrant] || 'Анализ не требуется';
}
