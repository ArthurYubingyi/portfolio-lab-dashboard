"""
PortfolioLab — 信号级信息流抓取
每周一次通过 GitHub Actions 触发，抓取精选 RSS 源，输出 public/signals/{YYYY-MM-DD}.json

不爬日常新闻、不爬讨论区，只抓主题相关产业风向源。
"""
import json
import os
import re
import sys
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

SOURCES = [
    {"name": "Anthropic", "url": "https://www.anthropic.com/news/rss.xml", "themes": ["AI入口革命", "端侧AI普及"]},
    {"name": "OpenAI Blog", "url": "https://openai.com/news/rss.xml", "themes": ["AI入口革命"]},
    {"name": "Google Research", "url": "https://research.google/blog/rss/", "themes": ["AI入口革命", "数字广告"]},
    {"name": "Tesla IR", "url": "https://www.businesswire.com/portal/site/home/news/?ndmConfigId=1000094&searchType=advanced&filterBy=tesla", "themes": ["自动驾驶"]},
]

# 简易 HTML 标签清理
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def strip_html(s: str) -> str:
    if not s:
        return ""
    s = TAG_RE.sub(" ", s)
    s = WS_RE.sub(" ", s).strip()
    return s


def fetch_rss(url: str) -> list:
    """返回 [{title, link, pubDate, summary}, ...]"""
    try:
        req = Request(url, headers={"User-Agent": "PortfolioLab-SignalBot/1.0"})
        with urlopen(req, timeout=15) as r:
            data = r.read()
        root = ET.fromstring(data)
        items = []
        # RSS 2.0
        for item in root.iter("item"):
            title = item.findtext("title") or ""
            link = item.findtext("link") or ""
            pub = item.findtext("pubDate") or ""
            desc = item.findtext("description") or ""
            items.append({
                "title": strip_html(title),
                "link": link.strip(),
                "pubDate": pub.strip(),
                "summary": strip_html(desc)[:500],
            })
        # Atom fallback
        if not items:
            ns = {"a": "http://www.w3.org/2005/Atom"}
            for entry in root.findall("a:entry", ns):
                title = entry.findtext("a:title", default="", namespaces=ns)
                link_el = entry.find("a:link", ns)
                link = link_el.get("href") if link_el is not None else ""
                pub = entry.findtext("a:updated", default="", namespaces=ns) or entry.findtext("a:published", default="", namespaces=ns)
                summary = entry.findtext("a:summary", default="", namespaces=ns) or entry.findtext("a:content", default="", namespaces=ns)
                items.append({
                    "title": strip_html(title),
                    "link": link.strip(),
                    "pubDate": pub.strip(),
                    "summary": strip_html(summary)[:500],
                })
        return items[:20]
    except Exception as e:
        print(f"[warn] fetch {url} failed: {e}", file=sys.stderr)
        return []


def call_claude_filter(api_key: str, item: dict, source_themes: list) -> dict:
    """对单条信号过 Claude，输出结构化 {importance, themes, summary}。失败时返回 None。"""
    if not api_key:
        return None
    try:
        import urllib.request, urllib.error
        prompt = (
            "你是产业研究助手。下面是一条来自产业风向源的原始信息，请回答：\n"
            "1. 重要性 1-5 分（是否会改变以下任一主题的关键变量）\n"
            "2. 受影响的主题（从给定主题列表中选）\n"
            "3. 30 字以内总结\n\n"
            f"主题列表: {', '.join(source_themes)}\n"
            f"标题: {item['title']}\n"
            f"摘要: {item['summary']}\n\n"
            "只返回 JSON，格式: {\"importance\": 数字, \"themes\": [\"...\"], \"summary\": \"...\"}"
        )
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=json.dumps({
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 256,
                "messages": [{"role": "user", "content": prompt}],
            }).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        text = (data.get("content") or [{}])[0].get("text", "")
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            return None
        return json.loads(m.group(0))
    except Exception as e:
        print(f"[warn] claude filter failed: {e}", file=sys.stderr)
        return None


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    use_filter = bool(api_key)
    print(f"[info] AI filter: {'enabled' if use_filter else 'disabled (no API key)'}")

    out = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "filter": "ai" if use_filter else "raw",
        "signals": [],
    }
    total_raw = 0
    for src in SOURCES:
        items = fetch_rss(src["url"])
        total_raw += len(items)
        for it in items:
            sig = {
                "source": src["name"],
                "title": it["title"],
                "link": it["link"],
                "pubDate": it["pubDate"],
                "summary": it["summary"],
                "themes": list(src["themes"]),
                "importance": 3,
            }
            if use_filter:
                ai = call_claude_filter(api_key, it, src["themes"])
                if ai:
                    sig["importance"] = int(ai.get("importance", 3))
                    sig["themes"] = ai.get("themes", src["themes"]) or src["themes"]
                    if ai.get("summary"):
                        sig["aiSummary"] = ai["summary"]
            # 仅展示重要性 >= 4 的信号（PRD 要求）
            if sig["importance"] >= 4 or not use_filter:
                out["signals"].append(sig)

    out_dir = os.path.join("public", "signals")
    os.makedirs(out_dir, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = os.path.join(out_dir, f"{today}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    # 同时写一份 latest.json 方便前端读取
    latest_path = os.path.join(out_dir, "latest.json")
    with open(latest_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"[done] raw={total_raw} kept={len(out['signals'])} -> {path}")


if __name__ == "__main__":
    main()
