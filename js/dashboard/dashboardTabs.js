// ========================
// dashboardTabs.js - ВКЛАДКИ (MODERN TABS)
// ========================

function generateTabsPanel() {
    if (!window.currentData || window.currentData.length === 0) {
        return '<div class="metric-card" style="padding: 40px; text-align: center;">📊 Нет данных для отображения</div>';
    }
    
    const f = window.calculateFinancials ? window.calculateFinancials(window.currentData) : { netRevenue: 0, profit: 0, totalExpenses: 1 };
    
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
    
    const tabs = [
        { id: 'netRevenue', icon: '💰', title: 'Чистая выручка', value: formatCurrency(f.netRevenue), valueColor: '#48bb78' },
        { id: 'sales', icon: '📦', title: 'Продажи', value: new Intl.NumberFormat('ru-RU').format(totalSalesQuantity) + ' шт', valueColor: '#4299e1' },
        { id: 'avgCheck', icon: '💳', title: 'Средний чек', value: formatCurrency(avgCheck), valueColor: '#9f7aea' },
        { id: 'efficiency', icon: '⚡', title: 'Эффективность', value: efficiency.toFixed(2) + ' ₽', valueColor: efficiency >= 1 ? '#48bb78' : '#ed8936' }
    ];
    
    let tabsHtml = `<div class="modern-tabs-container" id="modernTabsContainer">
        <div class="tabs-header" id="tabsHeader">
            ${tabs.map((tab, idx) => `<button class="tab-btn ${idx === 0 ? 'active' : ''}" data-tab="${tab.id}" data-index="${idx}">
                <span class="tab-icon">${tab.icon}</span>
                <span class="tab-title">${tab.title}</span>
            </button>`).join('')}
        </div>
        <div class="tabs-content" id="tabsContent">
            ${tabs.map((tab, idx) => `<div class="tab-pane ${idx === 0 ? 'active' : ''}" data-tab="${tab.id}">
                <div class="tab-main-value" style="color: ${tab.valueColor}">${tab.value}</div>
                ${tab.trend && tab.trend.html ? `<div class="tab-trend ${tab.trend.class}">${tab.trend.html} <span style="margin-left: 4px; opacity: 0.7;">к предыдущему периоду</span></div>` : ''}
                <div class="tab-chart-container">
                    <canvas id="tabChart_${tab.id}" style="height: 200px; width: 100%;"></canvas>
                </div>
                <div class="tab-breakdown-header" data-tab="${tab.id}">
                    <span class="breakdown-title">📊 Детализация по каналам</span>
                    <span class="breakdown-toggle">▼</span>
                </div>
                <div class="tab-breakdown-content" id="breakdown_${tab.id}">
                    ${tab.id === 'netRevenue' ? generateFullChannelBreakdown('ВЫРУЧКА ЧИСТАЯ ПО КАНАЛАМ', netRevenueByChannel, true, '') : 
                      tab.id === 'sales' ? generateFullSalesBreakdown(window.currentData) :
                      tab.id === 'avgCheck' ? generateFullAverageCheckBreakdown(window.currentData) :
                      generateFullEfficiencyBreakdown(window.currentData)}
                </div>
            </div>`).join('')}
        </div>
    </div>`;
    
    setTimeout(() => {
        initTabsNew();
        initAllTabCharts();
    }, 100);
    
    return tabsHtml;
}

function initTabsNew() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    let activeTabIndex = 0;
    let tabInterval = null;
    
    function switchToTab(index) {
        if (index === activeTabIndex) return;
        tabBtns.forEach((btn, i) => { 
            if (i === index) btn.classList.add('active'); 
            else btn.classList.remove('active'); 
        });
        tabPanes.forEach((pane, i) => { 
            if (i === index) pane.classList.add('active'); 
            else pane.classList.remove('active'); 
        });
        activeTabIndex = index;
        setTimeout(() => {
            renderSingleTabChart(activeTabIndex);
        }, 50);
    }
    
    function startAutoSwitch() { 
        if (tabInterval) clearInterval(tabInterval); 
        tabInterval = setInterval(() => { 
            switchToTab((activeTabIndex + 1) % tabBtns.length); 
        }, 5000); 
    }
    
    function stopAutoSwitch() { 
        if (tabInterval) { 
            clearInterval(tabInterval); 
            tabInterval = null; 
        } 
    }
    
    tabBtns.forEach((btn, idx) => { 
        btn.addEventListener('click', () => { 
            stopAutoSwitch(); 
            switchToTab(idx); 
            startAutoSwitch(); 
        }); 
    });
    
    const tabsContainer = document.querySelector('.modern-tabs-container');
    if (tabsContainer) { 
        tabsContainer.addEventListener('mouseenter', stopAutoSwitch); 
        tabsContainer.addEventListener('mouseleave', startAutoSwitch); 
    }
    
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
    
    startAutoSwitch();
}

function initAllTabCharts() {
    console.log('🔄 Инициализация всех графиков во вкладках');
    // Небольшая задержка для полной отрисовки DOM
    setTimeout(() => {
        renderSingleTabChart(0);
    }, 100);
}

function renderSingleTabChart(index) {
    console.log('🎨 renderSingleTabChart вызван для index:', index);
    
    const tabPanes = document.querySelectorAll('.tab-pane');
    if (!tabPanes[index]) {
        console.log('❌ Нет панели для индекса', index);
        return;
    }
    
    const tabId = tabPanes[index].dataset.tab;
    console.log('📊 Рендерим график для вкладки:', tabId);
    
    const canvas = document.getElementById(`tabChart_${tabId}`);
    if (!canvas) {
        console.log('❌ Canvas не найден для вкладки:', tabId);
        return;
    }
    
    // Уничтожаем старый график
    if (window.tabCharts && window.tabCharts[tabId]) {
        try { window.tabCharts[tabId].destroy(); } catch(e) { console.log('Ошибка уничтожения графика:', e); }
        delete window.tabCharts[tabId];
    }
    if (!window.tabCharts) window.tabCharts = {};
    
    const data = window.currentData || [];
    console.log('📈 Всего строк данных:', data.length);
    
    if (data.length === 0) {
        canvas.style.display = 'none';
        console.log('❌ Нет данных для отображения');
        return;
    }
    
    // Месяцы по порядку
    const monthsOrder = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const monthNamesShort = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    
    // Инициализация массивов для данных
    const monthlyRevenue = {};
    const monthlySales = {};
    const monthlyExpenses = {};
    const monthlyNdsOut = {};
    
    for (let i = 0; i < monthsOrder.length; i++) {
        const month = monthsOrder[i];
        monthlyRevenue[month] = 0;
        monthlySales[month] = 0;
        monthlyExpenses[month] = 0;
        monthlyNdsOut[month] = 0;
    }
    
    // СБОР ДАННЫХ - ИСПРАВЛЕННАЯ ВЕРСИЯ ДЛЯ ВАШЕЙ СТРУКТУРЫ
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const month = row.месяц;
        if (!month) continue;
        
        const monthIndex = monthsOrder.indexOf(month);
        if (monthIndex === -1) continue;
        
        // Доходы (тип = 'Доход')
        if (row.тип === 'Доход') {
            monthlyRevenue[month] += (row.сумма || 0);
        }
        
        // Расходы (тип = 'Расход')
        if (row.тип === 'Расход') {
            monthlyExpenses[month] += Math.abs(row.сумма || 0);
        }
        
        // НДС исходящий
        if (row.статья === 'НДС' && row.подканал === 'НДС исходящий') {
            monthlyNdsOut[month] += (row.сумма || 0);
        }
        
        // ========== ПРОДАЖИ В ШТУКАХ - ДЛЯ ВАШЕЙ СТРУКТУРЫ ==========
        // У вас: Статья = "Справочно", Подканал = "Продажи шт."
        const article = (row.статья || '').toLowerCase();
        const subCategory = (row.подканал || '').toLowerCase();
        
        // Проверка на продажи в штуках
        let isSales = false;
        
        // Вариант 1: Подканал содержит "продажи" и "шт"
        if (subCategory.includes('продажи') && subCategory.includes('шт')) {
            isSales = true;
        }
        // Вариант 2: Подканал точно равен "Продажи шт." (регистр не важен)
        else if (subCategory === 'продажи шт.' || subCategory === 'продажи шт') {
            isSales = true;
        }
        // Вариант 3: Статья или подканал содержат "продажи шт"
        else if (article.includes('продажи шт') || subCategory.includes('продажи шт')) {
            isSales = true;
        }
        // Вариант 4: Тип "Справочная" и подканал содержит "продажи"
        else if (row.тип === 'Справочная' && subCategory.includes('продажи')) {
            isSales = true;
        }
        
        if (isSales) {
            const salesAmount = Math.abs(row.сумма || 0);
            monthlySales[month] += salesAmount;
            console.log(`📦 Продажи найдены: месяц=${month}, сумма=${salesAmount}, статья=${row.статья}, подканал=${row.подканал}`);
        }
    }
    
    // ДИАГНОСТИКА: выводим ВСЕ строки с продажами
    console.log('🔍 ДИАГНОСТИКА: поиск продаж в данных...');
    let salesRowsCount = 0;
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const subCategory = (row.подканал || '').toLowerCase();
        if (subCategory.includes('продажи') && subCategory.includes('шт')) {
            salesRowsCount++;
            console.log(`  Найдено: месяц=${row.месяц}, статья=${row.статья}, подканал=${row.подканал}, сумма=${row.сумма}, тип=${row.тип}`);
        }
    }
    console.log(`📊 Всего найдено строк с продажами: ${salesRowsCount}`);
    
    console.log('📊 Собраны данные по месяцам:');
    console.log('  Выручка:', JSON.stringify(monthlyRevenue));
    console.log('  Продажи (шт):', JSON.stringify(monthlySales));
    console.log('  Расходы:', JSON.stringify(monthlyExpenses));
    
    // Формируем данные для графика
    const labels = [];
    const chartData = [];
    
    for (let i = 0; i < monthsOrder.length; i++) {
        const month = monthsOrder[i];
        const netRevenue = monthlyRevenue[month] - monthlyNdsOut[month];
        const profit = netRevenue - monthlyExpenses[month];
        
        let value = 0;
        switch (tabId) {
            case 'netRevenue':
                value = netRevenue;
                break;
            case 'sales':
                value = monthlySales[month];
                break;
            case 'avgCheck':
                value = monthlySales[month] > 0 ? netRevenue / monthlySales[month] : 0;
                break;
            case 'efficiency':
                value = monthlyExpenses[month] > 0 ? profit / monthlyExpenses[month] : 0;
                break;
        }
        
        // Добавляем месяц, если есть хоть какие-то данные
        if (monthlyRevenue[month] !== 0 || monthlySales[month] !== 0 || monthlyExpenses[month] !== 0) {
            labels.push(monthNamesShort[i]);
            chartData.push(value);
        }
    }
    
    console.log(`📊 Данные для графика (${tabId}):`, { labels, chartData });
    
    // Если нет данных для графика
    if (labels.length === 0 || chartData.every(v => v === 0)) {
        canvas.style.display = 'none';
        // Показываем сообщение об отсутствии данных для вкладки продаж
        if (tabId === 'sales') {
            const container = canvas.closest('.tab-chart-container');
            if (container) {
                const existingMsg = container.querySelector('.no-data-message');
                if (!existingMsg) {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'no-data-message';
                    msgDiv.style.cssText = 'text-align: center; padding: 60px 20px; color: #a0aec0; font-size: 14px;';
                    msgDiv.innerHTML = '📊 Нет данных по продажам в штуках<br><small>Проверьте наличие в Excel: Статья="Справочно", Подканал="Продажи шт."</small>';
                    container.appendChild(msgDiv);
                    setTimeout(() => { if (msgDiv.parentNode) msgDiv.remove(); }, 5000);
                }
            }
        }
        console.log('❌ Нет данных для отображения графика');
        return;
    }
    
    canvas.style.display = 'block';
    // Удаляем сообщение об отсутствии данных, если оно есть
    const container = canvas.closest('.tab-chart-container');
    if (container) {
        const existingMsg = container.querySelector('.no-data-message');
        if (existingMsg) existingMsg.remove();
    }
    
    const isDarkMode = document.body.classList.contains('dark');
    const textColor = isDarkMode ? '#e2e8f0' : '#4a5568';
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Настройки для разных типов графиков
    let chartType = 'line';
    let chartColor = '#667eea';
    let displayData = [...chartData];
    let yAxisLabel = '';
    let formatYValue = (val) => val;
    
    switch (tabId) {
        case 'netRevenue':
            chartType = 'line';
            chartColor = '#48bb78';
            displayData = chartData.map(v => v / 1000);
            yAxisLabel = 'Чистая выручка (тыс. ₽)';
            formatYValue = (val) => formatCurrency(val * 1000);
            break;
        case 'sales':
            chartType = 'bar';
            chartColor = '#4299e1';
            yAxisLabel = 'Продажи (шт)';
            formatYValue = (val) => val.toLocaleString('ru-RU') + ' шт';
            break;
        case 'avgCheck':
            chartType = 'line';
            chartColor = '#9f7aea';
            yAxisLabel = 'Средний чек (₽)';
            formatYValue = (val) => formatCurrency(val);
            break;
        case 'efficiency':
            chartType = 'line';
            chartColor = '#ed8936';
            displayData = chartData;
            yAxisLabel = 'Прибыль на 1₽ расходов';
            formatYValue = (val) => val.toFixed(2) + ' ₽';
            break;
    }
    
    if (chartType === 'bar') {
        // ГИСТОГРАММА для продаж
        const maxVal = Math.max(...displayData);
        const minVal = Math.min(...displayData);
        const barColors = displayData.map(v => {
            if (v === maxVal && maxVal > 0) return '#48bb78';
            if (v === minVal && displayData.length > 1 && minVal !== maxVal) return '#f56565';
            return chartColor;
        });
        
        window.tabCharts[tabId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: yAxisLabel,
                    data: displayData,
                    backgroundColor: barColors,
                    borderColor: barColors,
                    borderWidth: 1,
                    borderRadius: 8,
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
                        backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: chartColor,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const rawValue = chartData[context.dataIndex];
                                return formatYValue(rawValue);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { size: 11 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: textColor },
                        grid: { color: isDarkMode ? '#2d3748' : '#e2e8f0' },
                        title: {
                            display: true,
                            text: yAxisLabel,
                            color: textColor,
                            font: { size: 10 }
                        }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
    } else {
        // ЛИНЕЙНЫЙ ГРАФИК с градиентом
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, chartColor + '50');
        gradient.addColorStop(0.5, chartColor + '20');
        gradient.addColorStop(1, chartColor + '00');
        
        window.tabCharts[tabId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: yAxisLabel,
                    data: displayData,
                    borderColor: chartColor,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: chartColor,
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
                        backgroundColor: isDarkMode ? '#1a1a2a' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: chartColor,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const rawValue = chartData[context.dataIndex];
                                return formatYValue(rawValue);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor, font: { size: 11 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: textColor },
                        grid: { color: isDarkMode ? '#2d3748' : '#e2e8f0' },
                        title: {
                            display: true,
                            text: yAxisLabel,
                            color: textColor,
                            font: { size: 10 }
                        }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
    
    console.log('✅ График создан для вкладки:', tabId);

    // Принудительное обновление размеров canvas
setTimeout(() => {
    if (window.tabCharts && window.tabCharts[tabId]) {
        window.tabCharts[tabId].resize();
    }
}, 100);
}

console.log('✅ dashboardTabs.js: загружен');
