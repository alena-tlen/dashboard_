// ========================
// dashboardAnomalies.js - АНОМАЛИИ И ВЫБРОСЫ
// ========================

function renderAnomaliesBlock(data, f, totalSalesQuantity, avgCheck) {
    const anomalies = window.detectAnomalies ? window.detectAnomalies(data, f, totalSalesQuantity, avgCheck) : [];
    
    if (anomalies.length === 0) {
        return `<div style="text-align: center; padding: 30px;">
            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
            <div style="font-size: 14px; font-weight: 500; color: #48bb78;">Аномалий не обнаружено</div>
            <div style="font-size: 12px; opacity: 0.6; margin-top: 8px;">Все показатели в пределах нормы</div>
        </div>`;
    }
    
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;
    const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
    
    const summaryHtml = `<div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
        ${criticalCount > 0 ? `<div style="background: rgba(245,101,101,0.15); padding: 8px 16px; border-radius: 20px;"><span style="color: #f56565;">🔴</span> Критических: ${criticalCount}</div>` : ''}
        ${highCount > 0 ? `<div style="background: rgba(237,137,54,0.15); padding: 8px 16px; border-radius: 20px;"><span style="color: #ed8936;">🟠</span> Высоких: ${highCount}</div>` : ''}
        ${mediumCount > 0 ? `<div style="background: rgba(237,137,54,0.1); padding: 8px 16px; border-radius: 20px;"><span style="color: #f59e0b;">🟡</span> Средних: ${mediumCount}</div>` : ''}
        <div style="background: rgba(102,126,234,0.1); padding: 8px 16px; border-radius: 20px;">📊 Всего: ${anomalies.length}</div>
    </div>`;
    
    const anomaliesHtml = anomalies.map((anomaly, idx) => {
        let severityIcon = '', severityColor = '', bgColor = '';
        switch (anomaly.severity) {
            case 'critical': severityIcon = '🔴'; severityColor = '#f56565'; bgColor = 'rgba(245,101,101,0.1)'; break;
            case 'high': severityIcon = '🟠'; severityColor = '#ed8936'; bgColor = 'rgba(237,137,54,0.1)'; break;
            case 'medium': severityIcon = '🟡'; severityColor = '#f59e0b'; bgColor = 'rgba(245,158,11,0.1)'; break;
            default: severityIcon = '🔵'; severityColor = '#4299e1'; bgColor = 'rgba(66,153,225,0.1)';
        }
        const expectedText = anomaly.expected ? ` (норма: ${anomaly.type === 'Рентабельность' ? anomaly.expected.toFixed(1) + '%' : formatCurrency(anomaly.expected)})` : '';
        return `<div style="background: ${bgColor}; border-left: 3px solid ${severityColor}; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">${severityIcon}</span>
                    <div>
                        <div style="font-weight: 600; font-size: 14px;">${anomaly.type}</div>
                        <div style="font-size: 11px; opacity: 0.7;">${anomaly.period}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 14px; color: ${severityColor};">${anomaly.type === 'Рентабельность' ? anomaly.value.toFixed(1) + '%' : formatCurrency(anomaly.value)}</div>
                    <div style="font-size: 10px; opacity: 0.6;">${expectedText}</div>
                </div>
            </div>
            <div style="font-size: 12px; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(102,126,234,0.1);">${anomaly.message}</div>
        </div>`;
    }).join('');
    
    const statsHtml = `<div style="margin-top: 16px; padding: 12px; background: rgba(102,126,234,0.05); border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div><div style="font-size: 10px; opacity: 0.6;">Обнаружено аномалий</div><div style="font-size: 24px; font-weight: 700; color: #f56565;">${anomalies.length}</div></div>
            <div><div style="font-size: 10px; opacity: 0.6;">Требуют внимания</div><div style="font-size: 24px; font-weight: 700; color: #ed8936;">${criticalCount + highCount}</div></div>
            <div><div style="font-size: 10px; opacity: 0.6;">% аномальных показателей</div><div style="font-size: 24px; font-weight: 700;">${Math.min(100, Math.round((anomalies.length / 20) * 100))}%</div></div>
        </div>
    </div>`;
    
    return `<div class="anomalies-container">${summaryHtml}<div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">${anomaliesHtml}</div>${statsHtml}</div>`;
}

console.log('✅ dashboardAnomalies.js: загружен');
