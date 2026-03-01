#!/usr/bin/env python3
"""
SmartGuide — Bulk Knowledge Ingest Script
=========================================
Reads all .txt, .md, .pdf, and .json files from the knowledge/ folder
and ingests them into ChromaDB via the SmartGuide /ingest API.

Usage:
    # Ingest all domains
    python scripts/ingest_knowledge.py

    # Ingest a single domain folder
    python scripts/ingest_knowledge.py --domain "Data Engineering"

    # Use a different SmartGuide URL
    python scripts/ingest_knowledge.py --url http://localhost:8080

Folder → Domain mapping (folder name → API domain name):
    knowledge/Data_Engineering  →  "Data Engineering"
    knowledge/AI_ML             →  "AI / ML"
    knowledge/DSA               →  "DSA"
    etc.  (edit FOLDER_TO_DOMAIN below to customise)
"""
import argparse
import os
import sys
import requests

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "knowledge")
SMARTGUIDE_URL = "http://localhost:8080"

# Map folder name → API domain name (must match DOMAIN_RULES in Django api.py)
FOLDER_TO_DOMAIN = {
    "Data_Engineering": "Data Engineering",
    "AI_ML":            "AI / ML",
    "DSA":              "DSA",
    "Cloud_DevOps":     "Cloud / DevOps",
    "Full_Stack":       "Full Stack",
    "Embedded":         "Embedded Engineer",
    "Cyber_Security":   "Cyber Security",
    "Networking":       "Networking",
    "Electronics":      "Electronics",
    "Data_Science":     "Data Science",
}

CHUNK_SIZE = 500   # characters per chunk
OVERLAP_WORDS = 20  # word overlap between consecutive chunks


# ── Text chunking ──────────────────────────────────────────────────────────────

def chunk_by_paragraph(text: str, source: str, domain: str) -> list[dict]:
    """Split text on blank lines; each paragraph → one chunk."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return [{"text": p, "source": source, "topic": ""} for p in paragraphs]


def chunk_words(text: str, source: str, domain: str) -> list[dict]:
    """Fixed-size word-window chunking with overlap (for large files)."""
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk_words_ = words[i: i + 100]
        chunks.append({
            "text": " ".join(chunk_words_),
            "source": source,
            "topic": "",
        })
        i += 100 - OVERLAP_WORDS
    return chunks


# ── File readers ───────────────────────────────────────────────────────────────

def read_txt(path: str) -> str:
    with open(path, encoding="utf-8", errors="ignore") as f:
        return f.read()


def read_pdf(path: str) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        print(f"  ⚠  pypdf not installed — skipping {path}. Run: pip install pypdf")
        return ""
    reader = PdfReader(path)
    return "\n\n".join(page.extract_text() or "" for page in reader.pages)


def read_json(path: str) -> str:
    import json
    with open(path) as f:
        data = json.load(f)
    if isinstance(data, list):
        return "\n\n".join(item.get("text", str(item)) for item in data)
    return str(data)


# ── Ingest one folder ──────────────────────────────────────────────────────────

def ingest_folder(folder_path: str, domain: str, base_url: str):
    total = 0
    for filename in sorted(os.listdir(folder_path)):
        filepath = os.path.join(folder_path, filename)
        if not os.path.isfile(filepath):
            continue

        ext = os.path.splitext(filename)[1].lower()
        if ext == ".md":
            ext = ".txt"  # treat markdown as plain text

        if ext == ".txt":
            text = read_txt(filepath)
        elif ext == ".pdf":
            text = read_pdf(filepath)
        elif ext == ".json":
            text = read_json(filepath)
        else:
            continue  # skip unsupported files

        if not text.strip():
            continue

        chunks = chunk_by_paragraph(text, source=filename, domain=domain)
        if not chunks:
            continue

        payload = {"domain": domain, "chunks": chunks}
        try:
            r = requests.post(f"{base_url}/ingest", json=payload, timeout=30)
            r.raise_for_status()
            result = r.json()
            n = result.get("chunks_ingested", len(chunks))
            total_db = result.get("collection_total", "?")
            print(f"  ✅  {filename}: {n} chunks → DB total: {total_db}")
            total += n
        except Exception as e:
            print(f"  ❌  {filename}: {e}")

    return total


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Ingest knowledge files into SmartGuide RAG")
    parser.add_argument("--domain", default=None, help="Only ingest this domain (folder name)")
    parser.add_argument("--url", default=SMARTGUIDE_URL, help="SmartGuide base URL")
    args = parser.parse_args()

    knowledge_dir = os.path.abspath(KNOWLEDGE_DIR)
    if not os.path.isdir(knowledge_dir):
        print(f"❌  knowledge/ folder not found at: {knowledge_dir}")
        sys.exit(1)

    # Check SmartGuide is reachable
    try:
        requests.get(f"{args.url}/health", timeout=5)
    except Exception:
        print(f"❌  SmartGuide not reachable at {args.url}. Is it running?")
        sys.exit(1)

    grand_total = 0
    for folder_name, domain_name in FOLDER_TO_DOMAIN.items():
        if args.domain and args.domain.lower() not in (folder_name.lower(), domain_name.lower()):
            continue

        folder_path = os.path.join(knowledge_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue

        files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
        if not files:
            continue

        print(f"\n📂  {domain_name}  ({folder_name})  — {len(files)} file(s)")
        n = ingest_folder(folder_path, domain=domain_name, base_url=args.url)
        grand_total += n

    print(f"\n🎉  Done. Total chunks ingested this run: {grand_total}")
    print(f"📊  Check stats: {args.url}/ingest/stats")


if __name__ == "__main__":
    main()
