#!/usr/bin/env python3
"""Seed reasonable dividend JSON files so the UI has data on first deploy."""
import json
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'dividends'
OUT.mkdir(parents=True, exist_ok=True)
today = date.today().isoformat()

# 已知近年实际派息（粗略，仅作为初始种子；生产数据由 Actions 周更）
SEED = {
    '600519.SH': {  # 茅台
        'currency': 'CNY',
        'history': [
            {'exDividendDate': '2025-06-25', 'paymentDate': '2025-06-26', 'amount': 27.61},
            {'exDividendDate': '2024-06-25', 'paymentDate': '2024-06-26', 'amount': 30.876},
            {'exDividendDate': '2023-06-30', 'paymentDate': '2023-07-03', 'amount': 25.911},
        ],
        'upcoming': [{'exDividendDate': '2026-06-25', 'paymentDate': None, 'amount': None, 'estimated': True}],
    },
    '600036.SH': {  # 招行
        'currency': 'CNY',
        'history': [
            {'exDividendDate': '2025-07-10', 'paymentDate': '2025-07-11', 'amount': 2.0},
            {'exDividendDate': '2024-07-10', 'paymentDate': '2024-07-11', 'amount': 1.972},
            {'exDividendDate': '2023-07-13', 'paymentDate': '2023-07-14', 'amount': 1.738},
        ],
        'upcoming': [{'exDividendDate': '2026-07-10', 'paymentDate': None, 'amount': None, 'estimated': True}],
    },
    '300750.SZ': {  # 宁德时代
        'currency': 'CNY',
        'history': [
            {'exDividendDate': '2025-06-12', 'paymentDate': '2025-06-13', 'amount': 5.022},
            {'exDividendDate': '2024-05-22', 'paymentDate': '2024-05-23', 'amount': 2.452},
        ],
        'upcoming': [],
    },
    '000858.SZ': {  # 五粮液
        'currency': 'CNY',
        'history': [
            {'exDividendDate': '2025-06-20', 'paymentDate': '2025-06-23', 'amount': 4.678},
            {'exDividendDate': '2024-06-21', 'paymentDate': '2024-06-24', 'amount': 4.678},
        ],
        'upcoming': [{'exDividendDate': '2026-06-20', 'paymentDate': None, 'amount': None, 'estimated': True}],
    },
    '00700.HK': {  # 腾讯
        'currency': 'HKD',
        'history': [
            {'exDividendDate': '2025-05-15', 'paymentDate': '2025-06-04', 'amount': 4.5},
            {'exDividendDate': '2024-05-16', 'paymentDate': '2024-06-05', 'amount': 3.4},
            {'exDividendDate': '2023-05-18', 'paymentDate': '2023-06-09', 'amount': 2.4},
        ],
        'upcoming': [{'exDividendDate': '2026-05-15', 'paymentDate': None, 'amount': None, 'estimated': True}],
    },
    '09988.HK': {  # 阿里
        'currency': 'USD',
        'history': [
            {'exDividendDate': '2025-06-12', 'paymentDate': '2025-07-10', 'amount': 0.95},
            {'exDividendDate': '2024-06-13', 'paymentDate': '2024-07-15', 'amount': 1.0},
        ],
        'upcoming': [{'exDividendDate': '2026-06-12', 'paymentDate': None, 'amount': None, 'estimated': True}],
    },
    '01024.HK': {  # 快手 — 通常不派息
        'currency': 'HKD',
        'history': [],
        'upcoming': [],
    },
    '03690.HK': {  # 美团 — 通常不派息
        'currency': 'HKD',
        'history': [],
        'upcoming': [],
    },
    'AAPL': {
        'currency': 'USD',
        'history': [
            {'exDividendDate': '2026-02-09', 'paymentDate': '2026-02-13', 'amount': 0.26},
            {'exDividendDate': '2025-11-10', 'paymentDate': '2025-11-13', 'amount': 0.26},
            {'exDividendDate': '2025-08-11', 'paymentDate': '2025-08-14', 'amount': 0.26},
            {'exDividendDate': '2025-05-12', 'paymentDate': '2025-05-15', 'amount': 0.25},
        ],
        'upcoming': [{'exDividendDate': '2026-05-11', 'paymentDate': '2026-05-14', 'amount': 0.26, 'estimated': True}],
    },
    'MSFT': {
        'currency': 'USD',
        'history': [
            {'exDividendDate': '2026-02-19', 'paymentDate': '2026-03-12', 'amount': 0.83},
            {'exDividendDate': '2025-11-20', 'paymentDate': '2025-12-11', 'amount': 0.83},
            {'exDividendDate': '2025-08-21', 'paymentDate': '2025-09-11', 'amount': 0.83},
            {'exDividendDate': '2025-05-15', 'paymentDate': '2025-06-12', 'amount': 0.83},
        ],
        'upcoming': [{'exDividendDate': '2026-05-15', 'paymentDate': '2026-06-11', 'amount': 0.83, 'estimated': True}],
    },
    'GOOG': {
        'currency': 'USD',
        'history': [
            {'exDividendDate': '2026-03-10', 'paymentDate': '2026-03-17', 'amount': 0.20},
            {'exDividendDate': '2025-12-09', 'paymentDate': '2025-12-16', 'amount': 0.20},
            {'exDividendDate': '2025-09-09', 'paymentDate': '2025-09-16', 'amount': 0.20},
            {'exDividendDate': '2025-06-10', 'paymentDate': '2025-06-17', 'amount': 0.20},
        ],
        'upcoming': [{'exDividendDate': '2026-06-09', 'paymentDate': '2026-06-16', 'amount': 0.20, 'estimated': True}],
    },
    'META': {
        'currency': 'USD',
        'history': [
            {'exDividendDate': '2026-03-19', 'paymentDate': '2026-03-26', 'amount': 0.525},
            {'exDividendDate': '2025-12-19', 'paymentDate': '2025-12-26', 'amount': 0.525},
            {'exDividendDate': '2025-09-19', 'paymentDate': '2025-09-26', 'amount': 0.525},
            {'exDividendDate': '2025-06-20', 'paymentDate': '2025-06-27', 'amount': 0.50},
        ],
        'upcoming': [{'exDividendDate': '2026-06-19', 'paymentDate': '2026-06-26', 'amount': 0.525, 'estimated': True}],
    },
    'NVDA': {
        'currency': 'USD',
        'history': [
            {'exDividendDate': '2026-03-12', 'paymentDate': '2026-04-02', 'amount': 0.01},
            {'exDividendDate': '2025-12-04', 'paymentDate': '2025-12-26', 'amount': 0.01},
        ],
        'upcoming': [{'exDividendDate': '2026-06-04', 'paymentDate': '2026-06-26', 'amount': 0.01, 'estimated': True}],
    },
    'AMZN': {  # 不派息
        'currency': 'USD',
        'history': [],
        'upcoming': [],
    },
    'TSLA': {  # 不派息
        'currency': 'USD',
        'history': [],
        'upcoming': [],
    },
}

index = []
for sym, data in SEED.items():
    body = {
        'symbol': sym,
        'lastUpdate': today,
        'history': [{**h, 'currency': data['currency']} for h in data['history']],
        'upcoming': [{**u, 'currency': data['currency']} for u in data['upcoming']],
    }
    (OUT / f'{sym}.json').write_text(
        json.dumps(body, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    index.append({
        'symbol': sym,
        'lastUpdate': today,
        'historyCount': len(body['history']),
        'upcomingCount': len(body['upcoming']),
    })

(OUT / 'index.json').write_text(
    json.dumps({'updatedAt': today, 'list': index}, ensure_ascii=False, indent=2),
    encoding='utf-8',
)
print(f"seeded {len(index)} symbols to {OUT}")
