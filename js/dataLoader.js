// ========================
// dataLoader.js - ЗАГРУЗКА ДАННЫХ ИЗ EXCEL (ПОЛНАЯ ВЕРСИЯ)
// ========================

// Глобальные переменные
let originalData = [];
let currentData = [];
let currentFilters = {
    company: '',
    year: '',
    month: [],
    channel: ''
};

// Месяцы для фильтрации
const MONTHS_ORDER = window.MONTHS_ORDER || ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

// ========================
// ОСНОВНАЯ ФУНКЦИЯ ЧТЕНИЯ EXCEL (ПОЛНАЯ ВЕРСИЯ ИЗ МОНОЛИТА)
// ========================

/**
 * Читает Excel файл и возвращает массив данных
 * @param {File} file - загруженный файл
 * @returns {Promise<Array>} - массив данных
 */
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            reject(new Error('XLSX библиотека не загружена'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellFormula: false, cellText: false });
                const allProcessed = [];
                
                // Проходим по всем листам
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true, blankrows: false });
                    
                    for (const row of jsonData) {
                        // Извлекаем данные из строки
                        let company = row['компания'] || row['Компания'] || '';
                        let year = row['год'] || row['Год'] || '';
                        let month = row['месяц'] || row['Месяц'] || '';
                        let day = row['число'] || row['Число'] || row['день'] || row['День'] || '1';
                        let type = row['Статья'] || row['статья'] || '';
                        let channel = row['канал'] || row['Канал'] || '';
                        let subCategory = row['подканал'] || row['Подканал'] || '';
                        let amount = parseFloat(row['сумма'] || row['Сумма'] || 0);
                        let account = row['Счет'] || row['счет'] || '';
                        
                        // Нормализация данных
                        company = String(company).trim().toUpperCase();
                        year = String(year).trim();
                        month = String(month).trim().toLowerCase();
                        type = String(type).trim();
                        channel = String(channel).trim();
                        subCategory = String(subCategory).trim();
                        account = String(account).trim();
                        
                        // Пропускаем пустые строки
                        if (!type && !account) continue;
                        if (amount === 0 && type !== 'Начальный остаток') continue;
                        
                        // Определяем тип записи
                        let mappedType = '';
                        if (type === 'Доход') mappedType = 'Доход';
                        else if (type === 'Расход') mappedType = 'Расход';
                        else if (type === 'НДС') mappedType = 'НДС';
                        else if (type === 'Справочно') mappedType = 'Справочная';
                        else if (type === 'Начальный остаток') mappedType = 'Справочная';
                        else if (type === 'Поступление на расчетный счет') mappedType = 'Справочная';
                        else if (type === 'Списание с расчетного счета') mappedType = 'Справочная';
                        else if (type === 'Перечисление заработной платы по ведомостям') mappedType = 'Справочная';
                        else if (type === 'Уплата налога') mappedType = 'Справочная';
                        else if (type === 'Перечисление подотчетному лицу') mappedType = 'Справочная';
                        else if (type === 'Комиссия банка') mappedType = 'Справочная';
                        else if (type === 'Оплата поставщику') mappedType = 'Справочная';
                        else if (type === 'Оплата от покупателя') mappedType = 'Справочная';
                        else if (type === 'Возврат покупателю') mappedType = 'Справочная';
                        else if (type === 'Перевод с другого счета') mappedType = 'Справочная';
                        else if (type === 'Перевод на другой счет организации') mappedType = 'Справочная';
                        else if (type === 'Получение займа от контрагента') mappedType = 'Справочная';
                        else if (type === 'Приобретение иностранной валюты') mappedType = 'Справочная';
                        
                        if (!mappedType) continue;
                        
                        // Для начальных остатков очищаем год/месяц
                        if (type === 'Начальный остаток') {
                            year = '';
                            month = '';
                        }
                        
                        // Добавляем запись
                        allProcessed.push({ 
                            компания: company || 'A', 
                            год: year, 
                            месяц: month, 
                            число: day,
                            статья: type,
                            канал: channel, 
                            подканал: subCategory, 
                            тип: mappedType, 
                            сумма: amount,
                            Счет: account
                        });
                    }
                }
                
                // ========================
                // ОБРАБОТКА НДС (РАСЧЁТ ИТОГОВОГО НДС)
                // ========================
                const ndsPairs = new Map();
                for (const row of allProcessed) {
                    if (row.статья === 'НДС' && (row.подканал === 'НДС исходящий' || row.подканал === 'НДС входящий')) {
                        const key = `${row.компания}|${row.год}|${row.месяц}|${row.канал}`;
                        if (!ndsPairs.has(key)) ndsPairs.set(key, { исходящий: 0, входящий: 0 });
                        const ndsData = ndsPairs.get(key);
                        if (row.подканал === 'НДС исходящий') ndsData.исходящий += row.сумма;
                        if (row.подканал === 'НДС входящий') ndsData.входящий += row.сумма;
                    }
                }
                
                // Добавляем рассчитанный НДС
                for (const [key, ndsData] of ndsPairs.entries()) {
                    const calculatedNds = ndsData.исходящий - ndsData.входящий;
                    if (calculatedNds !== 0) {
                        const [company, year, month, channel] = key.split('|');
                        allProcessed.push({
                            компания: company, 
                            год: year, 
                            месяц: month, 
                            статья: 'НДС К УПЛАТЕ/ВОЗМЕЩЕНИЮ',
                            канал: channel, 
                            подканал: 'НДС', 
                            тип: 'НДС', 
                            сумма: calculatedNds,
                            Счет: ''
                        });
                    }
                }
                
                // Проверяем результат
                if (allProcessed.length === 0) {
                    reject(new Error('Не найдено данных для анализа'));
                } else {
                    console.log(`Загружено ${allProcessed.length} записей`);
                    
                    // Диагностика: выводим операции по счетам с датами
                    const cashOps = allProcessed.filter(r => r.Счет && r.статья !== 'Начальный остаток');
                    console.log('Операции по счетам с датами:', cashOps.length);
                    
                    // Диагностика дат
                    console.log('=== ДИАГНОСТИКА ДАТ В ЗАГРУЖЕННОМ ФАЙЛЕ ===');
                    const sampleRows = allProcessed.slice(0, 20);
                    console.log('Первые 20 записей:');
                    sampleRows.forEach((row, idx) => {
                        console.log(`${idx + 1}. год=${row.год}, месяц=${row.месяц}, число=${row.число}, статья=${row.статья}, сумма=${row.сумма}, счет=${row.Счет?.substring(0, 30)}`);
                    });
                    
                    resolve(allProcessed);
                }
            } catch (error) { 
                console.error('Ошибка при чтении файла:', error);
                reject(error); 
            }
        };
        
        reader.onerror = (error) => { 
            console.error('Ошибка FileReader:', error);
            reject(error); 
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// ========================
// ПРИМЕНЕНИЕ ФИЛЬТРОВ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Применяет фильтры к данным
 * @param {Array} data - массив данных
 * @param {Object} filters - объект с фильтрами
 * @returns {Array} - отфильтрованные данные
 */
function applyFilters(data, filters = null) {
    const activePage = document.querySelector('.page-content.active')?.id;
    
    // ОДДС полностью игнорирует глобальные фильтры
    if (activePage === 'page-odds') {
        return data;
    }
    
    const f = filters || currentFilters;
    if (!f) return data;
    
    return data.filter(row => {
        // Начальные остатки всегда включаем
        if (row.статья === 'Начальный остаток') return true;
        
        // Фильтр по компании
        if (f.company && row.компания !== f.company) return false;
        
        // Фильтр по году
        if (f.year && row.год !== f.year) return false;
        
        // Фильтр по месяцам (ВАЖНО: множественный выбор)
        if (f.month && f.month.length > 0 && !f.month.includes(row.месяц)) {
            return false;
        }
        
        // Фильтр по каналу
        if (f.channel && row.канал !== f.channel) return false;
        
        return true;
    });
}

// ========================
// ОБНОВЛЕНИЕ ФИЛЬТРОВ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Обновляет все фильтры на основе загруженных данных
 */
function updateFilters() {
    console.log('updateFilters вызвана, данных:', originalData.length);
    
    // Собираем уникальные значения
    const companies = [...new Set(originalData.map(d => d.компания))].filter(c => c);
    const years = [...new Set(originalData.map(d => d.год))].filter(y => y && y !== '').sort((a, b) => parseInt(a) - parseInt(b));
    const months = [...new Set(originalData.map(d => d.месяц))].filter(m => m && m !== '')
        .sort((a, b) => MONTHS_ORDER.indexOf(a) - MONTHS_ORDER.indexOf(b));
    
    // Только разрешённые каналы
    const allowedChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Оптовики', 'Фулфилмент'];
    const channels = [...new Set(originalData.map(d => d.канал))].filter(c => allowedChannels.includes(c));
    
    console.log('Каналы для фильтра:', channels);
    
    // ========================
    // СОЗДАЁМ СКРЫТЫЙ ФИЛЬТР КОМПАНИЙ
    // ========================
    let companyFilter = document.getElementById('companyFilter');
    if (!companyFilter) {
        companyFilter = document.createElement('select');
        companyFilter.id = 'companyFilter';
        companyFilter.style.display = 'none';
        document.body.appendChild(companyFilter);
    }
    companyFilter.innerHTML = '<option value="">Все компании</option>' + companies.map(c => `<option value="${c}">${c}</option>`).join('');
    companyFilter.value = '';
    
    // ========================
    // СОЗДАЁМ СКРЫТЫЙ ФИЛЬТР ГОДОВ
    // ========================
    let yearFilter = document.getElementById('yearFilter');
    if (!yearFilter) {
        yearFilter = document.createElement('select');
        yearFilter.id = 'yearFilter';
        yearFilter.style.display = 'none';
        document.body.appendChild(yearFilter);
    }
    yearFilter.innerHTML = '<option value="">Все годы</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    
    // Выбираем самый ранний год по умолчанию
    if (years.length > 0) {
        const earliestYear = Math.min(...years.map(y => parseInt(y)));
        yearFilter.value = earliestYear.toString();
        currentFilters.year = earliestYear.toString();
        console.log('Выбран год:', earliestYear);
    }
    
    // ========================
    // СОЗДАЁМ СКРЫТЫЙ ФИЛЬТР МЕСЯЦЕВ (МНОЖЕСТВЕННЫЙ ВЫБОР)
    // ========================
    let monthFilter = document.getElementById('monthFilter');
    if (!monthFilter) {
        monthFilter = document.createElement('select');
        monthFilter.id = 'monthFilter';
        monthFilter.style.display = 'none';
        monthFilter.setAttribute('multiple', 'multiple');
        document.body.appendChild(monthFilter);
    }
    monthFilter.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
    Array.from(monthFilter.options).forEach(opt => opt.selected = false);
    
    // ========================
    // СОЗДАЁМ СКРЫТЫЙ ФИЛЬТР КАНАЛОВ
    // ========================
    let channelFilter = document.getElementById('channelFilter');
    if (!channelFilter) {
        channelFilter = document.createElement('select');
        channelFilter.id = 'channelFilter';
        channelFilter.style.display = 'none';
        document.body.appendChild(channelFilter);
    }
    channelFilter.innerHTML = '<option value="">Все каналы</option>' + 
        channels.map(c => `<option value="${c}">${c}</option>`).join('');
    channelFilter.value = '';
    
    // Добавляем обработчик для канала
    channelFilter.onchange = () => {
        currentFilters.channel = channelFilter.value;
        currentData = applyFilters(originalData, currentFilters);
        renderDashboard();
        renderCashBlock();
    };
    
    // ========================
    // ОБНОВЛЯЕМ МОДАЛЬНОЕ ОКНО
    // ========================
    updateModalFilters();
}

// ========================
// ОБНОВЛЕНИЕ МОДАЛЬНЫХ ФИЛЬТРОВ
// ========================

/**
 * Обновляет фильтры в модальном окне
 */
function updateModalFilters() {
    const modalCompanyFilter = document.getElementById('modalCompanyFilter');
    const modalYearFilter = document.getElementById('modalYearFilter');
    const modalMonthFilter = document.getElementById('modalMonthFilter');
    const modalChannelFilter = document.getElementById('modalChannelFilter');
    
    const realCompanyFilter = document.getElementById('companyFilter');
    const realYearFilter = document.getElementById('yearFilter');
    const realMonthFilter = document.getElementById('monthFilter');
    const realChannelFilter = document.getElementById('channelFilter');
    
    if (modalCompanyFilter && realCompanyFilter) {
        modalCompanyFilter.innerHTML = realCompanyFilter.innerHTML;
        modalCompanyFilter.value = realCompanyFilter.value;
    }
    
    if (modalYearFilter && realYearFilter) {
        modalYearFilter.innerHTML = realYearFilter.innerHTML;
        modalYearFilter.value = realYearFilter.value;
    }
    
    if (modalMonthFilter && realMonthFilter) {
        modalMonthFilter.innerHTML = realMonthFilter.innerHTML;
        Array.from(modalMonthFilter.options).forEach(opt => opt.selected = false);
        Array.from(realMonthFilter.selectedOptions).forEach(selectedOpt => {
            const optToSelect = Array.from(modalMonthFilter.options).find(o => o.value === selectedOpt.value);
            if (optToSelect) optToSelect.selected = true;
        });
    }
    
    if (modalChannelFilter && realChannelFilter) {
        modalChannelFilter.innerHTML = realChannelFilter.innerHTML;
        modalChannelFilter.value = realChannelFilter.value;
    }
}

// ========================
// ЗАГРУЗКА ФАЙЛА (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Загружает файл и инициализирует приложение
 * @param {File} file - загруженный файл
 */
async function loadFile(file) {
    try {
        const data = await readExcelFile(file);
        originalData = data;
        currentData = [...data];
        
        // Сохраняем в window для глобального доступа
        window.originalData = originalData;
        window.currentData = currentData;
        
        showNotification(`✅ Данные успешно загружены! (${data.length} записей)`, 'success');
        
        updateFilters();
        renderDashboard();
        renderCashBlock();
        
        // Показываем блок денежных средств
        const cashSidebarBlock = document.getElementById('cashSidebarBlock');
        if (cashSidebarBlock) cashSidebarBlock.style.display = 'block';
        
        // Скрываем область загрузки
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) uploadArea.style.display = 'none';
        
    } catch (error) { 
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

/**
 * Получает предыдущие месяцы относительно выбранных
 * @param {Array} months - массив выбранных месяцев
 * @param {number} count - сколько месяцев назад
 * @returns {Array} - массив названий предыдущих месяцев
 */
function getPreviousMonths(months, count = 1) {
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

/**
 * Показывает уведомление
 * @param {string} message - текст уведомления
 * @param {string} type - тип уведомления
 */
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
// ЭКСПОРТ ФУНКЦИЙ В WINDOW
// ========================

window.originalData = originalData;
window.currentData = currentData;
window.currentFilters = currentFilters;
window.applyFilters = applyFilters;
window.loadFile = loadFile;
window.updateFilters = updateFilters;
window.getPreviousMonths = getPreviousMonths;
window.showNotification = showNotification;

console.log('✅ dataLoader.js: ПОЛНАЯ версия загружена');
