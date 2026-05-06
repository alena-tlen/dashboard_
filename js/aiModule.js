// ========================
// aiModule.js - AI ФИНАНСОВЫЙ АНАЛИТИК (ПОЛНАЯ ВЕРСИЯ)
// ========================

// Глобальные переменные
let aiChatHistory = [];

// Доступные команды для быстрых вопросов
const QUICK_QUESTIONS = [
    { id: 'analyze', text: '📊 Анализ общих показателей', icon: '📊' },
    { id: 'bestChannel', text: '🏆 Самый прибыльный канал', icon: '🏆' },
    { id: 'expenses', text: '💰 Основные расходы', icon: '💰' },
    { id: 'recommend', text: '💡 Рекомендации', icon: '💡' },
    { id: 'profitability', text: '📈 Рентабельность по каналам', icon: '📈' },
    { id: 'trends', text: '📉 Тренды и прогноз', icon: '📉' },
    { id: 'cash', text: '🏦 Денежные средства', icon: '🏦' },
    { id: 'breakEven', text: '⚖️ Точка безубыточности', icon: '⚖️' },
    { id: 'nds', text: '💸 Анализ НДС', icon: '💸' },
    { id: 'cost', text: '🏭 Себестоимость', icon: '🏭' }
];

// ========================
// ГЕНЕРАЦИЯ ОТВЕТОВ AI (ПОЛНАЯ ВЕРСИЯ)
// ========================

function getAIResponse(question, data) {
    const q = question.toLowerCase();
    const f = calculateFinancials(data);
    
    // Получаем данные по каналам
    const channelProfitability = [];
    const allChannels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    
    for (const channel of allChannels) {
        const channelData = calculateFinancials(data, getChannelKey(channel));
        if (channelData.netRevenue > 0) {
            channelProfitability.push({
                name: channel,
                profit: channelData.profit,
                profitability: channelData.profitability,
                revenue: channelData.netRevenue
            });
        }
    }
    
    channelProfitability.sort((a, b) => b.profit - a.profit);
    
    // 1. АНАЛИЗ ОБЩИХ ПОКАЗАТЕЛЕЙ
    if (q.includes('анализ') || q === 'analyze' || q.includes('общий') || q.includes('показател')) {
        const statusEmoji = f.profit >= 0 ? '✅' : '🔴';
        const statusText = f.profit >= 0 ? 'прибыльна' : 'убыточна';
        
        // Рассчитываем дополнительные метрики
        const salesData = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return article.includes('продажи') && (article.includes('шт') || article.includes('штук'));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        
        const avgCheck = salesData > 0 ? f.netRevenue / salesData : 0;
        
        return `
📊 **ФИНАНСОВЫЙ АНАЛИЗ**

${statusEmoji} Компания ${statusText}
💰 Выручка (с НДС): ${formatCurrency(f.totalRevenue)}
📉 НДС: ${formatCurrency(f.totalNDS)}
📊 Чистая выручка: ${formatCurrency(f.netRevenue)}
💸 Расходы: ${formatCurrency(f.totalExpenses)}
📈 Прибыль: ${formatCurrency(f.profit)}
📊 Рентабельность: ${f.profitability.toFixed(1)}%
📦 Продажи: ${new Intl.NumberFormat('ru-RU').format(salesData)} шт
💳 Средний чек: ${formatCurrency(avgCheck)}

${f.profit < 0 ? '⚠️ **Внимание!** Компания убыточна. Рекомендуется срочно оптимизировать расходы.' : f.profitability < 10 ? '⚠️ **Низкая рентабельность!** Пересмотрите ценообразование.' : '✅ **Хорошие показатели.** Продолжайте в том же духе.'}
        `;
    }
    
    // 2. САМЫЙ ПРИБЫЛЬНЫЙ КАНАЛ
    if (q.includes('прибыльн') || q === 'bestChannel' || q.includes('лучш') || q.includes('канал')) {
        if (channelProfitability.length === 0) {
            return '❌ Нет данных по каналам для анализа.';
        }
        
        const best = channelProfitability[0];
        const second = channelProfitability[1];
        
        let analysis = '';
        if (best.profit > 0) {
            analysis = `🏆 **${best.name}** - самый прибыльный канал\n`;
            analysis += `   Прибыль: ${formatCurrency(best.profit)}\n`;
            analysis += `   Рентабельность: ${best.profitability.toFixed(1)}%\n`;
            analysis += `   Выручка: ${formatCurrency(best.revenue)}\n`;
            
            if (second) {
                const gap = ((best.profit - second.profit) / Math.abs(second.profit)) * 100;
                analysis += `   Опережает ${second.name} на ${gap.toFixed(0)}%\n`;
            }
            
            analysis += `\n💡 **Рекомендация:** Увеличьте маркетинговый бюджет для ${best.name}, масштабируйте успех.`;
        } else {
            analysis = `⚠️ Все каналы убыточны. Самый лучший из худших: **${best.name}**\n`;
            analysis += `   Убыток: ${formatCurrency(Math.abs(best.profit))}\n`;
            analysis += `\n💡 **Рекомендация:** Срочно анализируйте структуру расходов по каждому каналу.`;
        }
        
        return analysis;
    }
    
    // 3. ОСНОВНЫЕ РАСХОДЫ
    if (q.includes('расход') || q === 'expenses' || q.includes('затрат') || q.includes('трат')) {
        const expensesByCategory = {};
        
        data.forEach(row => {
            if (row.тип === 'Расход') {
                const category = row.подканал || row.статья || 'Прочие';
                const amount = Math.abs(row.сумма);
                expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
            }
        });
        
        const sortedExpenses = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const totalExpenses = f.totalExpenses;
        
        let expensesText = `💰 **АНАЛИЗ РАСХОДОВ**\n\n`;
        expensesText += `Общая сумма расходов: ${formatCurrency(totalExpenses)}\n`;
        expensesText += `Доля в выручке: ${((totalExpenses / f.netRevenue) * 100).toFixed(1)}%\n\n`;
        expensesText += `**Топ-5 категорий расходов:**\n`;
        
        sortedExpenses.forEach(([cat, amount], idx) => {
            const percent = (amount / totalExpenses) * 100;
            expensesText += `${idx + 1}. ${cat}: ${formatCurrency(amount)} (${percent.toFixed(1)}%)\n`;
        });
        
        if (sortedExpenses.length > 0) {
            expensesText += `\n💡 **Рекомендация:** Оптимизируйте "${sortedExpenses[0][0]}" - это ${((sortedExpenses[0][1] / totalExpenses) * 100).toFixed(0)}% всех расходов.`;
        }
        
        return expensesText;
    }
    
    // 4. РЕНТАБЕЛЬНОСТЬ ПО КАНАЛАМ
    if (q.includes('рентабельн') || q === 'profitability' || q.includes('маржинальн')) {
        if (channelProfitability.length === 0) {
            return '❌ Нет данных по каналам для анализа.';
        }
        
        let text = `📈 **РЕНТАБЕЛЬНОСТЬ ПО КАНАЛАМ**\n\n`;
        
        channelProfitability.forEach(ch => {
            const emoji = ch.profitability >= 20 ? '🟢' : (ch.profitability >= 10 ? '🟡' : '🔴');
            text += `${emoji} **${ch.name}**: ${ch.profitability.toFixed(1)}% (прибыль: ${formatCurrency(ch.profit)})\n`;
        });
        
        const avgProfitability = channelProfitability.reduce((sum, ch) => sum + ch.profitability, 0) / channelProfitability.length;
        text += `\n📊 **Средняя рентабельность**: ${avgProfitability.toFixed(1)}%\n`;
        
        if (f.profitability < 10) {
            text += `\n⚠️ **Критически низкая рентабельность!** Рекомендуется:\n`;
            text += `   • Пересмотреть ценообразование\n`;
            text += `   • Снизить себестоимость\n`;
            text += `   • Оптимизировать логистику\n`;
        } else if (f.profitability < 20) {
            text += `\n📈 Рентабельность ниже целевых 20%. Есть потенциал для роста.`;
        } else {
            text += `\n✅ Отличная рентабельность! Масштабируйте успешные каналы.`;
        }
        
        return text;
    }
    
    // 5. ТРЕНДЫ И ПРОГНОЗ
    if (q.includes('тренд') || q === 'trends' || q.includes('прогноз') || q.includes('динамик')) {
        const monthlyProfit = {};
        
        data.forEach(row => {
            if (row.месяц && row.год && (row.тип === 'Доход' || row.тип === 'Расход' || row.статья === 'НДС')) {
                const key = `${row.год}-${row.месяц}`;
                if (!monthlyProfit[key]) {
                    monthlyProfit[key] = { revenue: 0, ndsOut: 0, expenses: 0, month: row.месяц, year: row.год };
                }
                if (row.тип === 'Доход') monthlyProfit[key].revenue += row.сумма;
                if (row.статья === 'НДС' && row.подканал === 'НДС исходящий') monthlyProfit[key].ndsOut += row.сумма;
                if (row.тип === 'Расход') monthlyProfit[key].expenses += Math.abs(row.сумма);
            }
        });
        
        const sortedMonths = Object.keys(monthlyProfit).sort();
        const profits = sortedMonths.map(key => {
            const m = monthlyProfit[key];
            const netRevenue = m.revenue - m.ndsOut;
            return netRevenue - m.expenses;
        });
        
        if (profits.length < 2) {
            return '📊 Недостаточно данных для анализа трендов (нужно минимум 2 месяца).';
        }
        
        const firstProfit = profits[0];
        const lastProfit = profits[profits.length - 1];
        const trend = ((lastProfit - firstProfit) / Math.abs(firstProfit)) * 100;
        const trendText = trend >= 0 ? `↑ +${trend.toFixed(1)}%` : `↓ ${trend.toFixed(1)}%`;
        const trendEmoji = trend >= 0 ? '📈' : '📉';
        
        let text = `${trendEmoji} **АНАЛИЗ ТРЕНДОВ**\n\n`;
        text += `Изменение прибыли за период: ${trendText}\n`;
        text += `Начальная прибыль: ${formatCurrency(firstProfit)}\n`;
        text += `Текущая прибыль: ${formatCurrency(lastProfit)}\n\n`;
        
        if (trend > 20) {
            text += `🚀 **Отличная динамика!** Прибыль выросла более чем на 20%.\n💡 Рекомендация: Увеличьте маркетинговый бюджет для ускорения роста.`;
        } else if (trend > 0) {
            text += `📈 **Положительная динамика.** Прибыль растет.\n💡 Рекомендация: Продолжайте в том же духе, следите за расходами.`;
        } else if (trend > -20) {
            text += `⚠️ **Небольшое снижение.** Прибыль уменьшилась.\n💡 Рекомендация: Проанализируйте структуру расходов.`;
        } else {
            text += `🔴 **Критическое падение!** Прибыль снизилась более чем на 20%.\n💡 Рекомендация: Срочный анализ причин и оптимизация затрат!`;
        }
        
        return text;
    }
    
    // 6. ДЕНЕЖНЫЕ СРЕДСТВА
    if (q.includes('денежн') || q === 'cash' || q.includes('остат') || q.includes('счет') || q.includes('баланс')) {
        const { accountBalances, totalBalance, periodText } = calculateCashData();
        
        if (accountBalances.length === 0) {
            return '💰 Нет данных по банковским счетам.';
        }
        
        let text = `🏦 **ДЕНЕЖНЫЕ СРЕДСТВА**\n\n`;
        text += `💰 Общий остаток (RUB): ${formatCurrency(totalBalance)}\n`;
        text += `📅 ${periodText}\n\n`;
        text += `**Остатки по счетам:**\n`;
        
        accountBalances.slice(0, 5).forEach(acc => {
            const balanceColor = acc.balance >= 0 ? '🟢' : '🔴';
            text += `${balanceColor} ${acc.name}: ${formatCurrencyWithCurrency(acc.balance, acc.currency)}\n`;
        });
        
        if (accountBalances.length > 5) {
            text += `\n... и ещё ${accountBalances.length - 5} ${declension(accountBalances.length - 5, 'счет', 'счета', 'счетов')}`;
        }
        
        if (totalBalance < 500000 && totalBalance > 0) {
            text += `\n\n⚠️ **Внимание!** Остаток ниже 500 000 ₽. Рекомендуется создать резервный фонд.`;
        } else if (totalBalance < 100000 && totalBalance > 0) {
            text += `\n\n🔴 **Критический остаток!** Риск кассового разрыва. Срочно примите меры.`;
        }
        
        return text;
    }
    
    // 7. ТОЧКА БЕЗУБЫТОЧНОСТИ
    if (q.includes('безубыточн') || q === 'breakEven' || q.includes('окупаемост')) {
        const salesQuantity = f.totalSalesQuantity;
        const analysis = generateBreakEvenAnalysis(data, f, salesQuantity);
        
        if (!analysis) {
            return '⚖️ Недостаточно данных для анализа точки безубыточности.';
        }
        
        let text = `⚖️ **ТОЧКА БЕЗУБЫТОЧНОСТИ**\n\n`;
        text += `📊 Точка безубыточности (шт): ${new Intl.NumberFormat('ru-RU').format(analysis.breakEvenUnits)} шт\n`;
        text += `💰 Точка безубыточности (₽): ${formatCurrency(analysis.breakEvenRevenue)}\n`;
        text += `📈 Текущая выручка: ${formatCurrency(analysis.totalRevenue)}\n`;
        text += `🛡️ Запас финансовой прочности: ${analysis.safetyMargin.toFixed(1)}% (${formatCurrency(analysis.safetyMarginAbsolute)})\n`;
        text += `⚡ Операционный рычаг: ${analysis.operatingLeverage.toFixed(2)}x\n\n`;
        
        if (analysis.safetyMargin < 10) {
            text += `🔴 **Критический запас прочности!** Срочно увеличьте продажи или сократите расходы.`;
        } else if (analysis.safetyMargin < 30) {
            text += `🟡 **Запас прочности ниже нормы.** Рекомендуется оптимизация затрат.`;
        } else {
            text += `🟢 **Хороший запас прочности.** Бизнес устойчив к падению продаж.`;
        }
        
        return text;
    }
    
    // 8. НДС АНАЛИЗ
    if (q.includes('ндс') || q === 'nds' || q.includes('налог')) {
        const ndsPercent = f.totalRevenue > 0 ? (Math.abs(f.totalNDS) / f.totalRevenue) * 100 : 0;
        
        let status = '';
        let recommendation = '';
        
        if (ndsPercent > 20) {
            status = '🔴 Критично высокая';
            recommendation = 'Срочно оптимизируйте налоги! Увеличьте долю входящего НДС.';
        } else if (ndsPercent > 15) {
            status = '🟠 Высокая';
            recommendation = 'Рассмотрите возможность работы с поставщиками на ОСНО.';
        } else if (ndsPercent > 10) {
            status = '🟡 Средняя';
            recommendation = 'Налоговая нагрузка в норме, но есть потенциал для оптимизации.';
        } else if (ndsPercent > 5) {
            status = '🟢 Низкая';
            recommendation = 'Хороший показатель! Поддерживайте текущий уровень.';
        } else {
            status = '✅ Минимальная';
            recommendation = 'Отличный результат! Вы эффективно управляете налоговой нагрузкой.';
        }
        
        return `
💸 **АНАЛИЗ НДС**

💰 НДС к уплате/возмещению: ${formatCurrency(Math.abs(f.totalNDS))}
📊 НДС % от выручки: ${ndsPercent.toFixed(1)}%
📈 Статус: ${status}

💡 **Рекомендация:** ${recommendation}
        `;
    }
    
    // 9. СЕБЕСТОИМОСТЬ
    if (q.includes('себестоим') || q === 'cost' || q.includes('затрат на товар')) {
        const costData = f.costData;
        const avgCost = f.avgCost;
        const salesQuantity = f.totalSalesQuantity;
        
        let text = `🏭 **СЕБЕСТОИМОСТЬ**\n\n`;
        text += `💰 Общая себестоимость: ${formatCurrency(costData)}\n`;
        text += `📊 Себестоимость 1 шт: ${formatCurrency(avgCost)}\n`;
        text += `📦 Продано штук: ${new Intl.NumberFormat('ru-RU').format(salesQuantity)}\n`;
        text += `📈 Доля себестоимости в выручке: ${f.netRevenue > 0 ? ((costData / f.netRevenue) * 100).toFixed(1) : '0'}%\n\n`;
        
        if (avgCost > 0 && f.avgCheck > 0) {
            const margin = ((f.avgCheck - avgCost) / f.avgCheck) * 100;
            text += `📊 Маржинальность после себестоимости: ${margin.toFixed(1)}%\n`;
            
            if (margin < 20) {
                text += `\n⚠️ **Низкая маржинальность!** Рассмотрите возможность снижения себестоимости или повышения цен.`;
            } else if (margin < 40) {
                text += `\n📈 **Средняя маржинальность.** Есть потенциал для увеличения.`;
            } else {
                text += `\n✅ **Высокая маржинальность.** Отличный показатель!`;
            }
        }
        
        return text;
    }
    
    // 10. РЕКОМЕНДАЦИИ
    if (q.includes('рекоменд') || q === 'recommend' || q.includes('совет') || q.includes('что делать')) {
        let recommendations = `💡 **РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ**\n\n`;
        
        if (f.profit < 0) {
            recommendations += `🔴 **Критично:** Компания убыточна!\n`;
            recommendations += `   → Срочно оптимизируйте расходы\n`;
            recommendations += `   → Пересмотрите ценообразование\n`;
            recommendations += `   → Проведите анализ каждого канала\n\n`;
        } else if (f.profitability < 10) {
            recommendations += `⚠️ **Низкая рентабельность** (<10%)\n`;
            recommendations += `   → Увеличьте средний чек\n`;
            recommendations += `   → Снизьте себестоимость товаров\n`;
            recommendations += `   → Оптимизируйте логистику\n\n`;
        } else if (f.profitability < 20) {
            recommendations += `📈 **Рентабельность можно улучшить**\n`;
            recommendations += `   → Работайте над апселлингом\n`;
            recommendations += `   → Автоматизируйте рутинные операции\n\n`;
        } else {
            recommendations += `✅ **Отличная рентабельность!**\n`;
            recommendations += `   → Масштабируйте успешные каналы\n`;
            recommendations += `   → Увеличьте маркетинговый бюджет\n\n`;
        }
        
        const expenseToRevenue = (f.totalExpenses / f.netRevenue) * 100;
        if (expenseToRevenue > 70) {
            recommendations += `💰 **Высокая доля расходов** (${expenseToRevenue.toFixed(0)}% от выручки)\n`;
            recommendations += `   → Проведите аудит затрат\n`;
            recommendations += `   → Ищите альтернативных поставщиков\n`;
            recommendations += `   → Пересмотрите договоры с подрядчиками\n\n`;
        } else if (expenseToRevenue < 40) {
            recommendations += `🎯 **Низкая доля расходов** - вы эффективны!\n`;
            recommendations += `   → Инвестируйте в развитие\n`;
            recommendations += `   → Увеличьте рекламный бюджет\n\n`;
        }
        
        let sales = 0;
        data.forEach(d => {
            const article = d.статья?.toLowerCase() || '';
            if (article.includes('продажи') && (article.includes('шт') || article.includes('штук'))) {
                sales += Math.abs(d.сумма || 0);
            }
        });
        const avgCheck = sales > 0 ? f.netRevenue / sales : 0;
        
        if (avgCheck < 1000 && avgCheck > 0) {
            recommendations += `💳 **Низкий средний чек** (${formatCurrency(avgCheck)})\n`;
            recommendations += `   → Внедрите кросс-продажи\n`;
            recommendations += `   → Предлагайте наборы товаров\n`;
            recommendations += `   → Используйте апселлинг при оформлении\n\n`;
        } else if (avgCheck > 5000) {
            recommendations += `💎 **Высокий средний чек** - отличный показатель!\n`;
            recommendations += `   → Удерживайте качество обслуживания\n`;
            recommendations += `   → Работайте с лояльностью клиентов\n\n`;
        }
        
        recommendations += `---\n`;
        recommendations += `🔍 **Для детального анализа используйте кнопки быстрых вопросов выше.`;
        
        return recommendations;
    }
    
    // 11. ПОМОЩЬ / НЕИЗВЕСТНЫЙ ЗАПРОС
    return `
🤖 **Я AI финансовый аналитик**

Я могу ответить на вопросы о:
• 📊 Общих показателях компании
• 🏆 Прибыльности по каналам
• 💰 Структуре расходов
• 📈 Рентабельности и маржинальности
• 📉 Трендах и прогнозах
• 🏦 Денежных средствах на счетах
• ⚖️ Точке безубыточности
• 💸 НДС и налогах
• 🏭 Себестоимости товаров
• 💡 Рекомендациях по улучшению

**Примеры вопросов:**
"Сделай анализ общих показателей"
"Какой канал самый прибыльный?"
"Какие основные расходы?"
"Дай рекомендации по улучшению"
"Анализ НДС"
"Точка безубыточности"

Используйте кнопки быстрых вопросов выше для получения ответов.
    `;
}

function getChannelKey(channelName) {
    for (const [key, value] of Object.entries(CHANNEL_MAPPING)) {
        if (value.displayName === channelName) {
            return key;
        }
    }
    return null;
}

// ========================
// УПРАВЛЕНИЕ ЧАТОМ (ПОЛНАЯ ВЕРСИЯ)
// ========================

function addAIMessage(text, isUser) {
    const aiChatMessages = document.getElementById('aiChatMessages');
    if (!aiChatMessages) return;
    
    const div = document.createElement('div');
    div.className = `ai-message ${isUser ? 'user' : 'assistant'}`;
    div.style.whiteSpace = 'pre-line';
    div.innerHTML = text.replace(/\n/g, '<br>');
    
    aiChatMessages.appendChild(div);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    
    while (aiChatMessages.children.length > 50) {
        aiChatMessages.removeChild(aiChatMessages.firstChild);
    }
}

function clearAIChat() {
    const aiChatMessages = document.getElementById('aiChatMessages');
    if (aiChatMessages) {
        aiChatMessages.innerHTML = `
            <div class="ai-message assistant">
                👋 Здравствуйте! Я AI финансовый аналитик. Задайте вопрос о данных или используйте кнопки быстрых вопросов.
            </div>
        `;
    }
}

// ========================
// ИНИЦИАЛИЗАЦИЯ AI АССИСТЕНТА (ПОЛНАЯ ВЕРСИЯ)
// ========================

function initAIAssistant() {
    const aiSendBtn = document.getElementById('aiSendBtn');
    const aiInput = document.getElementById('aiInput');
    
    if (!aiSendBtn || !aiInput) return;
    
    aiSendBtn.onclick = () => {
        const question = aiInput.value.trim();
        if (!question) return;
        
        addAIMessage(question, true);
        aiInput.value = '';
        
        setTimeout(() => {
            const answer = getAIResponse(question, currentData);
            addAIMessage(answer, false);
        }, 300);
    };
    
    aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            aiSendBtn.click();
        }
    });
    
    setupQuickQuestions();
}

function setupQuickQuestions() {
    const suggestionsContainer = document.getElementById('aiSuggestions');
    if (!suggestionsContainer) return;
    
    suggestionsContainer.innerHTML = QUICK_QUESTIONS.map(q => `
        <span class="ai-suggestion" data-question="${q.id}">
            ${q.icon || ''} ${q.text}
        </span>
    `).join('');
    
    document.querySelectorAll('.ai-suggestion').forEach(suggestion => {
        suggestion.onclick = () => {
            const questionId = suggestion.dataset.question;
            const question = QUICK_QUESTIONS.find(q => q.id === questionId);
            
            if (question) {
                const answer = getAIResponse(question.id, currentData);
                addAIMessage(question.text, true);
                addAIMessage(answer, false);
            }
        };
    });
}

function updateDashboardAIInsights(f, revenueChannelsList, expenseChannelsList, totalSalesQuantity, avgCheck, avgCost) {
    const aiInsightsDiv = document.getElementById('aiInsights');
    if (!aiInsightsDiv) return;
    
    const expensesText = expenseChannelsList.map(channel => {
        const percent = (channel.total / f.totalExpenses) * 100;
        return `• ${channel.name}: ${formatCurrency(channel.total)} (${percent.toFixed(1)}%)`;
    }).join('\n');
    
    const revenueText = revenueChannelsList.map(channel => {
        const percent = (channel.total / f.totalRevenue) * 100;
        return `• ${channel.name}: ${formatCurrency(channel.total)} (${percent.toFixed(1)}%)`;
    }).join('\n');
    
    let statusMessage = '';
    if (f.profit < 0) {
        statusMessage = '⚠️ **Внимание!** Компания убыточна. Рекомендуется срочная оптимизация расходов.';
    } else if (f.profitability < 10) {
        statusMessage = '📉 Низкая рентабельность. Пересмотрите ценообразование и структуру затрат.';
    } else if (f.profitability < 20) {
        statusMessage = '📈 Хорошая рентабельность. Есть потенциал для дальнейшего роста.';
    } else {
        statusMessage = '🎯 Отличная рентабельность! Поддерживайте текущую эффективность.';
    }
    
    aiInsightsDiv.innerHTML = `
        <div class="ai-header">
            <div class="ai-icon" style="background: #48bb78;">🤖</div>
            <div>
                <div class="ai-title">AI Аналитика</div>
                <div class="ai-subtitle">Автоматический анализ ваших данных</div>
            </div>
        </div>
        
        <div class="ai-message assistant" style="margin-top: 12px;">${statusMessage}</div>
        
        <div class="ai-message assistant">
            <strong>📊 КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ</strong><br><br>
            💰 Выручка (с НДС): ${formatCurrency(f.totalRevenue)}<br>
            📉 НДС: ${formatCurrency(f.totalNDS)}<br>
            📊 Чистая выручка: ${formatCurrency(f.netRevenue)}<br>
            💸 Расходы: ${formatCurrency(f.totalExpenses)}<br>
            📈 Прибыль: ${formatCurrency(f.profit)}<br>
            📊 Рентабельность: ${f.profitability.toFixed(1)}%<br>
            📦 Продажи: ${new Intl.NumberFormat('ru-RU').format(totalSalesQuantity)} шт<br>
            💳 Средний чек: ${formatCurrency(avgCheck)}<br>
            🏭 Себестоимость 1 шт: ${formatCurrency(avgCost)}
        </div>
        
        <div class="ai-message assistant">
            <strong>💰 СТРУКТУРА ДОХОДОВ ПО КАНАЛАМ</strong><br><br>
            ${revenueText}
        </div>
        
        <div class="ai-message assistant">
            <strong>📉 СТРУКТУРА РАСХОДОВ ПО КАНАЛАМ</strong><br><br>
            ${expensesText}
        </div>
        
        <div style="margin-top: 12px; text-align: center;">
            <button id="askAIBtn" class="btn btn-info">💬 Задать вопрос AI</button>
        </div>
    `;
    
    document.getElementById('askAIBtn')?.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.nav-subitem').forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-page="ai"]')?.classList.add('active');
        document.querySelectorAll('.page-content').forEach(c => c.classList.remove('active'));
        document.getElementById('page-ai')?.classList.add('active');
        clearAIChat();
    });
}

// ========================
// ЭКСПОРТ ФУНКЦИЙ В WINDOW
// ========================

window.aiChatHistory = aiChatHistory;
window.QUICK_QUESTIONS = QUICK_QUESTIONS;
window.getAIResponse = getAIResponse;
window.getChannelKey = getChannelKey;
window.addAIMessage = addAIMessage;
window.clearAIChat = clearAIChat;
window.initAIAssistant = initAIAssistant;
window.setupQuickQuestions = setupQuickQuestions;
window.updateDashboardAIInsights = updateDashboardAIInsights;

console.log('✅ aiModule.js: ПОЛНАЯ версия загружена');
