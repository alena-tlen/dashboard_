// ========================
// КОНСТАНТЫ ПРИЛОЖЕНИЯ
// ========================

const MONTHS_ORDER = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const CHANNEL_MAPPING = {
    'wildberries': { displayName: 'Wildberries' },
    'ozon': { displayName: 'Ozon' },
    'detsky-mir': { displayName: 'Детский мир' },
    'lamoda': { displayName: 'Lamoda' }
};

const ALL_CHANNELS = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];

const EXCLUDED_FROM_TOP = [
    'Перевод с другого счета', 'Перевод на другой счет организации',
    'Перевод на другой счет', 'Перевод между счетами', 'Внутренний перевод'
];

const ALL_CURRENCIES = ['RUB', 'USD', 'EUR', 'CNY'];

// Экспортируем в window для глобального доступа
window.MONTHS_ORDER = MONTHS_ORDER;
window.CHANNEL_MAPPING = CHANNEL_MAPPING;
window.ALL_CHANNELS = ALL_CHANNELS;
window.EXCLUDED_FROM_TOP = EXCLUDED_FROM_TOP;
window.ALL_CURRENCIES = ALL_CURRENCIES;

console.log('✅ config.js: константы загружены');
