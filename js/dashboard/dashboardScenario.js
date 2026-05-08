// =======================
// dashboardScenario.js - СЦЕНАРНЫЙ АНАЛИЗ С ПОЛЗУНКАМИ
// =======================

let currentScenario = { revenueGrowth: 0, expenseGrowth: 0, ndsGrowth: 0, priceChange: 0, volumeChange: 0 };

function renderScenarioAnalysis(f, totalSalesQuantity, avgCheck, avgCost, costData) {
    const baseRevenue = f.totalRevenue;
    const baseExpenses = f.totalExpenses;
    const baseNDS = f.totalNDS;
    const baseProfit = f.profit;
    const baseProfitability = f.profitability;
    const baseAvgCheck = avgCheck;
    const baseAvgCost = avgCost;
    const baseSales = totalSalesQuantity;
    
    const scenarioRevenue = baseRevenue * (1 + currentScenario.revenueGrowth / 100);
    const scenarioExpenses = baseExpenses * (1 + currentScenario.expenseGrowth / 100);
    const scenarioNDS = baseNDS * (1 + currentScenario.ndsGrowth / 100);
    const scenarioNetRevenue = scenarioRevenue - Math.abs(scenarioNDS);
    const scenarioProfit = scenarioNetRevenue - scenarioExpenses;
    const scenarioProfitability = scenarioNetRevenue > 0 ? (scenarioProfit / scenarioNetRevenue) * 100 : 0;
    
    const scenarioAvgCheck = baseAvgCheck * (1 + currentScenario.priceChange / 100);
    const scenarioSales = baseSales * (1 + currentScenario.volumeChange / 100);
    
    function formatWithColor(value, baseValue, isCurrency = true, reverse = false) {
        const diff = value - baseValue;
        if (Math.abs(diff) < 0.01) return '';
        const isPositive = reverse ? diff < 0 : diff > 0;
        const sign = diff > 0 ? '+' : '';
        const formattedDiff = isCurrency ? formatCurrency(Math.abs(diff)) : `${sign}${diff.toFixed(1)}%`;
        const colorClass = isPositive ? 'positive' : 'negative';
        return `<span class="${colorClass}" style="font-size: 11px; margin-left: 8px;">(${sign}${formattedDiff})</span>`;
    }
    
    const slidersHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <div>
                <label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                    <span>📈 Изменение выручки</span>
                    <span id="revenueGrowthValue" style="font-weight: 600; color: #667eea;">${currentScenario.revenueGrowth >= 0 ? '+' : ''}${currentScenario.revenueGrowth}%</span>
                </label>
                <input type="range" id="revenueGrowthSlider" min="-30" max="50" step="1" value="${currentScenario.revenueGrowth}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #f56565, #48bb78); appearance: none; cursor: pointer;">
            </div>
            <div>
                <label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                    <span>📉 Изменение расходов</span>
                    <span id="expenseGrowthValue" style="font-weight: 600; color: #667eea;">${currentScenario.expenseGrowth >= 0 ? '+' : ''}${currentScenario.expenseGrowth}%</span>
                </label>
                <input type="range" id="expenseGrowthSlider" min="-30" max="50" step="1" value="${currentScenario.expenseGrowth}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #48bb78, #f56565); appearance: none; cursor: pointer;">
            </div>
            <div>
                <label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                    <span>💸 Изменение НДС</span>
                    <span id="ndsGrowthValue" style="font-weight: 600; color: #667eea;">${currentScenario.ndsGrowth >= 0 ? '+' : ''}${currentScenario.ndsGrowth}%</span>
                </label>
                <input type="range" id="ndsGrowthSlider" min="-30" max="30" step="1" value="${currentScenario.ndsGrowth}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #4299e1, #ed8936); appearance: none; cursor: pointer;">
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 16px;">
            <div>
                <label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                    <span>💰 Изменение цены</span>
                    <span id="priceChangeValue" style="font-weight: 600; color: #667eea;">${currentScenario.priceChange >= 0 ? '+' : ''}${currentScenario.priceChange}%</span>
                </label>
                <input type="range" id="priceChangeSlider" min="-20" max="30" step="1" value="${currentScenario.priceChange}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #667eea, #48bb78); appearance: none; cursor: pointer;">
            </div>
            <div>
                <label style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                    <span>📦 Изменение объёма продаж</span>
                    <span id="volumeChangeValue" style="font-weight: 600; color: #667eea;">${currentScenario.volumeChange >= 0 ? '+' : ''}${currentScenario.volumeChange}%</span>
                </label>
                <input type="range" id="volumeChangeSlider" min="-30" max="50" step="1" value="${currentScenario.volumeChange}" style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #48bb78, #4299e1); appearance: none; cursor: pointer;">
            </div>
            <div>
                <button id="resetScenarioBtn" style="padding: 8px 16px; background: #667eea; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 12px; width: 100%;">🔄 Сбросить все настройки</button>
            </div>
        </div>
    `;
    
    const resultsHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(102,126,234,0.2);">
            <div style="background: rgba(102,126,234,0.08); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary);">💰 Выручка (с НДС)</div>
                <div style="font-size: 20px; font-weight: 700;">${formatCurrency(scenarioRevenue)}</div>
                <div style="font-size: 11px;">${formatWithColor(scenarioRevenue, baseRevenue, true)}</div>
            </div>
            <div style="background: rgba(102,126,234,0.08); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary);">📉 Расходы</div>
                <div style="font-size: 20px; font-weight: 700;">${formatCurrency(scenarioExpenses)}</div>
                <div style="font-size: 11px;">${formatWithColor(scenarioExpenses, baseExpenses, true, true)}</div>
            </div>
            <div style="background: rgba(102,126,234,0.08); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary);">📈 Прибыль</div>
                <div style="font-size: 20px; font-weight: 700; ${scenarioProfit >= 0 ? 'color: #48bb78;' : 'color: #f56565;'}">${formatCurrency(scenarioProfit)}</div>
                <div style="font-size: 11px;">${formatWithColor(scenarioProfit, baseProfit, true)}</div>
            </div>
            <div style="background: rgba(102,126,234,0.08); border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary);">📊 Рентабельность</div>
                <div style="font-size: 20px; font-weight: 700; ${scenarioProfitability >= 0 ? 'color: #48bb78;' : 'color: #f56565;'}">${scenarioProfitability.toFixed(1)}%</div>
                <div style="font-size: 11px;">${formatWithColor(scenarioProfitability, baseProfitability, false)}</div>
            </div>
        </div>
    `;
    
    let recommendationText = '';
    if (scenarioProfit > baseProfit * 1.2) recommendationText = '🚀 Отличный сценарий! Прибыль выросла более чем на 20%. Рассмотрите возможность увеличения маркетингового бюджета.';
    else if (scenarioProfit > baseProfit) recommendationText = '📈 Положительная динамика. Продолжайте в том же духе, но следите за расходами.';
    else if (scenarioProfit > baseProfit * 0.9) recommendationText = '⚠️ Прибыль немного снизилась. Проанализируйте структуру расходов.';
    else recommendationText = '🔴 Критическое снижение прибыли! Требуется немедленная оптимизация затрат или повышение цен.';
    if (currentScenario.priceChange > 10 && currentScenario.volumeChange < -5) recommendationText += ' Внимание: повышение цены привело к падению продаж. Возможно, стоит пересмотреть ценовую политику.';
    if (currentScenario.expenseGrowth > 20) recommendationText += ' Расходы выросли слишком сильно. Ищите точки оптимизации.';
    
    const recommendationHtml = `<div style="margin-top: 16px; padding: 12px; background: rgba(102,126,234,0.1); border-radius: 12px;">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">💡 Рекомендация</div>
        <div style="font-size: 12px; line-height: 1.4;">${recommendationText}</div>
    </div>`;
    
    return `<div class="scenario-container">${slidersHtml}${resultsHtml}${recommendationHtml}</div>`;
}

function initScenarioHandlers(f, totalSalesQuantity, avgCheck, avgCost, costData) {
    const sliders = ['revenueGrowth', 'expenseGrowth', 'ndsGrowth', 'priceChange', 'volumeChange'];
    function updateScenarioDisplay() {
        const scenarioContainer = document.getElementById('scenarioAnalysisContainer');
        if (scenarioContainer) {
            scenarioContainer.innerHTML = renderScenarioAnalysis(f, totalSalesQuantity, avgCheck, avgCost, costData);
            initScenarioHandlers(f, totalSalesQuantity, avgCheck, avgCost, costData);
        }
    }
    sliders.forEach(sliderName => {
        const slider = document.getElementById(`${sliderName}Slider`);
        const valueSpan = document.getElementById(`${sliderName}Value`);
        if (slider) {
            slider.oninput = (e) => {
                const val = parseInt(e.target.value);
                currentScenario[sliderName] = val;
                if (valueSpan) valueSpan.innerHTML = val >= 0 ? `+${val}%` : `${val}%`;
                updateScenarioDisplay();
            };
        }
    });
    const resetBtn = document.getElementById('resetScenarioBtn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            sliders.forEach(sliderName => {
                currentScenario[sliderName] = 0;
                const slider = document.getElementById(`${sliderName}Slider`);
                const valueSpan = document.getElementById(`${sliderName}Value`);
                if (slider) slider.value = '0';
                if (valueSpan) valueSpan.innerHTML = '0%';
            });
            updateScenarioDisplay();
        };
    }
}

console.log('✅ dashboardScenario.js: загружен');
