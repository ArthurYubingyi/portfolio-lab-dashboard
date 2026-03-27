import fetch from 'node-fetch';

async function testFinnhubAPI(symbol) {
  const API_KEY = 'cm886ev48v6t25i5r3pg';
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (data.c !== null && data.c !== undefined) {
      console.log(`✅ ${symbol}: $${data.c.toFixed(2)}`);
      return data.c;
    }

    throw new Error('No price data');
  } catch (error) {
    console.log(`❌ ${symbol}: ${error.message}`);
    return null;
  }
}

async function testAll() {
  const symbols = ["AAPL", "NVDA", "TSLA", "GOOG", "LMND"];

  console.log("Testing Finnhub API for 5 stocks...");

  for (const symbol of symbols) {
    await testFinnhubAPI(symbol);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

testAll().catch((error) => {
  console.log("❌ Test failed:", error);
  process.exit(1);
});