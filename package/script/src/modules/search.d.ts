/**
 * Search module for finding financial instruments and related information.
 *
 * This module provides search functionality to find stocks, ETFs, mutual funds,
 * and other financial instruments by name, symbol, or keywords. It also returns
 * related news articles and other relevant information.
 *
 * @example Basic Search
 * ```typescript
 * import YahooFinance from "yahoo-finance2";
 * const yahooFinance = new YahooFinance();
 *
 * // Search by ticker
 * const results = await yahooFinance.search('AAP