#!/usr/bin/env python3
"""Replace KellyPositionTable section in buy_plans.tsx with the pro version."""
import pathlib

p = pathlib.Path('src/buy_plans.tsx')
s = p.read_text(encoding='utf-8')

START = '/* ────────── 凯利仓位速查表 ────────── */'
END = '/* ────────── 总览顶部提示 banner ────────── */'

i = s.index(START)
j = s.index(END)
assert i < j, 'markers out of order'

new_block = pathlib.Path('scripts/_new_kelly_block.tsx').read_text(encoding='utf-8')
out = s[:i] + new_block + '\n\n' + s[j:]
p.write_text(out, encoding='utf-8')
print(f'replaced {j - i} chars with {len(new_block)} chars')
