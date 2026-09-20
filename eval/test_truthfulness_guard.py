#!/usr/bin/env python
"""Measure the truthfulness guard on labelled cases. Zero API calls.

The guard is deterministic code, so its behaviour is measured directly rather
than by generating CVs and counting what came out. That gives a false-negative
count -- unsupported claims that survive -- which is the number that matters:
a miss puts a false claim on a CV a human then sends to an employer.

    python eval/test_truthfulness_guard.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "eval"))

from guard_cases import CASES, EXTRA_CASES, CV_TEXT                       # noqa: E402
from services.ai_service import _has_evidence, _normalize, _words   # noqa: E402


def measure(cases, label):
    cv_norm = _normalize(CV_TEXT)
    cv_words = _words(cv_norm)

    tp = fp = tn = fn = 0
    false_blocks, misses = [], []

    for name, importance, status, evidence, supported in cases:
        req = {"name": name, "importance": importance, "status": status,
               "evidence": evidence}
        kept = _has_evidence(req, cv_norm, cv_words)
        blocked = not kept

        if not supported and blocked:
            tp += 1                                  # correctly blocked
        elif not supported and not blocked:
            fn += 1                                  # MISS: false claim survives
            misses.append((name, evidence))
        elif supported and not blocked:
            tn += 1                                  # correctly kept
        else:
            fp += 1                                  # false block: real skill dropped
            false_blocks.append((name, evidence))

    n_unsup = tp + fn
    n_sup = tn + fp
    recall = tp / n_unsup if n_unsup else 0
    precision = tp / (tp + fp) if (tp + fp) else 0
    accuracy = (tp + tn) / len(cases)

    print(f"\n{label}: {len(cases)} labelled claims "
          f"({n_unsup} unsupported, {n_sup} genuinely supported)\n")
    print(f"  blocked correctly (unsupported caught) : {tp}/{n_unsup}"
          f"   recall {100*recall:.1f}%")
    print(f"  kept correctly (supported preserved)   : {tn}/{n_sup}")
    print(f"  MISSED (false claim survives)          : {fn}")
    print(f"  false blocks (real skill dropped)      : {fp}")
    print(f"  precision {100*precision:.1f}%   accuracy {100*accuracy:.1f}%")

    if misses:
        print("\n  misses -- unsupported claims the guard let through:")
        for n, e in misses:
            print(f"      {n:<15s} claimed evidence: {e!r}")
    if false_blocks:
        print("\n  false blocks -- real skills the guard dropped:")
        for n, e in false_blocks:
            print(f"      {n:<15s} claimed evidence: {e!r}")

    out = {"label": label, "n_cases": len(cases), "n_unsupported": n_unsup, "n_supported": n_sup,
           "blocked_correctly": tp, "kept_correctly": tn, "missed": fn,
           "false_blocks": fp, "recall_pct": round(100 * recall, 1),
           "precision_pct": round(100 * precision, 1),
           "accuracy_pct": round(100 * accuracy, 1),
           "miss_detail": misses, "false_block_detail": false_blocks}
    return out


def main():
    results = [measure(CASES, "Original set"),
               measure(EXTRA_CASES, "Extra set (short names, fabricated evidence)"),
               measure(CASES + EXTRA_CASES, "Combined")]
    p = ROOT / "eval" / "guard_results.json"
    p.write_text(json.dumps(results, indent=2))
    print(f"\n-> {p}")
    return results


if __name__ == "__main__":
    main()
