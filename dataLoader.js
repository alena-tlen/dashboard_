// ========================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================

let originalData = [];      // Исходные данные (никогда не меняются)
let currentData = [];       // Текущие данные (с учетом фильтров)
let currentFilters = {      // Активные фильтры
    company: '',            // Выбранная компания
    year: '',               // Выбранный год
    month: []               // Выбранные месяцы (массив)
};

// ========================
// ОСНОВНАЯ ФУНКЦИЯ ЧТЕНИЯ EXCEL
// ========================

/**
 * Читает Excel файл и преобразует в массив объектов
 * @param {File} file - выбранный файл
 * @returns {Promise<Array>} - массив записей
 */
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        // Проверяем, загружена ли библиотека XLSX
        if (typeof XLSX === 'undefined') {
            reject(new Error('XLSX библиотека не загружена'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // 1. Получаем бинарные данные
                const data = new Uint8Array(e.target.result);
                
                // 2. Читаем Excel
                const workbook = XLSX.read(data, { 
                    type: 'array', 
                    cellFormula: false, 
                    cellText: false 
                });
                
                const allProcessed = [];  // Массив для всех обработанных записей
                
                // 3. Обрабатываем каждый лист Excel
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { 
                        defval: "",      // Пустые ячейки → ""
                        raw: true,       // Читаем как есть
                        blankrows: false // Пропускаем пустые строки
                    });
                    
                    // 4. Обрабатываем каждую строку
                    for (const row of jsonData) {
                        // Извлекаем данные из разных возможных названий колонок
                        let company = row['компания'] || row['Компания'] || '';
                        let year = row['год'] || row['Год'] || '';
                        let month = row['месяц'] || row['Месяц'] || '';
                        let day = row['число'] || row['Число'] || '';
                        let type = row['Статья'] || row['статья'] || '';
                        let channel = row['канал'] || row['Канал'] || '';
                        let subCategory = row['подканал'] || row['Подканал'] || '';
                        let amount = parseFloat(row['сумма'] || row['Сумма'] || 0);
                        let account = row['Счет'] || row['счет'] || '';
                        
                        // Нормализуем данные (убираем пробелы, приводим к единому формату)
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
                        
                        // Если тип не определился - пропускаем
                        if (!mappedType) continue;
                        
                        // Для начальных остатков очищаем даты
                        if (type === 'Начальный остаток') {
                            year = '';
                            month = '';
                        }
                        
                        // Добавляем запись в массив
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
                // 5. ОБРАБОТКА НДС
                // ========================
                // Группируем НДС исходящий и входящий
                const ndsPairs = new Map();
                
                for (const row of allProcessed) {
                    if (row.статья === 'НДС' && 
                        (row.подканал === 'НДС исходящий' || row.подканал === 'НДС входящий')) {
                        
                        const key = `${row.компания}|${row.год}|${row.месяц}|${row.канал}`;
                        
                        if (!ndsPairs.has(key)) {
                            ndsPairs.set(key, { исходящий: 0, входящий: 0 });
                        }
                        
                        const ndsData = ndsPairs.get(key);
                        if (row.подканал === 'НДС исходящий') {
                            ndsData.исходящий += row.сумма;
                        }
                        if (row.подканал === 'НДС входящий') {
                            ndsData.входящий += row.сумма;
                        }
                    }
                }
                
                // Создаем записи для рассчитанного НДС
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
                
                // 6. Проверяем, есть ли данные
                if (allProcessed.length === 0) {
                    reject(new Error('Не найдено данных для анализа'));
                } else {
                    console.log(`Загружено ${allProcessed.length} записей`);
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
// ПРИМЕНЕНИЕ ФИЛЬТРОВ
// ========================

/**
 * Применяет фильтры к данным
 * @param {Array} data - массив данных
 * @param {Object} filters - объект с фильтрами
 * @returns {Array} - отфильтрованный массив
 */
function applyFilters(data, filters = null) {
    // ОДДС полностью игнорирует глобальные фильтры
    const activePage = document.querySelector('.page-content.active')?.id;
    if (activePage === 'page-odds') {
        return data;
    }
    
    const f = filters || currentFilters;
    if (!f) return data;
    
    return data.filter(row => {
        // Начальные остатки всегда показываем
        if (row.статья === 'Начальный остаток') return true;
        
        // Применяем фильтры
        if (f.company && row.компания !== f.company) return false;
        if (f.year && row.год !== f.year) return false;
        if (f.month && f.month.length > 0 && !f.month.includes(row.месяц)) return false;
        
        return true;
    });
}

// ========================
// ОБНОВЛЕНИЕ ФИЛЬТРОВ
// ========================

/**
 * Обновляет выпадающие списки фильтров на основе данных
 */
function updateFilters() {
    // Собираем уникальные значения
    const companies = [...new Set(originalData.map(d => d.компания))].filter(c => c);
    const years = [...new Set(originalData.map(d => d.год))].filter(y => y && y !== '').sort();
    const months = [...new Set(originalData.map(d => d.месяц))].filter(m => m && m !== '')
        .sort((a, b) => MONTHS_ORDER.indexOf(a) - MONTHS_ORDER.indexOf(b));
    
    // Находим элементы фильтров
    const companyFilter = document.getElementById('companyFilter');
    const yearFilter = document.getElementById('yearFilter');
    const monthFilter = document.getElementById('monthFilter');
    
    // Заполняем выпадающие списки
    if (companyFilter) {
        companyFilter.innerHTML = '<option value="">Все компании</option>' + 
            companies.map(c => `<option value="${c}">${c}</option>`).join('');
        companyFilter.value = '';
    }
    
    if (yearFilter) {
        yearFilter.innerHTML = '<option value="">Все годы</option>' + 
            years.map(y => `<option value="${y}">${y}</option>`).join('');
        
        // Автоматически выбираем самый ранний год
        if (years.length > 0) {
            const earliestYear = Math.min(...years.map(y => parseInt(y)));
            yearFilter.value = earliestYear.toString();
        }
    }
    
    if (monthFilter) {
        monthFilter.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
        monthFilter.setAttribute('multiple', 'multiple');
        monthFilter.size = 4;
        // Очищаем выбранные месяцы
        Array.from(monthFilter.options).forEach(opt => opt.selected = false);
    }
}

// ========================
// ЗАГРУЗКА ФАЙЛА
// ========================

/**
 * Загружает файл и обновляет глобальные данные
 * @param {File} file - выбранный файл
 */
async function loadFile(file) {
    try {
        const data = await readExcelFile(file);
        originalData = data;
        currentData = [...data];  // Копируем данные
        
        showNotification(`✅ Данные успешно загружены! (${data.length} записей)`, 'success');
        
        // Обновляем фильтры на основе новых данных
        updateFilters();
        
        // Перерисовываем дашборд
        renderDashboard();
        
        // Показываем блок с денежными средствами
        const cashSidebarBlock = document.getElementById('cashSidebarBlock');
        if (cashSidebarBlock) {
            cashSidebarBlock.style.display = 'block';
        }
        
        // Скрываем область загрузки
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.style.display = 'none';
        }
        
    } catch (error) { 
        showNotification('Ошибка: ' + error.message, 'error');
    }
}
