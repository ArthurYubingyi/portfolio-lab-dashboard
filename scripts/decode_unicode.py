#!/usr/bin/env python3
"""Decode \\uXXXX escapes (including surrogate pairs) in a source file in-place."""
import re
import sys
import pathlib

def decode_file(path):
    p = pathlib.Path(path)
    s = p.read_text(encoding='utf-8')
    pattern = re.compile(r'(?:\\u[0-9a-fA-F]{4})+')
    def repl(m):
        decoded = m.group(0).encode('ascii').decode('unicode_escape')
        # Re-encode/decode through utf-16 to merge surrogate pairs into single codepoints
        return decoded.encode('utf-16', 'surrogatepass').decode('utf-16')
    new = pattern.sub(repl, s)
    if new != s:
        p.write_text(new, encoding='utf-8')
        print(f"{path}: decoded ({len(s)} -> {len(new)} chars)")
    else:
        print(f"{path}: no changes")

if __name__ == '__main__':
    for arg in sys.argv[1:]:
        decode_file(arg)
