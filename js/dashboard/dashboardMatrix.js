// =======================
// dashboardMatrix.js - МАТРИЦА 4 КВАДРАНТОВ
// =======================

function renderQuadrantMatrix(data, f) {
    const channels = ['Wildberries', 'Ozon', 'Детский мир', 'Lamoda', 'Оптовики', 'Фулфилмент'];
    const channelData = [];
    let totalRevenue = 0, totalSales = 0;
    
    channels.forEach(channel => {
        const revenue = data.filter(d => d.канал === channel && d.тип === 'Доход').reduce((sum, d) => sum + d.сумма, 0);
        const ndsOut = data.filter(d => d.канал === channel && d.статья === 'НДС' && d.подканал === 'НДС исходящий').reduce((sum, d) => sum + d.сумма, 0);
        const netRevenue = revenue - ndsOut;
        const expenses = data.filter(d => d.канал === channel && d.тип === 'Расход').reduce((sum, d) => sum + Math.abs(d.сумма), 0);
        const profit = netRevenue - expenses;
        const margin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
        
        let sales = data.filter(d => {
            const article = d.статья?.toLowerCase() || '';
            return d.канал === channel && (article.includes('продажи') && (article.includes('шт') || article.includes('штук')));
        }).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const salesRef = data.filter(d => d.канал === channel && d.тип === 'Справочная' && (d.статья?.toLowerCase().includes('продажи') || d.подканал?.toLowerCase().includes('продажи'))).reduce((sum, d) => sum + Math.abs(d.сумма || 0), 0);
        const totalSalesChannel = sales + salesRef;
        
        if (netRevenue > 0) {
            channelData.push({
                name: channel, margin: margin, sales: totalSalesChannel, netRevenue: netRevenue, profit: profit,
                icon: channel === 'Wildberries' ? '🛍️' : channel === 'Ozon' ? '📦' : channel === 'Детский мир' ? '🧸' : channel === 'Lamoda' ? '👗' : channel === 'Оптовики' ? '📊' : '📁'
            });
            totalRevenue += netRevenue;
            totalSales += totalSalesChannel;
        }
    });
    
    if (channelData.length === 0) return '<div style="text-align: center; padding: 40px;">⚠️ Недостаточно данных для построения матрицы</div>';
    
    const margins = channelData.map(c => c.margin).sort((a, b) => a - b);
    const salesVolumes = channelData.map(c => c.sales).sort((a, b) => a - b);
    const medianMargin = margins[Math.floor(margins.length / 2)];
    const medianSales = salesVolumes[Math.floor(salesVolumes.length / 2)];
    
    channelData.forEach(channel => {
        if (channel.margin >= medianMargin && channel.sales >= medianSales) channel.quadrant = 'golden';
        else if (channel.margin >= medianMargin && channel.sales < medianSales) channel.quadrant = 'premium';
        else if (channel.margin < medianMargin && channel.sales >= medianSales) channel.quadrant = 'workhorse';
        else channel.quadrant = 'problem';
    });
    
    const maxRevenue = Math.max(...channelData.map(c => c.netRevenue));
    
    let matrixHtml = `<div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
            <div style="text-align: center; padding: 8px; background: rgba(102,126,234,0.1); border-radius: 8px;"><span style="font-weight: 600;">📈 Высокая маржинальность</span></div>
            <div style="text-align: center; padding: 8px; background: rgba(102,126,234,0.1); border-radius: 8px;"><span style="font-weight: 600;">📉 Низкая маржинальность</span></div>
        </div>
        <div style="position: relative; min-height: 400px; background: linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%); border-radius: 16px; padding: 20px;">
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(102,126,234,0.3); transform: translateY(-50%);"></div>
            <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(102,126,234,0.3); transform: translateX(-50%);"></div>
            <div style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #667eea; font-weight: 500;">📊 Объем продаж (шт) →</div>
            <div style="position: absolute; left: -25px; top: 50%; transform: translateY(-50%) rotate(-90deg); font-size: 12px; color: #667eea; font-weight: 500;">💰 Маржинальность (%) ↑</div>
            <div style="position: relative; height: 360px;">${channelData.map(channel => {
                let xPercent = 50, yPercent = 50;
                if (channel.sales > 0 && medianSales > 0) {
                    const maxSales = Math.max(...channelData.map(c => c.sales));
                    const minSales = Math.min(...channelData.map(c => c.sales));
                    if (maxSales > minSales) xPercent = ((channel.sales - minSales) / (maxSales - minSales)) * 80 + 10;
                }
                if (channel.margin > 0) {
                    const maxMargin = Math.max(...channelData.map(c => c.margin));
                    const minMargin = Math.min(...channelData.map(c => c.margin));
                    if (maxMargin > minMargin) yPercent = 90 - ((channel.margin - minMargin) / (maxMargin - minMargin)) * 80;
                }
                const size = 30 + (channel.netRevenue / maxRevenue) * 40;
                let bgColor = '', borderColor = '', label = '';
                switch(channel.quadrant) {
                    case 'golden': bgColor = 'rgba(72,187,120,0.9)'; borderColor = '#48bb78'; label = '🏆 Золотые'; break;
                    case 'premium': bgColor = 'rgba(66,153,225,0.9)'; borderColor = '#4299e1'; label = '💎 Премиум'; break;
                    case 'workhorse': bgColor = 'rgba(237,137,54,0.9)'; borderColor = '#ed8936'; label = '🐴 Рабочие'; break;
                    default: bgColor = 'rgba(245,101,101,0.9)'; borderColor = '#f56565'; label = '⚠️ Проблемные';
                }
                return `<div style="position: absolute; left: ${xPercent}%; top: ${yPercent}%; transform: translate(-50%, -50%); cursor: pointer; transition: all 0.3s ease; z-index: 10;">
                    <div style="width: ${size}px; height: ${size}px; background: ${bgColor}; border: 3px solid ${borderColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                        <span style="font-size: ${size * 0.4}px;">${channel.icon}</span>
                    </div>
                    <div style="text-align: center; margin-top: 8px; font-weight: 600; font-size: 12px; background: rgba(0,0,0,0.6); color: white; padding: 2px 8px; border-radius: 12px; white-space: nowrap;">${channel.name}</div>
                </div>`;
            }).join('')}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">
            <div style="background: rgba(72,187,120,0.15); border-left: 3px solid #48bb78; border-radius: 8px; padding: 10px;">
                <div style="font-size: 12px; font-weight: 600;">🏆 Золотые</div>
                <div style="font-size: 11px; opacity: 0.8;">Высокая маржа + высокие продажи</div>
                <div style="font-size: 11px; margin-top: 4px; color: #48bb78;">${channelData.filter(c => c.quadrant === 'golden').map(c => c.name).join(', ') || '—'}</div>
            </div>
            <div style="background: rgba(66,153,225,0.15); border-left: 3px solid #4299e1; border-radius: 8px; padding: 10px;">
                <div style="font-size: 12px; font-weight: 600;">💎 Премиум</div>
                <div style="font-size: 11px; opacity: 0.8;">Высокая маржа + низкие продажи</div>
                <div style="font-size: 11px; margin-top: 4px; color: #4299e1;">${channelData.filter(c => c.quadrant === 'premium').map(c => c.name).join(', ') || '—'}</div>
            </div>
            <div style="background: rgba(237,137,54,0.15); border-left: 3px solid #ed8936; border-radius: 8px; padding: 10px;">
                <div style="font-size: 12px; font-weight: 600;">🐴 Рабочие лошадки</div>
                <div style="font-size: 11px; opacity: 0.8;">Низкая маржа + высокие продажи</div>
                <div style="font-size: 11px; margin-top: 4px; color: #ed8936;">${channelData.filter(c => c.quadrant === 'workhorse').map(c => c.name).join(', ') || '—'}</div>
            </div>
            <div style="background: rgba(245,101,101,0.15); border-left: 3px solid #f56565; border-radius: 8px; padding: 10px;">
                <div style="font-size: 12px; font-weight: 600;">⚠️ Проблемные</div>
                <div style="font-size: 11px; opacity: 0.8;">Низкая маржа + низкие продажи</div>
                <div style="font-size: 11px; margin-top: 4px; color: #f56565;">${channelData.filter(c => c.quadrant === 'problem').map(c => c.name).join(', ') || '—'}</div>
            </div>
        </div>
        <div style="margin-top: 16px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead><tr style="background: rgba(102,126,234,0.1);">
                    <th style="padding: 10px; text-align: left;">Канал</th>
                    <th style="padding: 10px; text-align: right;">Маржинальность</th>
                    <th style="padding: 10px; text-align: right;">Продажи (шт)</th>
                    <th style="padding: 10px; text-align: right;">Выручка</th>
                    <th style="padding: 10px; text-align: left;">Стратегия</th>
                </tr></thead>
                <tbody>${channelData.map(channel => {
                    let strategy = '', strategyColor = '';
                    switch(channel.quadrant) {
                        case 'golden': strategy = '📈 Масштабировать'; strategyColor = '#48bb78'; break;
                        case 'premium': strategy = '🎯 Увеличить продажи'; strategyColor = '#4299e1'; break;
                        case 'workhorse': strategy = '⚡ Оптимизировать затраты'; strategyColor = '#ed8936'; break;
                        default: strategy = '🔍 Требуется анализ'; strategyColor = '#f56565';
                    }
                    return `<tr style="border-bottom: 1px solid rgba(102,126,234,0.1);">
                        <td style="padding: 10px;"><span style="font-size: 18px; margin-right: 8px;">${channel.icon}</span> ${channel.name}</tr>
                        <td style="padding: 10px; text-align: right; font-weight: 600; color: ${channel.margin >= 0 ? '#48bb78' : '#f56565'};">${channel.margin.toFixed(1)}%</td>
                        <td style="padding: 10px; text-align: right;">${new Intl.NumberFormat('ru-RU').format(channel.sales)} шт</td>
                        <td style="padding: 10px; text-align: right;">${formatCurrency(channel.netRevenue)}</td>
                        <td style="padding: 10px; color: ${strategyColor};">${strategy}</td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
        </div>
        <div style="padding: 16px; background: rgba(102,126,234,0.1); border-radius: 12px;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">💡 Рекомендации</div>
            <div style="font-size: 13px; line-height: 1.5;">${(() => {
                const goldenCount = channelData.filter(c => c.quadrant === 'golden').length;
                const problemCount = channelData.filter(c => c.quadrant === 'problem').length;
                const premiumCount = channelData.filter(c => c.quadrant === 'premium').length;
                const workhorseCount = channelData.filter(c => c.quadrant === 'workhorse').length;
                let recommendations = [];
                if (goldenCount > 0) recommendations.push(`🏆 <strong>${goldenCount} золотых канала</strong> — масштабируйте их, увеличьте маркетинговый бюджет.`);
                if (premiumCount > 0) recommendations.push(`💎 <strong>${premiumCount} премиум канала</strong> — отличная маржа, но низкие продажи. Увеличьте рекламу.`);
                if (workhorseCount > 0) recommendations.push(`🐴 <strong>${workhorseCount} рабочих лошадки</strong> — продажи есть, но низкая маржа. Оптимизируйте себестоимость.`);
                if (problemCount > 0) recommendations.push(`⚠️ <strong>${problemCount} проблемных канала</strong> — срочный анализ! Возможно, стоит закрыть или реструктуризировать.`);
                return recommendations.join('<br>');
            })()}</div>
        </div>
    </div>`;
    
    return matrixHtml;
}

console.log('✅ dashboardMatrix.js: загружен');
