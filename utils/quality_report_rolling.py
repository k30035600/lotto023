# -*- coding: utf-8 -*-
"""
롤링 품질 리포트 (제안 패키지 수용)

- 최근 W회(기본 104)에 대해, 각 회차 t의 당첨 6개와 비교할 때
  **t회 추첨 이후 데이터는 사용하지 않음** (당첨 번호만 t에서 사용).
- 무작위 조합을 R회(기본 회차당 2,000)씩 뽑아 일치 개수(0~6) 분포를 구하고,
  회차별 결과를 **평균**하여 기준선(baseline)을 제시합니다.

모드:
  unconstrained     — 1~45 중 6개 무작위(비복원)
  parity_mixed      — 매 티켓마다 홀 수를 2·3·4 중 하나로 두고 유효 조합만 추출(옵션필터 완화 대응)

출력: 콘솔 요약 + 선택 시 JSON

주의: 이 분포는 「무작위 구매 시 과거에 몇 개나 맞췄을지」 참고용이며,
      미래 당첨을 예측하거나 보장하지 않습니다.
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from collections import defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DEFAULT_645 = BASE / ".source" / "Lotto645.json"

ODDS = list(range(1, 46, 2))
EVENS = list(range(2, 46, 2))


def load_rounds(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    out = []
    for item in raw:
        rno = int(item["회차"])
        nums = [int(item[f"번호{i}"]) for i in range(1, 7)]
        out.append({"round": rno, "numbers": nums})
    out.sort(key=lambda x: x["round"])
    return out


def random_ticket_unconstrained(rng: random.Random) -> list[int]:
    return sorted(rng.sample(range(1, 46), 6))


def random_ticket_k_odd(rng: random.Random, k: int) -> list[int]:
    if k < 0 or k > 6 or k > len(ODDS) or (6 - k) > len(EVENS):
        return random_ticket_unconstrained(rng)
    o = rng.sample(ODDS, k)
    e = rng.sample(EVENS, 6 - k)
    return sorted(o + e)


def random_ticket_parity_mixed(rng: random.Random) -> list[int]:
    k = rng.choice((2, 3, 4))
    return random_ticket_k_odd(rng, k)


def match_count(ticket: list[int], win: list[int]) -> int:
    return len(set(ticket) & set(win))


def run_baseline(
    rounds: list[dict],
    window: int,
    per_round_samples: int,
    mode: str,
    seed: int,
) -> dict:
    if len(rounds) < 2:
        raise SystemExit("회차 데이터가 부족합니다.")

    eval_rounds = rounds[-window:] if window > 0 else rounds
    rng = random.Random(seed)

    agg = defaultdict(int)  # k -> count
    total_samples = 0
    sum_matches = 0.0

    for rec in eval_rounds:
        win = rec["numbers"]
        for _ in range(per_round_samples):
            if mode == "unconstrained":
                t = random_ticket_unconstrained(rng)
            elif mode == "parity_mixed":
                t = random_ticket_parity_mixed(rng)
            else:
                raise ValueError(mode)
            m = match_count(t, win)
            agg[m] += 1
            sum_matches += m
            total_samples += 1

    dist = {str(k): agg.get(k, 0) for k in range(7)}
    mean_m = sum_matches / total_samples if total_samples else 0.0
    p_at_least = {}
    for thr in (3, 4, 5, 6):
        p_at_least[str(thr)] = sum(agg.get(k, 0) for k in range(thr, 7)) / total_samples

    return {
        "eval_round_from": eval_rounds[0]["round"],
        "eval_round_to": eval_rounds[-1]["round"],
        "eval_round_count": len(eval_rounds),
        "per_round_samples": per_round_samples,
        "total_random_samples": total_samples,
        "mode": mode,
        "seed": seed,
        "mean_match_count": round(mean_m, 6),
        "match_histogram": dist,
        "p_at_least_k": {k: round(v, 8) for k, v in p_at_least.items()},
    }


def main():
    ap = argparse.ArgumentParser(description="롤링 무작위 대조 품질 리포트")
    ap.add_argument(
        "--lotto645",
        type=Path,
        default=DEFAULT_645,
        help="Lotto645.json 경로",
    )
    ap.add_argument("--window", type=int, default=104, help="평가할 최근 회차 수 (0=전체)")
    ap.add_argument("--per-round-samples", type=int, default=2000, help="회차당 무작위 티켓 수")
    ap.add_argument(
        "--mode",
        choices=("unconstrained", "parity_mixed"),
        default="unconstrained",
        help="무작위 조합 모드",
    )
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--json-out", type=Path, default=None, help="결과 JSON 저장 경로")
    args = ap.parse_args()

    path_645 = args.lotto645
    if not path_645.exists():
        print("파일 없음:", path_645, file=sys.stderr)
        sys.exit(1)

    rounds = load_rounds(path_645)
    w = args.window if args.window > 0 else len(rounds)

    result = run_baseline(
        rounds,
        window=min(w, len(rounds)),
        per_round_samples=args.per_round_samples,
        mode=args.mode,
        seed=args.seed,
    )
    result["645_path"] = str(path_645.resolve())

    # 콘솔 (UTF-8)
    print("=== Lotto645 롤링 무작위 대조 리포트 ===")
    print(f"데이터: {result['645_path']}")
    print(
        f"평가 구간: {result['eval_round_from']}~{result['eval_round_to']} "
        f"({result['eval_round_count']}회)"
    )
    print(f"모드: {result['mode']}, seed={result['seed']}")
    print(
        f"회차당 샘플 {result['per_round_samples']} → 총 무작위 티켓 {result['total_random_samples']}"
    )
    print(f"평균 일치 개수(무작위): {result['mean_match_count']}")
    print("일치 k개 비율:", end=" ")
    total = result["total_random_samples"]
    hist = result["match_histogram"]
    parts = [f"k={k}:{int(hist[str(k)])/total:.4f}" for k in range(7)]
    print(", ".join(parts))
    print("P(일치>=k):", result["p_at_least_k"])
    print()
    print(
        "※ 과거 구간에 대한 무작위 기준선입니다. B of B·통계 적합도와는 별개이며, "
        "미래 당첨을 보장하지 않습니다."
    )

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print("\nJSON 저장:", args.json_out.resolve())


if __name__ == "__main__":
    main()
