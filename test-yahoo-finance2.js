import YahooFinance from 'yahoo-finance2';

async function testYahooFinance2(symbol) {
  try {
    const yahooFinance = new YahooFinance();
    const quote = await yahooFinance.quote(symbol);
    if (quote.regularMarketPrice) {
      console.log(`✅ ${symbol}: $${quote.regularMarketPrice.toFixed(2)}`);
      return quote.regularMarketPrice;
    } else {
      throw new Error('No price data');
    }
  } catch (error) {
    console.log(`❌ ${symbol}: ${error.message}`);
    return null;
  }
}

async function testAll() {
  const symbols = ["AAPL", "NVDA", "TSLA", "GOOG", "LMND"];

  console.log("Testing yahoo-finance2 library for 5 stocks...");

  for (const symbol of symbols) {
    await testYahooFinance2(symbol);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

testAll().catch((error) => {
  console.log("❌ Test failed:", error);
  process.exit(1);
});