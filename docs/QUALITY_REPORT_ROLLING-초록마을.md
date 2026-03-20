# 롤링 무작위 대조 품질 리포트 (제안 패키지)

## 목적

- **Perfect·통계 적합도**와 **무작위 구매 기준선**을 분리해 해석합니다.
- 최근 W회 각 회차의 **당첨 6개**와, **무작위로 뽑은 티켓**의 일치 개수 분포를 모아 **평균**합니다.  
  (각 회차의 당첨 번호는 해당 회차 평가에만 쓰이며, **미래 회차 당첨을 예측하는 데 쓰지 않습니다**.)

## 실행

프로젝트 루트에서:

```bash
python utils/quality_report_rolling.py
python utils/quality_report_rolling.py --window 104 --per-round-samples 2000
python utils/quality_report_rolling.py --mode parity_mixed --seed 42
python utils/quality_report_rolling.py --json-out .source/quality_baseline.json
```

| 인자 | 기본 | 설명 |
|------|------|------|
| `--lotto645` | `.source/Lotto645.json` | 당첨 데이터 |
| `--window` | `104` | 평가할 **최근** 회차 수 (`0`이면 전체) |
| `--per-round-samples` | `2000` | 회차당 무작위 티켓 수 |
| `--mode` | `unconstrained` | `unconstrained` 또는 `parity_mixed`(홀 개수 2·3·4) |
| `--seed` | `42` | 재현용 시드 |
| `--json-out` | 없음 | 결과 JSON 저장 |

## 해석

- **mean_match_count**: 무작위 6개일 때 당첨 6개와 겹치는 개수의 평균(이론값에 가깝게 나오는지 확인).
- **p_at_least_k**: 무작위 티켓이 당첨과 **k개 이상** 일치할 비율(참고).
- 앱에서 생성·저장한 조합의 **별도 백테스트**와 비교하려면, 동일 `window`·동일 무작위 모드로 **샘플 수를 맞춘 뒤** 분포를 나란히 보는 방식이 합리적입니다.

## 고지

과거 구간에 대한 **통계·시뮬레이션**일 뿐이며, **미래 당첨을 보장하거나 확률을 올려 주지 않습니다.**

## 관련 문서

- `docs/PERFECT_AND_QUALITY.md` — Perfect 정렬과의 관계
