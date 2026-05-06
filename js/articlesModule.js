// ========================
// articlesModule.js - БЛОК СТАТЕЙ И КАРУСЕЛЬ (ПОЛНАЯ ВЕРСИЯ)
// ========================

// Глобальные переменные
let articlesData = [];
let currentArticleIndex = 0;
let articleInterval = null;
let isArticleAnimating = false;

const ARTICLES_FILE_PATH = 'articles.json';

// ========================
// ЗАГРУЗКА СТАТЕЙ ИЗ JSON ФАЙЛА (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Загружает статьи из JSON файла
 * Если файл не найден, использует статьи по умолчанию
 */
async function loadArticles() {
    try {
        const response = await fetch(ARTICLES_FILE_PATH);
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить статьи');
        }
        
        const data = await response.json();
        articlesData = data.articles || [];
        
        console.log(`Загружено ${articlesData.length} статей`);
        
        renderArticles();
        startArticleCarousel();
        createArticleDots();
        
    } catch (error) {
        console.error('Ошибка загрузки статей:', error);
        
        // Статьи по умолчанию (как в монолите)
        articlesData = [
            {
                title: "Вы управляете ассортиментом или складом случайностей?",
                description: "Глубокая товарная и ценовая аналитика на маркетплейсах",
                link: "https://dzen.ru/a/aUqz1yENXTiPF2Dt",
                imageUrl: "https://avatars.dzeninfra.ru/get-zen_doc/271828/pub_6948cf24c058d37e481f1a68_695d80dca5ebb71be8c38b22/scale_1200",
                source: "Дзен"
            },
            {
                title: "Оптимизация расходов на маркетплейсах",
                description: "Советы по снижению затрат и повышению эффективности",
                link: "https://dzen.ru/a/aUjPJMBY035IHxpo",
                imageUrl: "",
                source: "Дзен"
            },
            {
                title: "Анализ конкурентов на Wildberries",
                description: "Как отслеживать цены и остатки конкурентов",
                link: "#",
                imageUrl: "",
                source: "Блог"
            },
            {
                title: "Управление товарными запасами на маркетплейсах",
                description: "Как избежать дефицита и пересклада",
                link: "#",
                imageUrl: "",
                source: "Блог"
            },
            {
                title: "Как увеличить средний чек в интернет-магазине",
                description: "10 проверенных способов",
                link: "#",
                imageUrl: "",
                source: "Блог"
            }
        ];
        
        renderArticles();
        startArticleCarousel();
        createArticleDots();
    }
}

// ========================
// ОТРИСОВКА СТАТЕЙ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Возвращает случайную иконку для статьи без картинки
 * @returns {string} - эмодзи
 */
function getRandomArticleIcon() {
    const icons = ['📄', '📊', '💰', '📈', '📉', '🏦', '💡', '🔍', '📚', '🎯', '📰', '📑', '📌', '⭐', '🔥'];
    return icons[Math.floor(Math.random() * icons.length)];
}

/**
 * Форматирует дату для отображения (если есть)
 * @param {string} dateStr - строка с датой
 * @returns {string} - отформатированная дата
 */
function formatArticleDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    } catch(e) {
        return '';
    }
}

/**
 * Отрисовывает все статьи в карусели
 * Формат: картинка сверху, контент снизу (как в монолите)
 */
function renderArticles() {
    const carousel = document.getElementById('articlesCarousel');
    if (!carousel) return;
    
    carousel.innerHTML = articlesData.map((article, index) => {
        const imageElement = article.imageUrl && article.imageUrl !== '' ? 
            `<img src="${article.imageUrl}" class="article-image" alt="${article.title}" loading="lazy">` : 
            `<div class="article-image-placeholder">${getRandomArticleIcon()}</div>`;
        
        const dateHtml = article.date ? `<div style="font-size: 10px; opacity: 0.5; margin-bottom: 4px;">📅 ${formatArticleDate(article.date)}</div>` : '';
        
        return `
            <div class="article-card" data-index="${index}">
                <div class="article-image-container">
                    ${imageElement}
                </div>
                <div class="article-content">
                    <div class="article-source">${article.source || 'Полезная статья'}</div>
                    ${dateHtml}
                    <div class="article-title">${article.title}</div>
                    <div class="article-description">${article.description || 'Читайте подробнее в источнике'}</div>
                    <div class="article-link">
                        Читать далее <span>→</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики кликов на карточки
    document.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(card.dataset.index);
            if (!isNaN(index) && articlesData[index] && articlesData[index].link && articlesData[index].link !== '#') {
                window.open(articlesData[index].link, '_blank');
            } else if (articlesData[index] && articlesData[index].link === '#') {
                showNotification('Статья временно недоступна', 'info');
            }
        });
    });
    
    updateCarouselPosition();
}

/**
 * Обновляет позицию карусели (сдвиг по горизонтали)
 */
function updateCarouselPosition() {
    const carousel = document.getElementById('articlesCarousel');
    if (!carousel) return;
    
    const offset = -currentArticleIndex * 100;
    carousel.style.transform = `translateX(${offset}%)`;
}

// ========================
// ТОЧКИ НАВИГАЦИИ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Создает точки-индикаторы для навигации по карусели
 */
function createArticleDots() {
    const dotsContainer = document.getElementById('articlesDots');
    if (!dotsContainer) return;
    
    dotsContainer.innerHTML = articlesData.map((_, index) => `
        <div class="articles-dot ${index === currentArticleIndex ? 'active' : ''}" 
             data-index="${index}">
        </div>
    `).join('');
    
    document.querySelectorAll('.articles-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(dot.dataset.index);
            if (!isNaN(index) && index !== currentArticleIndex) {
                goToArticle(index);
            }
        });
    });
}

/**
 * Обновляет активную точку навигации
 */
function updateActiveDot() {
    document.querySelectorAll('.articles-dot').forEach((dot, index) => {
        if (index === currentArticleIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// ========================
// НАВИГАЦИЯ ПО КАРУСЕЛИ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Переход к определенной статье
 * @param {number} index - индекс статьи
 */
function goToArticle(index) {
    if (isArticleAnimating) return;
    if (index < 0 || index >= articlesData.length) return;
    
    isArticleAnimating = true;
    currentArticleIndex = index;
    
    updateCarouselPosition();
    updateActiveDot();
    
    resetArticleTimer();
    
    setTimeout(() => {
        isArticleAnimating = false;
    }, 500);
}

/**
 * Следующая статья
 */
function nextArticle() {
    let newIndex = currentArticleIndex + 1;
    if (newIndex >= articlesData.length) {
        newIndex = 0;
    }
    goToArticle(newIndex);
}

/**
 * Предыдущая статья
 */
function prevArticle() {
    let newIndex = currentArticleIndex - 1;
    if (newIndex < 0) {
        newIndex = articlesData.length - 1;
    }
    goToArticle(newIndex);
}

// ========================
// АВТОМАТИЧЕСКАЯ ПРОКРУТКА (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Запускает автоматическую смену статей (каждые 15 секунд)
 */
function startArticleCarousel() {
    if (articleInterval) {
        clearInterval(articleInterval);
    }
    
    articleInterval = setInterval(() => {
        nextArticle();
    }, 15000);
}

/**
 * Сбрасывает таймер автопрокрутки
 */
function resetArticleTimer() {
    if (articleInterval) {
        clearInterval(articleInterval);
        startArticleCarousel();
    }
}

/**
 * Останавливает автопрокрутку (при наведении мыши)
 */
function stopArticleCarousel() {
    if (articleInterval) {
        clearInterval(articleInterval);
        articleInterval = null;
    }
}

// ========================
// ОБРАБОТЧИКИ СОБЫТИЙ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Настраивает события наведения мыши для паузы автопрокрутки
 */
function setupArticleHoverEvents() {
    const container = document.querySelector('.articles-carousel-container');
    if (!container) return;
    
    container.addEventListener('mouseenter', () => {
        stopArticleCarousel();
    });
    
    container.addEventListener('mouseleave', () => {
        if (!articleInterval) {
            startArticleCarousel();
        }
    });
}

/**
 * Настраивает кнопки навигации (влево/вправо)
 */
function setupArticleNavButtons() {
    const prevBtn = document.getElementById('prevArticleBtn');
    const nextBtn = document.getElementById('nextArticleBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            prevArticle();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            nextArticle();
        });
    }
}

/**
 * Обработчик изменения темы для статей
 * Перерисовывает стили при смене темы
 */
function handleArticleThemeChange() {
    const isDarkMode = document.body.classList.contains('dark');
    const cards = document.querySelectorAll('.article-card');
    
    cards.forEach(card => {
        if (isDarkMode) {
            card.style.backgroundColor = 'rgba(255,255,255,0.03)';
        } else {
            card.style.backgroundColor = 'rgba(102,126,234,0.05)';
        }
    });
}

/**
 * Наблюдатель за изменением темы
 */
function observeThemeChange() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                handleArticleThemeChange();
            }
        });
    });
    
    observer.observe(document.body, { attributes: true });
}

// ========================
// ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ (ПОЛНАЯ ВЕРСИЯ)
// ========================

/**
 * Инициализирует блок статей
 * Вызывается при загрузке страницы
 */
function initArticlesBlock() {
    loadArticles();
    setupArticleHoverEvents();
    setupArticleNavButtons();
    observeThemeChange();
    
    // Дополнительная инициализация для мобильных устройств
    if (window.innerWidth <= 768) {
        const container = document.querySelector('.articles-carousel-container');
        if (container) {
            container.style.touchAction = 'pan-y pinch-zoom';
        }
    }
    
    console.log('Блок статей инициализирован');
}

/**
 * Обновляет блок статей (при необходимости)
 */
function refreshArticlesBlock() {
    renderArticles();
    createArticleDots();
    updateCarouselPosition();
    updateActiveDot();
    handleArticleThemeChange();
}

// ========================
// ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ КАРУСЕЛИ СТАТЕЙ
// ========================

/**
 * Показывает уведомление для статей
 * @param {string} message - текст уведомления
 * @param {string} type - тип уведомления
 */
function showArticleNotification(message, type = 'info') {
    const oldNotification = document.getElementById('articleNotification');
    if (oldNotification) oldNotification.remove();
    
    const notification = document.createElement('div');
    notification.id = 'articleNotification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 12px;
        background: rgba(0,0,0,0.8);
        color: white;
        animation: fadeInUp 0.3s ease-out;
        pointer-events: none;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 2000);
}

/**
 * Получает количество статей
 * @returns {number} - количество статей
 */
function getArticlesCount() {
    return articlesData.length;
}

/**
 * Получает текущую статью
 * @returns {Object|null} - текущая статья
 */
function getCurrentArticle() {
    if (articlesData.length === 0) return null;
    return articlesData[currentArticleIndex];
}

/**
 * Переключает автопрокрутку
 * @param {boolean} enabled - включить/выключить
 */
function toggleAutoScroll(enabled) {
    if (enabled) {
        if (!articleInterval) startArticleCarousel();
    } else {
        stopArticleCarousel();
    }
}

// ========================
// ЭКСПОРТ ФУНКЦИЙ В WINDOW
// ========================

window.articlesData = articlesData;
window.currentArticleIndex = currentArticleIndex;
window.loadArticles = loadArticles;
window.getRandomArticleIcon = getRandomArticleIcon;
window.formatArticleDate = formatArticleDate;
window.renderArticles = renderArticles;
window.updateCarouselPosition = updateCarouselPosition;
window.createArticleDots = createArticleDots;
window.updateActiveDot = updateActiveDot;
window.goToArticle = goToArticle;
window.nextArticle = nextArticle;
window.prevArticle = prevArticle;
window.startArticleCarousel = startArticleCarousel;
window.resetArticleTimer = resetArticleTimer;
window.stopArticleCarousel = stopArticleCarousel;
window.setupArticleHoverEvents = setupArticleHoverEvents;
window.setupArticleNavButtons = setupArticleNavButtons;
window.handleArticleThemeChange = handleArticleThemeChange;
window.observeThemeChange = observeThemeChange;
window.initArticlesBlock = initArticlesBlock;
window.refreshArticlesBlock = refreshArticlesBlock;
window.showArticleNotification = showArticleNotification;
window.getArticlesCount = getArticlesCount;
window.getCurrentArticle = getCurrentArticle;
window.toggleAutoScroll = toggleAutoScroll;

console.log('✅ articlesModule.js: ПОЛНАЯ версия загружена');
