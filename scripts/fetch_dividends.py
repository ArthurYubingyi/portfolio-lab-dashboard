#!/usr/bin/env python3
"""
PortfolioLab — 股息抓取脚本（A股/港股/美股）

数据源：
- A股 (.SH/.SZ)：akshare.stock_dividend_cninfo(symbol="600036")  历史分红
- 港股 (.HK)：akshare.stock_hk_fhpx_detail_ths 或 stock_hk_dividend_em（接口不稳，回退到 yfinance）
- 美股：yfinance Ticker.dividends + Ticker.calendar (含 Ex-Dividend Date)

输出：public/dividends/{symbol}.json
{
  "symbol": "00700.HK",
  "lastUpdate": "YYYY-MM-DD",
  "history": [{"exDividendDate": "...", "paymentDate": "...", "amount": 4.50, "currency": "HKD"}, ...],
  "upcoming": [{"exDividendDate": "...", "paymentDate": "...", "amount": null, "currency": "HKD", "estimated": true}]
}

并维护 public/dividends/index.json 列出所有 symbol + 上次更新时间。
"""

import json
import os
import sys
from datetime import datetime, date
from pathlib import Path
import traceback

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'dividends'
OUT.mkdir(parents=True, exist_ok=True)

# 持仓 + 估值监控的并集
SYMBOLS = [
    '600519.SH', '600036.SH', '300750.SZ', '000858.SZ',
    '00700.HK', '09988.HK', '01024.HK', '03690.HK',
    'GOOG', 'TSLA', 'NVDA', 'AAPL', 'META', 'MSFT', 'AMZN',
]


def cny_pure(s):
    return s.split('.')[0]


def fetch_a_share(symbol):
    """A股: akshare.stock_dividend_cninfo"""
    import akshare as ak
    code = cny_pure(symbol)
    try:
        df = ak.stock_dividend_cninfo(symbol=code)
    except Exception as e:
        print(f"  [A] {symbol} cninfo failed: {e}")
        return [], []
    if df is None or df.empty:
        return [], []
    # 列名常见: 实施方案分红说明 公告日期 除权日 派息股权登记日 派息日期 ...
    history = []
    upcoming = []
    today = date.today().isoformat()
    for _, row in df.iterrows():
        try:
            ex = str(row.get('除权日') or row.get('除权除息日') or row.get('股权登记日') or '')[:10]
            pay = str(row.get('派息日') or row.get('派息日期') or '')[:10]
            # 派息说明里通常有 "10派X元"，akshare 也提供"派息" 列
            amt_raw = row.get('派息(税前)') or row.get('税后派息') or row.get('派息') or row.get('每股派息(元)')
            amt = float(amt_raw) if amt_raw not in (None, '', '-') else None
        except Exception:
            continue
        if not ex or ex == 'nan':
            continue
        rec = {
            'exDividendDate': ex,
            'paymentDate': pay if pay and pay != 'nan' else None,
            'amount': amt,
            'currency': 'CNY',
        }
        if ex >= today:
            upcoming.append({**rec, 'estimated': amt is None})
        else:
            history.append(rec)
    history.sort(key=lambda x: x['exDividendDate'], reverse=True)
    upcoming.sort(key=lambda x: x['exDividendDate'])
    return history[:30], upcoming[:5]


def fetch_hk(symbol):
    """港股: yfinance 优先（更稳）"""
    import yfinance as yf
    code = cny_pure(symbol)
    yfsym = code + '.HK'
    try:
        t = yf.Ticker(yfsym)
        divs = t.dividends
    except Exception as e:
        print(f"  [HK] {symbol} yf failed: {e}")
        return [], []
    history = []
    if divs is not None and len(divs) > 0:
        for ts, amt in divs.items():
            history.append({
                'exDividendDate': str(ts.date()),
                'paymentDate': None,
                'amount': float(amt),
                'currency': 'HKD',
            })
    history.sort(key=lambda x: x['exDividendDate'], reverse=True)
    upcoming = _yf_upcoming(t, 'HKD')
    return history[:30], upcoming


def fetch_us(symbol):
    import yfinance as yf
    try:
        t = yf.Ticker(symbol)
        divs = t.dividends
    except Exception as e:
        print(f"  [US] {symbol} yf failed: {e}")
        return [], []
    history = []
    if divs is not None and len(divs) > 0:
        for ts, amt in divs.items():
            history.append({
                'exDividendDate': str(ts.date()),
                'paymentDate': None,
                'amount': float(amt),
                'currency': 'USD',
            })
    history.sort(key=lambda x: x['exDividendDate'], reverse=True)
    upcoming = _yf_upcoming(t, 'USD')
    return history[:30], upcoming


def _yf_upcoming(t, currency):
    """从 yfinance Ticker.calendar 提取下个除息日（可能为 None）"""
    today = date.today().isoformat()
    try:
        cal = t.calendar
    except Exception:
        return []
    if not cal:
        return []
    if isinstance(cal, dict):
        ex = cal.get('Ex-Dividend Date')
        if ex:
            ex_str = str(ex)[:10]
            if ex_str >= today:
                return [{
                    'exDividendDate': ex_str,
                    'paymentDate': None,
                    'amount': None,
                    'currency': currency,
                    'estimated': True,
                }]
    return []


def fetch_one(symbol):
    if symbol.endswith('.SH') or symbol.endswith('.SZ'):
        return fetch_a_share(symbol)
    if symbol.endswith('.HK'):
        return fetch_hk(symbol)
    return fetch_us(symbol)


def main():
    index = []
    today = date.today().isoformat()
    for sym in SYMBOLS:
        try:
            print(f"[{sym}] fetching...")
            history, upcoming = fetch_one(sym)
            data = {
                'symbol': sym,
                'lastUpdate': today,
                'history': history,
                'upcoming': upcoming,
            }
            (OUT / f'{sym}.json').write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding='utf-8',
            )
            index.append({
                'symbol': sym,
                'lastUpdate': today,
                'historyCount': len(history),
                'upcomingCount': len(upcoming),
            })
            print(f"  ✓ {len(history)} history, {len(upcoming)} upcoming")
        except Exception as e:
            print(f"  ✗ {sym} failed: {e}")
            traceback.print_exc()
            # 失败时若已有旧文件，不覆盖
            existing = OUT / f'{sym}.json'
            if existing.exists():
                index.append({
                    'symbol': sym,
                    'lastUpdate': 'stale',
                    'historyCount': 0,
                    'upcomingCount': 0,
                })

    (OUT / 'index.json').write_text(
        json.dumps({'updatedAt': datetime.utcnow().isoformat() + 'Z', 'list': index}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    print(f"\n✓ wrote {len(index)} symbols to {OUT}")


if __name__ == '__main__':
    main()
