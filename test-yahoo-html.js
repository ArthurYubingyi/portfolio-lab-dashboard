import fetch from "node-fetch";
import * as cheerio from "cheerio";

async function testYahooFinanceHTML(symbol) {
  const url = `https://finance.yahoo.com/quote/${symbol}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    // 查找股票价格元素
    const priceElement = $("fin-streamer[data-field=\"regularMarketPrice\"]");
    if (priceElement.length > 0) {
      const priceText = priceElement.attr("data-value") || priceElement.text();
      const price = parseFloat(priceText.trim());

      if (!isNaN(price)) {
        console.log(`✅ ${symbol}: $${price.toFixed(2)}`);
        return price;
      }
    }

    throw new Error("No price data");
  } catch (error) {
    console.log(`❌ ${symbol}: ${error.message}`);
    return null;
  }
}

async function testAll() {
  const symbols = ["AAPL", "NVDA", "TSLA", "GOOG", "LMND"];

  console.log("Testing Yahoo Finance HTML parsing for 5 stocks...");

  for (const symbol of symbols) {
    await testYahooFinanceHTML(symbol);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

testAll().catch((error) => {
  console.log("❌ Test failed:", error);
  process.exit(1);
});
