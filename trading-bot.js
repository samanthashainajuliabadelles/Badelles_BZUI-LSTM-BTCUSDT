const INITIAL_BALANCE = 10000;

export const wallet = {
    usdt: INITIAL_BALANCE,
    btc: 0,
    equity: INITIAL_BALANCE,
    pnl: 0,
    position: "CASH",
    running: false,
    lastProcessedCandle: null,
    history: []
};

export function resetWallet() {
    wallet.usdt = INITIAL_BALANCE;
    wallet.btc = 0;
    wallet.equity = INITIAL_BALANCE;
    wallet.pnl = 0;
    wallet.position = "CASH";
    wallet.running = false;
    wallet.lastProcessedCandle = null;
    wallet.history = [];
}

export function updatePortfolio(price) {
    wallet.equity =
        wallet.usdt + wallet.btc * price;

    wallet.pnl =
        wallet.equity - INITIAL_BALANCE;

    wallet.position =
        wallet.btc > 0 ? "HOLDING BTC" : "CASH";
}

export function expectedChange(current, predicted) {
    return ((predicted - current) / current) * 100;
}

export function validSimulationInput(current, predicted) {
    return (
        Number.isFinite(current) &&
        Number.isFinite(predicted) &&
        current > 0 &&
        predicted > 0
    );
}

export function classifySignal(change, threshold) {
    if (change > threshold) {
        return "BUY";
    }

    if (change < -threshold) {
        return "SELL";
    }

    return "HOLD";
}
// Classroom-only virtual accounting. No exchange order requests or credentials.
export const THRESHOLD = 0.05;
export const ORDER_QUANTITY = 0.01;
export function evaluatePaperCandle(current, predicted, candleTime) {
    if (!validSimulationInput(current, predicted)) return;
    updatePortfolio(current);
    if (!wallet.running || !Number.isFinite(candleTime) ||
        (wallet.lastProcessedCandle !== null && candleTime <= wallet.lastProcessedCandle)) return;
    wallet.lastProcessedCandle = candleTime;
    const change = expectedChange(current, predicted);
    console.table({
        CurrentPrice: current,
        PredictedPrice: predicted,
        ForecastChange: change.toFixed(6) + '%',
        Threshold: THRESHOLD,
        VirtualUSDT: wallet.usdt,
        VirtualBTC: wallet.btc,
        ModelSignal: classifySignal(change, THRESHOLD)
    });
    let side = classifySignal(change, THRESHOLD);
    const cost = ORDER_QUANTITY * current;
    if (side === 'BUY' && wallet.usdt >= cost) {
        wallet.usdt -= cost;
        wallet.btc += ORDER_QUANTITY;
    } else if (side === 'SELL' && wallet.btc >= ORDER_QUANTITY - 1e-10) {
        wallet.btc = Math.max(0, wallet.btc - ORDER_QUANTITY);
        wallet.usdt += cost;
    } else {
        side = 'HOLD';
    }
    updatePortfolio(current);
    wallet.history.push({
        timestamp: new Date(candleTime).toLocaleString(),
        side,
        price: current,
        quantity: side === 'HOLD' ? 0 : ORDER_QUANTITY,
        forecastChange: change,
        usdtBalance: wallet.usdt,
        btcBalance: wallet.btc
    });
    return { side, change, current, predicted };
}
