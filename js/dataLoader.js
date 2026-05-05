// ========================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================

let originalData = [];      // Исходные данные (никогда не меняются)
let currentData = [];       // Текущие данные (с учетом фильтров)
let currentFilters = {      // Активные фильтры
    company: '',            // Выбранная компания
    year: '',               // Выбранный год
    month: [],              // Выбранные месяцы (массив)
    channel: ''             // Выбранный канал
};

// ========================
// ОСНОВНАЯ ФУНКЦИЯ ЧТЕНИЯ EXCEL
// ========================

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
                
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true, blankrows: false });
                    
                    for (const row of jsonData) {
                        let company = row['компания'] || row['Компания'] || '';
                        let year = row['год'] || row['Год'] || '';
                        let month = row['месяц'] || row['Месяц'] || '';
                        let day = row['число'] || row['Число'] || '';
                        let type = row['Статья'] || row['статья'] || '';
                        let channel = row['канал'] || row['Канал'] || '';
                        let subCategory = row['подканал'] || row['Подканал'] || '';
                        let amount = parseFloat(row['сумма'] || row['Сумма'] || 0);
                        let account = row['Счет'] || row['счет'] || '';
                        
                        company = String(company).trim().toUpperCase();
                        year = String(year).trim();
                        month = String(month).trim().toLowerCase();
                        type = String(type).trim();
                        channel = String(channel).trim();
                        subCategory = String(subCategory).trim();
                        account = String(account).trim();
                        
                        if (!type && !account) continue;
                        if (amount === 0 && type !== 'Начальный остаток') continue;
                        
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
                        
                        if (type === 'Начальный остаток') {
                            year = '';
                            month = '';
                        }
                        
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
                
                // Обработка НДС
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
                
                for (const [key, ndsData] of ndsPairs.entries()) {
                    const calculatedNds = ndsData.исходящий - ndsData.входящий;
                    if (calculatedNds !== 0) {
                        const [company, year, month, channel] = key.split('|');
                        allProcessed.push({
                            компания: company, год: year, месяц: month, статья: 'НДС К УПЛАТЕ/ВОЗМЕЩЕНИЮ',
                            канал: channel, подканал: 'НДС', тип: 'НДС', сумма: calculatedNds, Счет: ''
                        });
                    }
                }
                
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

function applyFilters(data, filters = null) {
    const activePage = document.querySelector('.page-content.active')?.id;
    if (activePage === 'page-odds') {
        return data;
    }
    
    const f = filters || currentFilters;
    if (!f) return data;
    
    return data.filter(row => {
        if (row.статья === 'Начальный остаток') return true;
        
        if (f.company && row.компания !== f.company) return false;
        if (f.year && row.год !== f.year) return false;
        if (f.month && f.month.length > 0 && !f.month.includes(row.месяц)) return false;
        if (f.channel && row.канал !== f.channel) return false;
        
        return true;
    });
}

// ========================
// ОБНОВЛЕНИЕ ФИЛЬТРОВ
// ========================

function updateFilters() {
    console.log('updateFilters вызвана, данных:', originalData.length);
    
    const companies = [...new Set(originalData.map(d => d.компания))].filter(c => c);
    const years = [...new Set(originalData.map(d => d.год))].filter(y => y && y !== '').sort((a, b) => parseInt(a) - parseInt(b));
    const months = [...new Set(originalData.map(d => d.месяц))].filter(m => m && m !== '')
        .sort((a, b) => MONTHS_ORDER.indexOf(a) - MONTHS_ORDER.indexOf(b));
    const channels = [...new Set(originalData.map(d => d.канал))].filter(c => c && c !== '');
    
    console.log('Годы:', years);
    console.log('Каналы:', channels);
    
    // Создаём СКРЫТЫЙ фильтр компаний
    let companyFilter = document.getElementById('companyFilter');
    if (!companyFilter) {
        companyFilter = document.createElement('select');
        companyFilter.id = 'companyFilter';
        companyFilter.style.display = 'none';
        document.body.appendChild(companyFilter);
    }
    companyFilter.innerHTML = '<option value="">Все компании</option>' + companies.map(c => `<option value="${c}">${c}</option>`).join('');
    companyFilter.value = '';
    
    // Создаём СКРЫТЫЙ фильтр годов
    let yearFilter = document.getElementById('yearFilter');
    if (!yearFilter) {
        yearFilter = document.createElement('select');
        yearFilter.id = 'yearFilter';
        yearFilter.style.display = 'none';
        document.body.appendChild(yearFilter);
    }
    yearFilter.innerHTML = '<option value="">Все годы</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    if (years.length > 0) {
        const earliestYear = Math.min(...years.map(y => parseInt(y)));
        yearFilter.value = earliestYear.toString();
        currentFilters.year = earliestYear.toString();
        console.log('Выбран год:', earliestYear);
    }
    
    // Создаём СКРЫТЫЙ фильтр месяцев
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
    
    // Создаём СКРЫТЫЙ фильтр каналов
    let channelFilter = document.getElementById('channelFilter');
    if (!channelFilter) {
        channelFilter = document.createElement('select');
        channelFilter.id = 'channelFilter';
        channelFilter.style.display = 'none';
        document.body.appendChild(channelFilter);
    }
    channelFilter.innerHTML = '<option value="">Все каналы</option>' + channels.map(c => `<option value="${c}">${c}</option>`).join('');
    channelFilter.value = '';
    
    // Добавляем обработчик для канала
    channelFilter.onchange = () => {
        currentFilters.channel = channelFilter.value;
        currentData = applyFilters(originalData, currentFilters);
        renderDashboard();
        renderCashBlock();
    };
    
    // Обновляем модальное окно
    updateModalFilters();
}

// ========================
// ОБНОВЛЕНИЕ МОДАЛЬНЫХ ФИЛЬТРОВ
// ========================

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
// ЗАГРУЗКА ФАЙЛА
// ========================

async function loadFile(file) {
    try {
        const data = await readExcelFile(file);
        originalData = data;
        currentData = [...data];
        
        showNotification(`✅ Данные успешно загружены! (${data.length} записей)`, 'success');
        
        updateFilters();
        renderDashboard();
        
        const cashSidebarBlock = document.getElementById('cashSidebarBlock');
        if (cashSidebarBlock) cashSidebarBlock.style.display = 'block';
        
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) uploadArea.style.display = 'none';
        
    } catch (error) { 
        showNotification('Ошибка: ' + error.message, 'error');
    }
}
