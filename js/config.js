// ========================
// config.js - КОНСТАНТЫ ПРИЛОЖЕНИЯ (ПОЛНАЯ ВЕРСИЯ)
// ========================

// Порядок месяцев
const MONTHS_ORDER = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

// Маппинг каналов для навигации
const CHANNEL_MAPPING = {
    'wildberries': { displayName: 'Wildberries' },
    'ozon': { displayName: 'Ozon' },
    'detsky-mir': { displayName: 'Детский мир' },
    'lamoda': { displayName: 'Lamoda' }
};

// Все возможные каналы
const ALL_CHANNELS = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];

// Операции, исключаемые из ТОП-списков (технические переводы)
const EXCLUDED_FROM_TOP = [
    'Перевод с другого счета', 
    'Перевод на другой счет организации',
    'Перевод на другой счет', 
    'Перевод между счетами', 
    'Внутренний перевод'
];

// Все доступные валюты
const ALL_CURRENCIES = ['RUB', 'USD', 'EUR', 'CNY'];

// Цвета для графиков
const CHART_COLORS = {
    primary: '#667eea',
    success: '#48bb78',
    danger: '#f56565',
    warning: '#ed8936',
    info: '#4299e1',
    dark: '#1a1a2a',
    light: '#f0f2f5'
};

// Настройки анимации
const ANIMATION_DURATION = {
    fast: 300,
    normal: 600,
    slow: 1000
};

// ========================
// ЭКСПОРТ В WINDOW
// ========================

window.MONTHS_ORDER = MONTHS_ORDER;
window.CHANNEL_MAPPING = CHANNEL_MAPPING;
window.ALL_CHANNELS = ALL_CHANNELS;
window.EXCLUDED_FROM_TOP = EXCLUDED_FROM_TOP;
window.ALL_CURRENCIES = ALL_CURRENCIES;
window.CHART_COLORS = CHART_COLORS;
window.ANIMATION_DURATION = ANIMATION_DURATION;

console.log('✅ config.js: ПОЛНАЯ версия загружена');
