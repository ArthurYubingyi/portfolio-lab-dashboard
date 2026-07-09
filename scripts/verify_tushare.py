#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_tushare.py
验证 Tushare 接口能否拉取 A 股 4 只标的的真实 PE/PB 及5年历史分位。

用法：
    cd C:\AI\Product\PortfolioLabX
    python scripts/verify_tushare.py
"""
import os
import sys
import time
from pathlib import Path

# ── 读取 .env（若存在）
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

TOKEN = os.environ.get("TUSHARE_TOKEN", "")
if not TOKEN:
    print("[ERROR] TUSHARE_TOKEN 未设置，请检查 .env 或 setx", file=sys.stderr)
    sys.exit(1)

import tushare as ts
ts.set_token(TOKEN)
pro = ts.pro_api()

SYMBOLS = [
    ("600036.SH", "600036.SZ".replace(".SZ", "").replace(".SH", "") + ""),  # 需拼 tushare 格式
    ("600519.SH", ""),
    ("300750.SZ", ""),
    ("002027.SZ", ""),
]

# Tushare 股票代码格式：600036.SH → 600036.SH（与我们的格式一致）
A_SYMBOLS = ["600036.SH", "600519.SH", "300750.SZ", "002027.SZ"]


def _percentile(value: float, series: list) -> float:
    if not series or value is None:
        return None
    cleaned = sorted([x for x in series if x is not None and x > 0])
    if not cleaned:
        return None
    below = sum(1 for x in cleaned if x < value)
    return round(below / len(cleaned) * 100, 1)


def fetch_one(symbol: str) -> dict:
    """
    用 Tushare daily_basic 接口拉取历史日频基本面数据，计算5年PE/PB分位。
    daily_basic 返回字段包含：ts_code, trade_date, pe_ttm, pb 等。
    """
    print(f"\n  正在获取 {symbol} ...")
    # 拉取近5年日频数据（约1260个交易日）
    # daily_basic 限制：每次最多5000行，5年=1260行，单次够用
    import datetime as dt
    end = dt.date.today().strftime("%Y%m%d")
    # 5年前
    start = (dt.date.today() - dt.timedelta(days=365 * 5 + 30)).strftime("%Y%m%d")

    df = pro.daily_basic(ts_code=symbol, start_date=start, end_date=end,
                         fields="ts_code,trade_date,pe_ttm,pb")
    if df is None or df.empty:
        raise RuntimeError(f"{symbol}: daily_basic 返回空数据（积分不足或代码错误）")

    df = df.sort_values("trade_date")
    last = df.iloc[-1]

    cur_pe = float(last["pe_ttm"]) if last["pe_ttm"] and str(last["pe_ttm"]) != "nan" else None
    cur_pb = float(last["pb"]) if last["pb"] and str(last["pb"]) != "nan" else None

    pe_series = df["pe_ttm"].dropna().tolist()
    pb_series = df["pb"].dropna().tolist()

    pe5_pct = _percentile(cur_pe, pe_series) if cur_pe else None
    pb5_pct = _percentile(cur_pb, pb_series) if cur_pb else None

    return {
        "symbol": symbol,
        "rows": len(df),
        "latest_date": last["trade_date"],
        "pe_ttm": cur_pe,
        "pb": cur_pb,
        "pe_5y_percentile": pe5_pct,
        "pb_5y_percentile": pb5_pct,
    }


print("=" * 60)
print("Tushare A股数据验证")
print("=" * 60)

results = []
for i, sym in enumerate(A_SYMBOLS):
    if i > 0:
        print("  [延时 1.5s 避免频率限制]")
        time.sleep(1.5)
    try:
        r = fetch_one(sym)
        results.append(r)
        print(f"  ✓ {r['symbol']} ({r['latest_date']}, {r['rows']} 行)")
        print(f"    当前 PE(TTM) = {r['pe_ttm']}")
        print(f"    当前 PB      = {r['pb']}")
        print(f"    5年PE分位    = {r['pe_5y_percentile']}%")
        print(f"    5年PB分位    = {r['pb_5y_percentile']}%")
    except Exception as e:
        print(f"  ✗ {sym} 失败: {e}", file=sys.stderr)
        results.append({"symbol": sym, "error": str(e)})

print("\n" + "=" * 60)
print("汇总")
print("=" * 60)
print(f"{'标的':<14} {'PE(TTM)':>10} {'PB':>8} {'PE5y分位':>10} {'PB5y分位':>10} {'状态'}")
print("-" * 60)
for r in results:
    if "error" in r:
        print(f"{r['symbol']:<14} {'—':>10} {'—':>8} {'—':>10} {'—':>10}  ERROR: {r['error'][:40]}")
    else:
        pe = f"{r['pe_ttm']:.2f}" if r['pe_ttm'] is not None else "—"
        pb = f"{r['pb']:.2f}" if r['pb'] is not None else "—"
        pe5 = f"{r['pe_5y_percentile']}%" if r['pe_5y_percentile'] is not None else "—"
        pb5 = f"{r['pb_5y_percentile']}%" if r['pb_5y_percentile'] is not None else "—"
        print(f"{r['symbol']:<14} {pe:>10} {pb:>8} {pe5:>10} {pb5:>10}  OK ({r['rows']}行)")

failed = [r for r in results if "error" in r]
if failed:
    print(f"\n[结论] {len(failed)} 只失败，积分可能不足或接口受限，如实汇报，不使用假数据兜底。")
    sys.exit(1)
else:
    print(f"\n[结论] 全部 {len(results)} 只验证通过，数据来源真实。")
