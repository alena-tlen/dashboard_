// ========================
// cashModule.js - УПРАВЛЕНИЕ ДЕНЕЖНЫМИ СРЕДСТВАМИ (ПОЛНАЯ ВЕРСИЯ)
// ========================

// Глобальные переменные
let cashData = {};
let accountsVisible = false;

// Месяцы для фильтрации
const MONTHS_ORDER_CASH = window.MONTHS_ORDER || ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

// ========================
// ОСНОВНОЙ РАСЧЕТ ДЕНЕЖНЫХ СРЕДСТВ (ПОЛНАЯ ВЕРСИЯ ИЗ МОНОЛИТА)
// ========================

/**
 * Рассчитывает остатки на всех банковских счетах
 * @returns {Object} - объект с балансами по счетам и общей суммой
 */
function calculateCashData() {
    // Хранилища для разных типов данных
    const initialBalances = {};
    const allAccounts = new Set();
    
    // Получаем текущие фильтры
    const selectedYear = currentFilters.year ? String(currentFilters.year) : '';
    const selectedMonths = currentFilters.month || [];
    const isNoFilters = !selectedYear && selectedMonths.length === 0;
    
    // Определяем последний выбранный месяц
    let latestMonthIndex = -1;
    for (const month of selectedMonths) {
        const idx = MONTHS_ORDER_CASH.indexOf(month);
        if (idx !== -1 && idx > latestMonthIndex) latestMonthIndex = idx;
    }
    
    /**
     * Определяет, нужно ли учитывать операцию при расчете баланса
     */
    function shouldIncludeInBalance(year, month) {
        if (isNoFilters) return true;
        if (!year || !month || year === '' || month === '') return false;
        
        const yearNum = parseInt(year);
        const selectedYearNum = parseInt(selectedYear);
        if (isNaN(yearNum) || isNaN(selectedYearNum)) return false;
        
        const monthIndex = MONTHS_ORDER_CASH.indexOf(month);
        if (monthIndex === -1) return false;
        
        // Если выбран год без месяцев
        if (selectedYear && selectedMonths.length === 0) {
            return yearNum <= selectedYearNum;
        }
        
        // Если выбран год и конкретные месяцы
        if (selectedYear && selectedMonths.length > 0) {
            if (yearNum < selectedYearNum) return true;
            if (yearNum === selectedYearNum && monthIndex <= latestMonthIndex) return true;
            return false;
        }
        
        return false;
    }
    
    /**
     * Определяет, нужно ли показывать операцию в деталях
     */
    function shouldShowInDetails(year, month) {
        if (isNoFilters) return true;
        if (!year || !month || year === '' || month === '') return false;
        
        const yearNum = parseInt(year);
        const selectedYearNum = parseInt(selectedYear);
        if (isNaN(yearNum) || isNaN(selectedYearNum)) return false;
        
        // Показываем только операции за выбранный период
        if (selectedYear && selectedMonths.length === 0) {
            return yearNum === selectedYearNum;
        }
        
        if (selectedYear && selectedMonths.length > 0) {
            return yearNum === selectedYearNum && selectedMonths.includes(month);
        }
        return false;
    }
    
    // Используем оригинальные данные (без фильтров)
    const allData = originalData.length > 0 ? originalData : currentData;
    
    // ========================
    // 1. СБОР НАЧАЛЬНЫХ ОСТАТКОВ
    // ========================
    allData.forEach(row => {
        const article = row.статья || '';
        const amount = parseFloat(row.сумма) || 0;
        const account = row.Счет || row.счет || row['Счет'] || '';
        
        if (!account) return;
        
        if (article === 'Начальный остаток') {
            if (!initialBalances[account]) initialBalances[account] = 0;
            initialBalances[account] += amount;
            allAccounts.add(account);
        }
    });
    
    // ========================
    // 2. СБОР ВСЕХ ОПЕРАЦИЙ
    // ========================
    const cumulativeIncome = {};
    const cumulativeExpense = {};
    const allTransactions = {};
    
    allData.forEach(row => {
        const article = row.статья || '';
        const amount = parseFloat(row.сумма) || 0;
        const account = row.Счет || row.счет || row['Счет'] || '';
        let year = row.год;
        let month = row.месяц;
        
        // Пропускаем начальные остатки и пустые суммы
        if (!account) return;
        if (article === 'Начальный остаток') return;
        if (amount === 0) return;
        
        // Приводим к строке
        if (year !== undefined && year !== null) year = String(year);
        if (month !== undefined && month !== null) month = String(month);
        
        // ========================
        // ОПРЕДЕЛЕНИЕ ТИПА ОПЕРАЦИИ
        // ========================
        let isIncome = false;
        let isExpense = false;
        let absAmount = Math.abs(amount);
        
        // Специальные правила для банковских операций
        if (article === 'Списание с расчетного счета') {
            isExpense = true;
            isIncome = false;
        }
        else if (article === 'Поступление на расчетный счет') {
            isIncome = true;
            isExpense = false;
        }
        // Для остальных: по знаку суммы
        else if (amount > 0) {
            isIncome = true;
        } else if (amount < 0) {
            isExpense = true;
        }
        
        // Учитываем в балансе
        const includeInBalance = shouldIncludeInBalance(year, month);
        const includeInDetails = shouldShowInDetails(year, month);
        
        // Накопление для баланса
        if (includeInBalance) {
            if (isIncome) {
                if (!cumulativeIncome[account]) cumulativeIncome[account] = 0;
                cumulativeIncome[account] += absAmount;
            } else if (isExpense) {
                if (!cumulativeExpense[account]) cumulativeExpense[account] = 0;
                cumulativeExpense[account] += absAmount;
            }
        }
        
        // Сохраняем для детального отображения
        if (includeInDetails) {
            if (!allTransactions[account]) {
                allTransactions[account] = { incomeItems: [], expenseItems: [] };
            }
            if (isIncome) {
                allTransactions[account].incomeItems.push({ 
                    amount: absAmount, 
                    description: article,
                    year: year,
                    month: month
                });
            } else if (isExpense) {
                allTransactions[account].expenseItems.push({ 
                    amount: absAmount, 
                    description: article,
                    year: year,
                    month: month
                });
            }
        }
    });
    
    // ========================
    // 3. РАСЧЕТ БАЛАНСОВ
    // ========================
    const accountBalances = [];
    let totalBalance = 0;
    
    for (const account of allAccounts) {
        const initial = initialBalances[account] || 0;
        const income = cumulativeIncome[account] || 0;
        const expense = cumulativeExpense[account] || 0;
        const balance = initial + income - expense;
        
        // Сокращаем длинные имена счетов для отображения
        let shortName = account;
        if (account.includes('ООО "ОЗОН Банк"')) shortName = 'Озон Банк';
        else if (account.includes('АЛЬФА-БАНК')) shortName = 'Альфа-Банк';
        else if (account.includes('ООО "Вайлдберриз Банк"')) shortName = 'Вайлдберриз Банк';
        else if (account.includes('ПАО СБЕРБАНК') || account.includes('Сбербанк')) shortName = 'Сбербанк';
        else if (account.includes('ВТБ')) shortName = 'ВТБ';
        else if (account.includes('CNY')) shortName = 'ВТБ (CNY)';
        else {
            shortName = account.substring(0, 35);
            if (account.length > 35) shortName += '...';
        }
        
        // Определяем валюту
        let currency = 'RUB';
        if (account.includes('CNY')) currency = 'CNY';
        else if (account.includes('USD')) currency = 'USD';
        else if (account.includes('EUR')) currency = 'EUR';
        
        const trans = allTransactions[account] || { incomeItems: [], expenseItems: [] };
        
        // Добавляем только счета с ненулевым балансом или операциями
        if (balance !== 0 || trans.incomeItems.length > 0 || trans.expenseItems.length > 0) {
            accountBalances.push({
                fullName: account,
                name: shortName,
                balance: balance,
                income: income,
                expense: expense,
                initial: initial,
                currency: currency,
                incomeItems: trans.incomeItems,
                expenseItems: trans.expenseItems
            });
        }
        
        // Суммируем только RUB балансы
        if (currency === 'RUB') totalBalance += balance;
    }
    
    // Сортируем по убыванию баланса
    accountBalances.sort((a, b) => b.balance - a.balance);
    
    // Формируем текст периода
    let periodText = '';
    if (selectedYear && selectedMonths.length > 0) {
        periodText = `на конец ${selectedMonths.join(', ')} ${selectedYear} г.`;
    } else if (selectedYear) {
        periodText = `на конец ${selectedYear} г.`;
    } else {
        periodText = `на текущую дату (все данные)`;
    }
    
    return { accountBalances, totalBalance, periodText };
}

// ========================
// ОТРИСОВКА БЛОКА ДЕНЕЖНЫХ СРЕДСТВ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Рендерит блок с балансами счетов в правой боковой панели
 */
function renderCashBlock() {
    const cashTotalCard = document.getElementById('cashTotalCard');
    const cashAccountsList = document.getElementById('cashAccountsList');
    
    if (!cashTotalCard) return;
    
    // Проверяем, есть ли данные
    if (!currentData || currentData.length === 0) {
        cashTotalCard.innerHTML = '<div class="cash-loading">📊 Загрузите данные для отображения</div>';
        cashAccountsList.innerHTML = '';
        return;
    }
    
    // Получаем расчетные данные
    const { accountBalances, totalBalance, periodText } = calculateCashData();
    
    if (accountBalances.length === 0) {
        cashTotalCard.innerHTML = '<div class="cash-loading">💰 Нет данных по счетам</div>';
        cashAccountsList.innerHTML = '';
        return;
    }
    
    // Функция форматирования суммы с валютой
    function formatCash(value, currency = 'RUB') {
        const formatter = new Intl.NumberFormat('ru-RU', { 
            minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
            maximumFractionDigits: 2
        });
        const symbol = currency === 'RUB' ? '₽' : currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : '€';
        return `${formatter.format(Math.abs(value))} ${symbol}`;
    }
    
    // Функция определения цвета баланса
    function getBalanceColor(value) {
        if (value > 0) return '#48bb78';
        if (value < 0) return '#f56565';
        return '#a0aec0';
    }
    
    // Максимальный баланс для масштабирования прогресс-баров
    const maxBalance = Math.max(...accountBalances.map(a => Math.abs(a.balance)), 1);
    
    // Генерируем HTML для каждого счета
    const accountsHtml = accountBalances.map((account, idx) => {
        const percent = (Math.abs(account.balance) / maxBalance) * 100;
        const balanceColor = getBalanceColor(account.balance);
        const balanceFormatted = formatCash(account.balance, account.currency);
        
        // Детали операций по счету (до 5 каждой категории)
        const incomeItemsHtml = account.incomeItems.slice(0, 10).map(item => `
            <div class="cash-detail-row">
                <span>📈 ${item.description}</span>
                <span class="cash-income">+${formatCash(item.amount, account.currency)}</span>
            </div>
        `).join('');
        
        const expenseItemsHtml = account.expenseItems.slice(0, 10).map(item => `
            <div class="cash-detail-row">
                <span>📉 ${item.description}</span>
                <span class="cash-expense">-${formatCash(item.amount, account.currency)}</span>
            </div>
        `).join('');
        
        const moreIncome = account.incomeItems.length > 10 ? `<div class="cash-detail-row"><span>...</span><span>и ещё ${account.incomeItems.length - 10} операций</span></div>` : '';
        const moreExpense = account.expenseItems.length > 10 ? `<div class="cash-detail-row"><span>...</span><span>и ещё ${account.expenseItems.length - 10} операций</span></div>` : '';
        
        return `
            <div class="cash-account-item" data-account-index="${idx}" 
                 style="opacity: 0; transform: translateY(10px); transition: all 0.3s ease; transition-delay: ${idx * 0.05}s;">
                <div class="cash-account-name">
                    <span>🏦</span>
                    <span>${account.name}</span>
                    ${account.currency !== 'RUB' ? 
                        `<span style="font-size: 10px; background: rgba(102,126,234,0.15); padding: 2px 6px; border-radius: 10px;">${account.currency}</span>` : ''
                    }
                </div>
                <div class="cash-account-balance">
                    <span style="color: ${balanceColor}; font-size: 18px; font-weight: 700;">${balanceFormatted}</span>
                    <span class="cash-account-currency">${account.balance >= 0 ? '↑' : '↓'} ${formatCash(Math.abs(account.balance), account.currency)}</span>
                </div>
                <div class="cash-progress">
                    <div class="cash-progress-bar" style="width: 0%; background: linear-gradient(90deg, ${balanceColor}, ${balanceColor === '#48bb78' ? '#667eea' : '#f56565'});"></div>
                </div>
                <div class="cash-account-details">
                    <div style="margin-bottom: 8px; font-size: 11px; font-weight: 600; color: #667eea;">Детали операций:</div>
                    ${incomeItemsHtml || '<div class="cash-detail-row"><span>—</span><span>нет поступлений</span></div>'}
                    ${moreIncome}
                    ${expenseItemsHtml || '<div class="cash-detail-row"><span>—</span><span>нет списаний</span></div>'}
                    ${moreExpense}
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(102,126,234,0.1); font-size: 10px; opacity: 0.6;">
                        Начальный остаток: ${formatCash(account.initial, account.currency)}<br>
                        Доходы: +${formatCash(account.income, account.currency)}<br>
                        Расходы: -${formatCash(account.expense, account.currency)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Общая сумма
    const totalFormatted = formatCash(totalBalance, 'RUB');
    const totalColor = getBalanceColor(totalBalance);
    
    const totalHtml = `
        <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">💰 Общий остаток (RUB)</div>
        <div class="cash-total-value" id="cashTotalValue" style="color: ${totalColor};">${totalFormatted}</div>
        <div style="font-size: 10px; opacity: 0.5; margin-top: 6px;">${accountBalances.length} ${declensionCash(accountBalances.length, 'счет', 'счета', 'счетов')}</div>
        <div style="font-size: 10px; opacity: 0.4; margin-top: 8px;">📅 ${periodText}</div>
    `;
    
    // Обновляем DOM
    cashTotalCard.innerHTML = totalHtml;
    cashAccountsList.innerHTML = accountsHtml;
    
    // Анимация прогресс-баров
    setTimeout(() => {
        document.querySelectorAll('.cash-progress-bar').forEach((bar, i) => {
            const targetWidth = accountBalances[i] ? (Math.abs(accountBalances[i].balance) / maxBalance) * 100 : 0;
            setTimeout(() => {
                bar.style.width = targetWidth + '%';
            }, 300 + i * 50);
        });
    }, 100);
    
    // ========================
    // РАСЧЕТ И ОТОБРАЖЕНИЕ ДЕПОЗИТА
    // ========================
    calculateAndRenderDeposit();
    
    // Обработчики кликов для раскрытия деталей счетов
    setTimeout(() => {
        document.querySelectorAll('.cash-account-item').forEach(item => {
            const details = item.querySelector('.cash-account-details');
            if (details) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (details.classList.contains('show')) {
                        details.classList.remove('show');
                    } else {
                        // Закрываем все другие открытые детали
                        document.querySelectorAll('.cash-account-details.show').forEach(d => {
                            d.classList.remove('show');
                        });
                        details.classList.add('show');
                    }
                });
            }
        });
    }, 200);
}

// ========================
// СКЛОНЕНИЕ ДЛЯ cashModule
// ========================

function declensionCash(number, one, two, five) {
    const n = Math.abs(number) % 100;
    if (n >= 11 && n <= 19) return five;
    const lastDigit = n % 10;
    if (lastDigit === 1) return one;
    if (lastDigit >= 2 && lastDigit <= 4) return two;
    return five;
}

// ========================
// РАСЧЕТ И ОТОБРАЖЕНИЕ ДЕПОЗИТА (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Рассчитывает остаток по депозиту и операции
 */
function calculateAndRenderDeposit() {
    let depositBalance = 0;
    let depositOperations = [];
    
    // 1. Собираем начальные остатки по депозиту
    originalData.forEach(row => {
        const article = row.статья || '';
        const channel = row.канал || '';
        const amount = parseFloat(row.сумма) || 0;
        const year = row.год;
        const month = row.месяц;
        
        if (article === 'Начальный остаток' && (channel === 'депозит' || channel === 'Депозит')) {
            depositBalance += amount;
            depositOperations.push({ 
                date: `${year}-${month}`, 
                amount: amount, 
                type: 'Начальный остаток',
                sign: '+'
            });
        }
    });
    
    // 2. Собираем операции по депозиту
    originalData.forEach(row => {
        const article = row.статья || '';
        const channel = row.канал || '';
        const subCategory = row.подканал || '';
        const amount = parseFloat(row.сумма) || 0;
        const year = row.год;
        const month = row.месяц;
        
        if (article === 'Начальный остаток') return;
        
        // Проверка фильтра периода
        let includeInPeriod = true;
        if (currentFilters.year && year != currentFilters.year) includeInPeriod = false;
        if (currentFilters.month?.length > 0 && !currentFilters.month.includes(month)) includeInPeriod = false;
        
        if (!includeInPeriod) return;
        
        // Операции по депозиту
        if (channel === 'Депозит' || channel === 'депозит') {
            // Списание = пополнение депозита (уход денег) → депозит УВЕЛИЧИВАЕТСЯ
            if (article === 'Списание с расчетного счета' && amount > 0) {
                depositBalance += amount;
                depositOperations.push({ 
                    date: `${year}-${month}`, 
                    amount: amount, 
                    type: 'Пополнение депозита',
                    sign: '+'
                });
            }
            // Поступление = возврат с депозита → депозит УМЕНЬШАЕТСЯ
            else if (article === 'Поступление на расчетный счет' && amount > 0) {
                depositBalance -= amount;
                depositOperations.push({ 
                    date: `${year}-${month}`, 
                    amount: amount, 
                    type: 'Возврат с депозита',
                    sign: '-'
                });
            }
        }
        
        // Дополнительно: если в подканале указано "Депозит"
        if (subCategory === 'Депозит' || subCategory === 'депозит') {
            if (amount > 0) {
                depositBalance += amount;
                depositOperations.push({ 
                    date: `${year}-${month}`, 
                    amount: amount, 
                    type: 'Пополнение депозита',
                    sign: '+'
                });
            }
        }
        
        // Возврат депозита по подканалу
        if (subCategory === 'Возврат депозита' && amount > 0) {
            depositBalance -= amount;
            depositOperations.push({ 
                date: `${year}-${month}`, 
                amount: amount, 
                type: 'Возврат депозита',
                sign: '-'
            });
        }
    });
    
    // Обновляем отображение депозита
    const depositSidebarBlock = document.getElementById('depositSidebarBlock');
    const depositTotalValue = document.getElementById('depositTotalValue');
    const depositOperationsList = document.getElementById('depositOperationsList');
    
    function formatCashDeposit(value) {
        const formatter = new Intl.NumberFormat('ru-RU', { 
            minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
            maximumFractionDigits: 2
        });
        return `${formatter.format(Math.abs(value))} ₽`;
    }
    
    if (depositSidebarBlock && depositTotalValue) {
        if (depositBalance !== 0 || depositOperations.length > 0) {
            depositSidebarBlock.style.display = 'block';
            depositTotalValue.innerHTML = formatCashDeposit(depositBalance);
            
            // Сортируем операции по дате
            depositOperations.sort((a, b) => a.date.localeCompare(b.date));
            
            const operationsHtml = depositOperations.slice(-15).map(op => `
                <div class="cash-detail-row">
                    <span>📅 ${op.date}</span>
                    <span style="display: flex; gap: 8px;">
                        <span class="${op.sign === '+' ? 'cash-income' : 'cash-expense'}">${op.sign === '+' ? '↑' : '↓'} ${op.type}</span>
                        <span class="${op.sign === '+' ? 'cash-income' : 'cash-expense'}">${op.sign === '+' ? '+' : '-'}${formatCashDeposit(op.amount)}</span>
                    </span>
                </div>
            `).join('');
            
            depositOperationsList.innerHTML = `
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(66,153,225,0.2);">
                    <div style="font-size: 11px; font-weight: 600; color: #4299e1; margin-bottom: 8px;">📋 История операций:</div>
                    ${operationsHtml || '<div class="cash-detail-row"><span>—</span><span>нет операций</span></div>'}
                </div>
                <div style="margin-top: 12px; padding: 8px; background: rgba(66,153,225,0.1); border-radius: 8px; font-size: 10px;">
                    💡 Депозит — это временно замороженные деньги. Они не участвуют в расчёте свободного остатка.
                </div>
            `;
        } else {
            depositSidebarBlock.style.display = 'none';
        }
    }
}

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

/**
 * Форматирует сумму для отображения в блоке денег
 * @param {number} value - сумма
 * @param {string} currency - валюта
 * @returns {string} отформатированная строка
 */
function formatCash(value, currency = 'RUB') {
    const formatter = new Intl.NumberFormat('ru-RU', { 
        minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
    });
    const symbol = currency === 'RUB' ? '₽' : currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : '€';
    return `${formatter.format(Math.abs(value))} ${symbol}`;
}

/**
 * Переключает видимость списка всех счетов
 */
function toggleAccountsVisibility() {
    const accountsList = document.getElementById('cashAccountsList');
    const toggleBtn = document.getElementById('toggleAccountsBtn');
    const toggleIcon = toggleBtn?.querySelector('.toggle-icon-cash');
    
    if (accountsList) {
        if (accountsList.classList.contains('show')) {
            accountsList.classList.remove('show');
            if (toggleIcon) toggleIcon.classList.remove('rotated');
            if (toggleBtn) toggleBtn.innerHTML = '<span class="toggle-icon-cash">▶</span> Показать все счета';
        } else {
            accountsList.classList.add('show');
            if (toggleIcon) toggleIcon.classList.add('rotated');
            if (toggleBtn) toggleBtn.innerHTML = '<span class="toggle-icon-cash">▼</span> Скрыть все счета';
            
            // Анимация появления счетов
            const items = accountsList.querySelectorAll('.cash-account-item');
            items.forEach((item, i) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, i * 50);
            });
        }
    }
}

/**
 * Диагностика Сбербанка (из монолита)
 */
function diagnoseSberbank() {
    console.log('=== ДИАГНОСТИКА СБЕРБАНКА ===');
    
    // Находим все операции по Сбербанку
    const sberbankOps = originalData.filter(row => {
        const account = row.Счет || '';
        return account.includes('СБЕРБАНК') || account.includes('Сбербанк');
    });
    
    console.log('Всего операций по Сбербанку:', sberbankOps.length);
    
    // Начальные остатки
    const initialOps = sberbankOps.filter(r => r.статья === 'Начальный остаток');
    console.log('Начальные остатки:', initialOps.length);
    initialOps.forEach(r => {
        console.log(`  Сумма: ${r.сумма}, год: ${r.год}, месяц: ${r.месяц}`);
    });
    
    // Поступления
    const incomeOps = sberbankOps.filter(r => r.сумма > 0 && r.статья !== 'Начальный остаток');
    console.log('Поступления:', incomeOps.length);
    incomeOps.forEach(r => {
        console.log(`  ${r.год} ${r.месяц}: ${r.статья}, сумма: ${r.сумма}`);
    });
    
    // Списания
    const expenseOps = sberbankOps.filter(r => r.сумма < 0 || (r.статья === 'Списание с расчетного счета' && r.сумма > 0));
    console.log('Списания:', expenseOps.length);
    expenseOps.forEach(r => {
        console.log(`  ${r.год} ${r.месяц}: ${r.статья}, сумма: ${r.сумма}`);
    });
    
    // Группировка по месяцам
    const byMonth = {};
    sberbankOps.forEach(r => {
        if (r.статья === 'Начальный остаток') return;
        const key = `${r.год}-${r.месяц}`;
        if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0, count: 0 };
        byMonth[key].count++;
        if (r.сумма > 0) byMonth[key].income += r.сумма;
        else byMonth[key].expense += Math.abs(r.сумма);
    });
    
    console.log('Операции по месяцам:');
    Object.keys(byMonth).sort().forEach(key => {
        const d = byMonth[key];
        console.log(`  ${key}: ${d.count} опер., доход: ${d.income.toFixed(2)}, расход: ${d.expense.toFixed(2)}`);
    });
}

// ========================
// ЭКСПОРТ ФУНКЦИЙ В WINDOW
// ========================

window.calculateCashData = calculateCashData;
window.renderCashBlock = renderCashBlock;
window.toggleAccountsVisibility = toggleAccountsVisibility;
window.diagnoseSberbank = diagnoseSberbank;

console.log('✅ cashModule.js: ПОЛНАЯ версия загружена');
