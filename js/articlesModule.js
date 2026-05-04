// ========================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================

let articlesData = [];           // Массив статей
let currentArticleIndex = 0;     // Текущая отображаемая статья
let articleInterval = null;      // Таймер автопрокрутки
let isArticleAnimating = false;   // Флаг для предотвращения двойной анимации

// URL для загрузки статей (файл должен лежать в корне проекта)
const ARTICLES_FILE_PATH = 'articles.json';

// ========================
// ЗАГРУЗКА СТАТЕЙ ИЗ JSON ФАЙЛА
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
        
        // Отрисовываем статьи
        renderArticles();
        
        // Запускаем автопрокрутку
        startArticleCarousel();
        
        // Создаем точки навигации
        createArticleDots();
        
    } catch (error) {
        console.error('Ошибка загрузки статей:', error);
        
        // Статьи по умолчанию (если файл не найден)
        articlesData = [
            {
                title: "Вы управляете ассортиментом или складом случайностей?",
                description: "Глубокая товарная и ценовая аналитика на маркетплейсах",
                link: "https://dzen.ru/a/aUqz1yENXTiPF2Dt",
                imageUrl: "",
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
            }
        ];
        
        renderArticles();
        startArticleCarousel();
        createArticleDots();
    }
}

// ========================
// ОТРИСОВКА СТАТЕЙ
// ========================

/**
 * Отрисовывает все статьи в карусели
 * Формат: картинка сверху, контент снизу
 */
function renderArticles() {
    const carousel = document.getElementById('articlesCarousel');
    if (!carousel) return;
    
    // Генерируем HTML для каждой статьи
    carousel.innerHTML = articlesData.map((article, index) => `
        <div class="article-card" data-index="${index}">
            <div class="article-image-container">
                ${article.imageUrl ? 
                    `<img src="${article.imageUrl}" class="article-image" alt="${article.title}" loading="lazy">` : 
                    `<div class="article-image-placeholder">${getRandomArticleIcon()}</div>`
                }
            </div>
            <div class="article-content">
                <div class="article-source">${article.source || 'Полезная статья'}</div>
                <div class="article-title">${article.title}</div>
                <div class="article-description">${article.description || 'Читайте подробнее в источнике'}</div>
                <div class="article-link">
                    Читать далее <span>→</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Добавляем обработчики кликов на карточки
    document.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Предотвращаем всплытие, чтобы не сработала анимация
            e.stopPropagation();
            
            const index = parseInt(card.dataset.index);
            if (!isNaN(index) && articlesData[index] && articlesData[index].link) {
                // Открываем ссылку в новой вкладке
                window.open(articlesData[index].link, '_blank');
            }
        });
    });
    
    // Обновляем позицию карусели
    updateCarouselPosition();
}

/**
 * Возвращает случайную иконку для статьи без картинки
 * @returns {string} - эмодзи
 */
function getRandomArticleIcon() {
    const icons = ['📄', '📊', '💰', '📈', '📉', '🏦', '💡', '🔍', '📚', '🎯'];
    return icons[Math.floor(Math.random() * icons.length)];
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
// ТОЧКИ НАВИГАЦИИ
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
    
    // Добавляем обработчики для точек
    document.querySelectorAll('.articles-dot').forEach(dot => {
        dot.addEventListener('click', () => {
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
// НАВИГАЦИЯ ПО КАРУСЕЛИ
// ========================

/**
 * Переход к определенной статье
 * @param {number} index - индекс статьи
 */
function goToArticle(index) {
    // Защита от множественных анимаций
    if (isArticleAnimating) return;
    
    // Проверка границ
    if (index < 0 || index >= articlesData.length) return;
    
    isArticleAnimating = true;
    currentArticleIndex = index;
    
    // Анимируем переход
    updateCarouselPosition();
    updateActiveDot();
    
    // Сбрасываем таймер автопрокрутки
    resetArticleTimer();
    
    // Снимаем флаг анимации через 500ms
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
        newIndex = 0;  // Зацикливаем
    }
    goToArticle(newIndex);
}

/**
 * Предыдущая статья
 */
function prevArticle() {
    let newIndex = currentArticleIndex - 1;
    if (newIndex < 0) {
        newIndex = articlesData.length - 1;  // Зацикливаем
    }
    goToArticle(newIndex);
}

// ========================
// АВТОМАТИЧЕСКАЯ ПРОКРУТКА
// ========================

/**
 * Запускает автоматическую смену статей (каждые 15 секунд)
 */
function startArticleCarousel() {
    // Останавливаем старый интервал, если есть
    if (articleInterval) {
        clearInterval(articleInterval);
    }
    
    // Запускаем новый
    articleInterval = setInterval(() => {
        nextArticle();
    }, 15000);  // 15 секунд
}

/**
 * Сбрасывает таймер автопрокрутки
 * (используется при ручном переключении)
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
// ОБРАБОТЧИКИ СОБЫТИЙ
// ========================

/**
 * Настраивает события наведения мыши для паузы автопрокрутки
 */
function setupArticleHoverEvents() {
    const container = document.querySelector('.articles-carousel-container');
    if (!container) return;
    
    // Пауза при наведении
    container.addEventListener('mouseenter', () => {
        stopArticleCarousel();
    });
    
    // Возобновление при уходе мыши
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

// ========================
// ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ
// ========================

/**
 * Инициализирует блок статей
 * Вызывается при загрузке страницы
 */
function initArticlesBlock() {
    // Загружаем статьи из JSON
    loadArticles();
    
    // Настраиваем события наведения
    setupArticleHoverEvents();
    
    // Настраиваем кнопки навигации
    setupArticleNavButtons();
    
    console.log('Блок статей инициализирован');
}

/**
 * Обновляет блок статей (при необходимости)
 * Можно вызвать после смены темы, языка и т.д.
 */
function refreshArticlesBlock() {
    // Обновляем отображение с учетом текущей темы
    renderArticles();
    createArticleDots();
    updateCarouselPosition();
    updateActiveDot();
}
