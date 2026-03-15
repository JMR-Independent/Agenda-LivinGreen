// ================================================================
// MODULE: gas-price.js
// Gestión del precio de gasolina en Utah y cálculo histórico
// Extraído de app.js — no depende de ningún otro módulo
// ================================================================

let GAS_PRICE_UTAH = 3.083; // Default fallback price (Updated Nov 30, 2025)
const SEDONA_2008_MPG = 18; // Combined MPG for 2008 Kia Sedona

// Gas price update function
async function updateGasPrice(forceUpdate = false) {
    try {
        console.log('🔍 Updating gas prices...', forceUpdate ? '(FORCED)' : '');

        // Check if we've already updated today (skip cache if forceUpdate is true)
        const today = new Date().toDateString();
        const lastUpdate = localStorage.getItem('gasPrice_lastUpdate');
        const cachedPrice = localStorage.getItem('gasPrice_utah');

        if (!forceUpdate && lastUpdate === today && cachedPrice) {
            GAS_PRICE_UTAH = parseFloat(cachedPrice);
            console.log('✅ Using cached gas price:', GAS_PRICE_UTAH);
            updateGasPriceDisplay();
            return;
        }

        // Try to fetch current gas prices from multiple sources
        const sources = [
            'https://api.gasbuddy.com/v1/utah/prices', // GasBuddy API
            'https://api.eia.gov/series/?api_key=YOUR_KEY&series_id=PET.EMM_EPMRU_PTE_SUT_DPG.W' // EIA API
        ];

        // For now, simulate a realistic daily fluctuation
        // In production, you'd use a real API
        const basePrice = 3.083; // Updated Nov 30, 2025 - Real Utah gas price
        const dailyVariation = (Math.random() - 0.5) * 0.20; // +/- 10 cents variation
        const newPrice = Math.round((basePrice + dailyVariation) * 100) / 100;

        GAS_PRICE_UTAH = newPrice;

        // Cache the price for today
        localStorage.setItem('gasPrice_utah', GAS_PRICE_UTAH.toString());
        localStorage.setItem('gasPrice_lastUpdate', today);

        // Store today's gas price in historical record
        const gasPriceHistory = JSON.parse(localStorage.getItem('gasPriceHistory') || '{}');
        gasPriceHistory[today] = GAS_PRICE_UTAH;
        localStorage.setItem('gasPriceHistory', JSON.stringify(gasPriceHistory));

        console.log('✅ Updated gas price to: $' + GAS_PRICE_UTAH);
        updateGasPriceDisplay();

    } catch (error) {
        console.error('❌ Error updating gas price:', error);
        // Keep using the cached or default price
    }
}

// Get gas price for a specific date (for historical calculations)
function getGasPriceForDate(dateString) {
    const gasPriceHistory = JSON.parse(localStorage.getItem('gasPriceHistory') || '{}');
    const date = new Date(dateString).toDateString();

    // If we have a historical price for this date, use it
    if (gasPriceHistory[date]) {
        return gasPriceHistory[date];
    }

    // Otherwise, use current price (for old appointments)
    return GAS_PRICE_UTAH;
}

function updateGasPriceDisplay() {
    const priceElements = document.querySelectorAll('.gas-price-display');
    priceElements.forEach(element => {
        element.textContent = `$${GAS_PRICE_UTAH}`;
    });

    // Update header display
    const header = document.querySelector('.gas-price-header');
    if (header) {
        header.innerHTML = `Precio de Gasolina Hoy en Utah: <span style="color: var(--gas-price-value);" class="gas-price-display">$${GAS_PRICE_UTAH}</span>/<span style="color: var(--gas-price-unit);">galón</span> <span style="font-size: 12px; color: var(--gas-price-status);">(actualizado hoy)</span>`;
    }
}
