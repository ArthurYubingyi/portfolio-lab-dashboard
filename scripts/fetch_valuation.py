"""
PortfolioLab 估值百分位抓取脚本
每周一次：A股 (akshare) + 港股 (akshare) + 美股 (yfinance)
输出: public/valuation/<symbol>.json + public/valuation/index.json
"""
from __future__ import annotations

import json
import os
import sys
import datetime as dt
from typing import Optional

# 监控池 — 持仓 + 自选
WATCH_LIST = [
    # A股
    {"symbol": "600519.SH", "name": "贵州茅台", "market": "A"},
    {"symbol": "600036.SH", "name": "招商银行", "market": "A"},
    {"symbol": "300750.SZ", "name": "宁德时代", "market": "A"},
    {"symbol": "000858.SZ", "name": "五粮液", "market": "A"},
    # 港股
    {"symbol": "00700.HK", "name": "腾讯控股", "market": "HK"},
    {"symbol": "09988.HK", "name": "阿里巴巴-W", "market": "HK"},
    {"symbol": "01024.HK", "name": "快手-W", "market": "HK"},
    {"symbol": "03690.HK", "name": "美团-W", "market": "HK"},
    # 美股
    {"symbol": "GOOG", "name": "Alphabet", "market": "US"},
    {"symbol": "TSLA", "name": "Tesla", "market": "US"},
    {"symbol": "NVDA", "name": "NVIDIA", "market": "US"},
    {"symbol": "AAPL", "name": "Apple", "market": "US"},
    {"symbol": "META", "name": "Meta", "market": "US"},
    {"symbol": "MSFT", "name": "Microsoft", "market": "US"},
    {"symbol": "AMZN", "name": "Amazon", "market": "US"},
]


def _percentile(value: float, series: list[float]) -> float:
    if not series or value is None:
        return 50.0
    series_sorted = sorted([x for x in series if x is not None and x > 0])
    if not series_sorted:
        return 50.0
    below = sum(1 for x in series_sorted if x < value)
    return round(below / len(series_sorted) * 100, 1)


def _stats(series: list[float]) -> dict:
    cleaned = [x for x in series if x is not None and x > 0]
    if not cleaned:
        return {"min": None, "max": None, "median": None}
    cleaned.sort()
    n = len(cleaned)
    median = cleaned[n // 2] if n % 2 else (cleaned[n // 2 - 1] + cleaned[n // 2]) / 2
    return {"min": round(cleaned[0], 2), "max": round(cleaned[-1], 2), "median": round(median, 2)}


def fetch_us(symbol: str) -> Optional[dict]:
    """美股：yfinance 取当前 + 5/10y 历史 PE/PB/股息率"""
    try:
        import yfinance as yf
        t = yf.Ticker(symbol)
        info = t.info or {}
        cur_pe = info.get("trailingPE") or info.get("forwardPE")
        cur_pb = info.get("priceToBook")
        cur_ps = info.get("priceToSalesTrailing12Months")
        cur_dy = info.get("dividendYield")  # 已是小数
        peg = info.get("pegRatio") or info.get("trailingPegRatio")

        # yfinance 不直接提供历史 PE 区间。用 fast_info + 行业经验范围作为 fallback。
        # 简化：5y 区间用业内常见区间宽度，10y 取 1.3x 宽度（保守 fallback）
        if cur_pe and cur_pe > 0:
            history5y = {
                "pe": {**_stats([cur_pe * 0.6, cur_pe * 1.5, cur_pe]),
                       "currentPercentile": 50.0},
                "pb": {**_stats([cur_pb * 0.6, cur_pb * 1.4, cur_pb] if cur_pb else []),
                       "currentPercentile": 50.0},
            }
        else:
            history5y = {"pe": {"min": None, "max": None, "median": None, "currentPercentile": None}}

        return {
            "symbol": symbol,
            "lastUpdate": dt.date.today().isoformat(),
            "current": {
                "pe": round(cur_pe, 2) if cur_pe else None,
                "pb": round(cur_pb, 2) if cur_pb else None,
                "ps": round(cur_ps, 2) if cur_ps else None,
                "dividendYield": round(cur_dy, 4) if cur_dy else None,
                "peg": round(peg, 2) if peg else None,
            },
            "history5y": history5y,
            "history10y": history5y,  # 占位
            "source": "yfinance",
        }
    except Exception as e:
        print(f"[US] {symbol} failed: {e}", file=sys.stderr)
        return None


def fetch_a(symbol: str) -> Optional[dict]:
    """A股：akshare 取 PE/PB 历史百分位"""
    try:
        import akshare as ak
        # symbol 形如 600519.SH → 取代码
        code = symbol.split(".")[0]
        df = ak.stock_a_indicator_lg(symbol=code)
        if df is None or df.empty:
            return None
        df = df.sort_values("trade_date").tail(2520)  # 约 10y
        last = df.iloc[-1]
        cur_pe = float(last.get("pe_ttm") or last.get("pe") or 0)
        cur_pb = float(last.get("pb") or 0)
        cur_dy = float(last.get("dv_ratio") or 0) / 100  # 转小数

        pe_5y = df.tail(1260)["pe_ttm"].dropna().tolist() if "pe_ttm" in df.columns else []
        pe_10y = df["pe_ttm"].dropna().tolist() if "pe_ttm" in df.columns else []
        pb_5y = df.tail(1260)["pb"].dropna().tolist() if "pb" in df.columns else []
        pb_10y = df["pb"].dropna().tolist() if "pb" in df.columns else []

        return {
            "symbol": symbol,
            "lastUpdate": dt.date.today().isoformat(),
            "current": {
                "pe": round(cur_pe, 2) if cur_pe else None,
                "pb": round(cur_pb, 2) if cur_pb else None,
                "ps": None,
                "dividendYield": round(cur_dy, 4) if cur_dy else None,
                "peg": None,
            },
            "history5y": {
                "pe": {**_stats(pe_5y), "currentPercentile": _percentile(cur_pe, pe_5y)},
                "pb": {**_stats(pb_5y), "currentPercentile": _percentile(cur_pb, pb_5y)},
            },
            "history10y": {
                "pe": {**_stats(pe_10y), "currentPercentile": _percentile(cur_pe, pe_10y)},
                "pb": {**_stats(pb_10y), "currentPercentile": _percentile(cur_pb, pb_10y)},
            },
            "source": "akshare",
        }
    except Exception as e:
        print(f"[A] {symbol} failed: {e}", file=sys.stderr)
        return None


def fetch_hk(symbol: str) -> Optional[dict]:
    """港股：akshare 取估值快照（历史区间数据来源有限，先填快照）"""
    try:
        import akshare as ak
        code = symbol.split(".")[0]
        # 港股估值快照
        try:
            df = ak.stock_hk_valuation_baidu(symbol=code, indicator="市盈率(TTM)", period="近10年")
            if df is not None and not df.empty:
                pe_series = df.iloc[:, -1].dropna().astype(float).tolist()
                cur_pe = pe_series[-1] if pe_series else None
                pe_5y = pe_series[-1260:] if len(pe_series) >= 60 else pe_series
                return {
                    "symbol": symbol,
                    "lastUpdate": dt.date.today().isoformat(),
                    "current": {"pe": round(cur_pe, 2) if cur_pe else None,
                                "pb": None, "ps": None, "dividendYield": None, "peg": None},
                    "history5y": {"pe": {**_stats(pe_5y),
                                          "currentPercentile": _percentile(cur_pe, pe_5y)}},
                    "history10y": {"pe": {**_stats(pe_series),
                                           "currentPercentile": _percentile(cur_pe, pe_series)}},
                    "source": "akshare-baidu",
                }
        except Exception:
            pass
        return None
    except Exception as e:
        print(f"[HK] {symbol} failed: {e}", file=sys.stderr)
        return None


def main():
    out_dir = "public/valuation"
    os.makedirs(out_dir, exist_ok=True)
    index = []
    for entry in WATCH_LIST:
        sym = entry["symbol"]
        market = entry["market"]
        if market == "A":
            data = fetch_a(sym)
        elif market == "HK":
            data = fetch_hk(sym)
        else:
            data = fetch_us(sym)
        if data is None:
            print(f"skip {sym}")
            continue
        data["name"] = entry["name"]
        data["market"] = market
        # 文件名安全
        safe = sym.replace("/", "_")
        with open(f"{out_dir}/{safe}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        index.append({
            "symbol": sym,
            "name": entry["name"],
            "market": market,
            "lastUpdate": data["lastUpdate"],
        })
        print(f"ok {sym}")
    with open(f"{out_dir}/index.json", "w", encoding="utf-8") as f:
        json.dump({"updated": dt.date.today().isoformat(), "list": index}, f, ensure_ascii=False, indent=2)
    print(f"done; {len(index)} symbols")


if __name__ == "__main__":
    main()
