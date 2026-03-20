#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""정성도 순위와 번호 생성 기준의 상관계수 계산"""

import sys
import io
from pathlib import Path
import openpyxl
import json
from collections import defaultdict

# UTF-8 출력 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 프로젝트 루트 경로
BASE_DIR = Path(__file__).parent.parent
SOURCE_DIR = BASE_DIR / '.source'
XLSX_PATH = SOURCE_DIR / 'Lotto023.xlsx'
JSON_PATH = SOURCE_DIR / 'Lotto645.json'

def load_lotto645_data():
    """Lotto645.json 로드"""
    if not JSON_PATH.exists():
        print(f"오류: {JSON_PATH} 파일이 없습니다.")
        return []
    
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if isinstance(data, dict) and 'games' in data:
        return data['games']
    elif isinstance(data, list):
        return data
    return []

def calculate_win_stats(rounds):
    """당첨 통계 계산"""
    win_map = defaultdict(int)
    for r in rounds:
        if not r.get('numbers') or len(r.get('numbers', [])) < 6:
            continue
        for n in r['numbers'][:6]:
            win_map[n] += 1
    return win_map

def calculate_appearance_stats(rounds):
    """출현 통계 계산"""
    app_map = defaultdict(int)
    for r in rounds:
        if not r.get('numbers') or len(r.get('numbers', [])) < 6:
            continue
        for n in r['numbers'][:6]:
            app_map[n] += 1
    return app_map

def calculate_consecutive_stats(rounds):
    """연속 출현 통계 계산"""
    seq_map = defaultdict(int)
    for r in rounds:
        if not r.get('numbers') or len(r.get('numbers', [])) < 6:
            continue
        nums = sorted([int(n) for n in r['numbers'][:6] if 1 <= int(n) <= 45])
        if len(nums) != 6:
            continue
        for i in range(len(nums) - 1):
            if nums[i+1] - nums[i] == 1:
                seq_map[nums[i]] += 1
                seq_map[nums[i+1]] += 1
    return seq_map

def sort_and_split_hot_cold(win_map, app_map, seq_map):
    """핫/콜 분할 (JavaScript와 동일한 로직)"""
    scores = {}
    for n in range(1, 46):
        w = win_map.get(n, 0)
        a = app_map.get(n, 0)
        s = seq_map.get(n, 0)
        # JavaScript: score = (w * 3) + (a * 1) + (s * 2)
        scores[n] = (w * 3) + (a * 1) + (s * 2)
    
    sorted_nums = sorted(scores.items(), key=lambda x: (-x[1], x[0]))
    hot = [n for n, _ in sorted_nums[:22]]
    cold = [n for n, _ in sorted_nums[22:]]
    return {'hot': hot, 'cold': cold}

def get_hot_cold_before_round(round_num, all_645_data):
    """해당 회차 이전 데이터로 핫/콜 계산"""
    filtered = [r for r in all_645_data if r.get('round', 0) < round_num]
    if not filtered:
        return {'hot': [], 'cold': []}
    win_map = calculate_win_stats(filtered)
    app_map = calculate_appearance_stats(filtered)
    seq_map = calculate_consecutive_stats(filtered)
    return sort_and_split_hot_cold(win_map, app_map, seq_map)

def calculate_ac(numbers):
    """AC값 계산"""
    diffs = set()
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            diffs.add(abs(numbers[j] - numbers[i]))
    return len(diffs) - 5

def calculate_pending_score(game, round_num, all_645_data):
    """정성도 점수 계산 (JavaScript와 동일)"""
    if not game or not game.get('numbers') or len(game.get('numbers', [])) != 6:
        return {'hotMatch': 0, 'sumDist': 999999, 'oddEvenDist': 999, 'acDist': 999, 'score': 0}
    
    nums = [int(n) for n in game['numbers'][:6] if 1 <= int(n) <= 45]
    if len(nums) != 6 or len(set(nums)) != 6:
        return {'hotMatch': 0, 'sumDist': 999999, 'oddEvenDist': 999, 'acDist': 999, 'score': 0}
    
    # 핫 일치
    hc = get_hot_cold_before_round(round_num, all_645_data)
    hot_set = set(hc['hot'])
    hot_match = len([n for n in nums if n in hot_set])
    
    # 통계 데이터
    stat_rounds = [r for r in all_645_data if r.get('round', 0) < round_num and r.get('numbers') and len(r.get('numbers', [])) >= 6]
    
    # 평균합
    ref_avg = 138.0
    if stat_rounds:
        sums = []
        for r in stat_rounds:
            ns = [int(n) for n in r['numbers'][:6] if 1 <= int(n) <= 45]
            if len(ns) == 6:
                sums.append(sum(ns))
        if sums:
            ref_avg = sum(sums) / len(sums)
    
    game_sum = sum(nums)
    sum_dist = abs(game_sum - ref_avg)
    
    # 홀짝 평균
    ref_odd_avg = 3.0
    if stat_rounds:
        odd_counts = []
        for r in stat_rounds:
            ns = [int(n) for n in r['numbers'][:6] if 1 <= int(n) <= 45]
            if len(ns) == 6:
                odd_counts.append(len([n for n in ns if n % 2 == 1]))
        if odd_counts:
            ref_odd_avg = sum(odd_counts) / len(odd_counts)
    
    game_odd = len([n for n in nums if n % 2 == 1])
    odd_even_dist = abs(game_odd - ref_odd_avg)
    
    # AC 평균
    ref_ac_avg = 5.0
    if stat_rounds:
        acs = []
        for r in stat_rounds:
            ns = [int(n) for n in r['numbers'][:6] if 1 <= int(n) <= 45]
            if len(ns) == 6:
                acs.append(calculate_ac(ns))
        if acs:
            ref_ac_avg = sum(acs) / len(acs)
    
    game_ac = calculate_ac(nums)
    ac_dist = abs(game_ac - ref_ac_avg)
    
    # 점수 계산
    score = (hot_match * 100) - (sum_dist * 0.5) - (odd_even_dist * 10) - (ac_dist * 5)
    
    return {
        'hotMatch': hot_match,
        'sumDist': sum_dist,
        'oddEvenDist': odd_even_dist,
        'acDist': ac_dist,
        'score': score
    }

def calculate_correlation():
    """상관계수 계산"""
    # 데이터 로드
    all_645_data = load_lotto645_data()
    if not all_645_data:
        print("오류: Lotto645 데이터를 로드할 수 없습니다.")
        return
    
    # Lotto023 로드
    if not XLSX_PATH.exists():
        print(f"오류: {XLSX_PATH} 파일이 없습니다.")
        return
    
    wb = openpyxl.load_workbook(XLSX_PATH)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    
    if not rows:
        print("오류: 데이터가 없습니다.")
        return
    
    headers = [str(h) if h is not None else '' for h in rows[0]]
    try:
        idx_round = headers.index('회차')
        idx_pick1 = headers.index('선택1') if '선택1' in headers else None
        idx_pick2 = headers.index('선택2') if '선택2' in headers else None
        idx_pick3 = headers.index('선택3') if '선택3' in headers else None
        idx_pick4 = headers.index('선택4') if '선택4' in headers else None
        idx_pick5 = headers.index('선택5') if '선택5' in headers else None
        idx_pick6 = headers.index('선택6') if '선택6' in headers else None
    except ValueError as e:
        print(f"오류: 필요한 컬럼을 찾을 수 없습니다: {e}")
        return
    
    # 미추첨 게임만 필터링 (추첨 완료된 회차는 제외)
    games_data = []
    for row in rows[1:]:
        try:
            round_num = int(str(row[idx_round]).strip()) if row[idx_round] else 0
            if round_num == 0:
                continue
            
            # 해당 회차가 추첨되었는지 확인
            drawn = any(r.get('round') == round_num for r in all_645_data)
            if drawn:
                continue  # 추첨 완료된 회차는 제외
            
            # 번호 추출
            numbers = []
            for idx in [idx_pick1, idx_pick2, idx_pick3, idx_pick4, idx_pick5, idx_pick6]:
                if idx is not None and row[idx] is not None:
                    try:
                        n = int(str(row[idx]).strip())
                        if 1 <= n <= 45:
                            numbers.append(n)
                    except (ValueError, TypeError):
                        pass
            
            if len(numbers) == 6 and len(set(numbers)) == 6:
                games_data.append({
                    'round': round_num,
                    'numbers': sorted(numbers)
                })
        except Exception as e:
            continue
    
    if len(games_data) < 2:
        print(f"미추첨 게임이 {len(games_data)}개뿐입니다. 상관계수 계산을 위해서는 최소 2개 이상 필요합니다.")
        return
    
    # 각 게임의 정성도 점수 계산
    scores = []
    for game in games_data:
        score_info = calculate_pending_score(
            {'numbers': game['numbers']},
            game['round'],
            all_645_data
        )
        scores.append({
            'round': game['round'],
            'numbers': game['numbers'],
            'score': score_info['score'],
            'hotMatch': score_info['hotMatch'],
            'sumDist': score_info['sumDist'],
            'oddEvenDist': score_info['oddEvenDist'],
            'acDist': score_info['acDist']
        })
    
    # 정성도 점수로 정렬하여 순위 부여
    scores_sorted = sorted(scores, key=lambda x: -x['score'])
    
    # 순위 부여 (점수 높은 순 = 순위 낮은 순)
    for i, item in enumerate(scores_sorted):
        item['rank'] = i + 1
    
    # round와 numbers 조합으로 고유 키 생성하여 순위 매핑
    def make_key(s):
        return (s['round'], tuple(s['numbers']))
    
    key_to_rank = {make_key(s): s['rank'] for s in scores_sorted}
    
    # 원본 scores에 순위 추가
    for s in scores:
        key = make_key(s)
        s['rank'] = key_to_rank.get(key, len(scores) + 1)
    
    # 상관계수 계산 (여러 지표)
    hot_matches = [s['hotMatch'] for s in scores]
    sum_dists = [s['sumDist'] for s in scores]
    odd_even_dists = [s['oddEvenDist'] for s in scores]
    ac_dists = [s['acDist'] for s in scores]
    score_values = [s['score'] for s in scores]
    ranks = [s['rank'] for s in scores]
    
    def pearson_corr(x, y):
        """피어슨 상관계수 계산"""
        n = len(x)
        if n < 2:
            return None
        mean_x = sum(x) / n
        mean_y = sum(y) / n
        numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        denom_x = sum((xi - mean_x) ** 2 for xi in x)
        denom_y = sum((yi - mean_y) ** 2 for yi in y)
        if denom_x == 0 or denom_y == 0:
            return None
        return numerator / ((denom_x ** 0.5) * (denom_y ** 0.5))
    
    # 1. 핫 일치 수와 정성도 점수의 상관계수
    corr_hot_score = pearson_corr(hot_matches, score_values)
    
    # 2. 평균합 거리와 정성도 점수의 상관계수 (거리가 작을수록 점수 높음 → 음의 상관)
    corr_sum_score = pearson_corr(sum_dists, score_values)
    
    # 3. 홀짝 거리와 정성도 점수의 상관계수 (거리가 작을수록 점수 높음 → 음의 상관)
    corr_odd_even_score = pearson_corr(odd_even_dists, score_values)
    
    # 4. AC 거리와 정성도 점수의 상관계수 (거리가 작을수록 점수 높음 → 음의 상관)
    corr_ac_score = pearson_corr(ac_dists, score_values)
    
    # 5. 핫 일치 수와 정성도 순위의 상관계수 (순위는 낮을수록 좋으므로 음수로 변환)
    ranks_inv = [-r for r in ranks]  # 순위를 역으로 (높은 순위 = 높은 값)
    corr_hot_rank = pearson_corr(hot_matches, ranks_inv)
    
    # 6. 정성도 점수와 순위의 상관계수 (검증용)
    corr_score_rank = pearson_corr(score_values, ranks_inv)
    
    print(f"\n=== 정성도 순위와 번호 생성 기준 상관계수 분석 ===\n")
    print(f"분석 대상: 미추첨 게임 {len(games_data)}개\n")
    print("【정성도 점수 구성 요소별 상관계수】\n")
    
    def print_corr(name, corr, is_negative_expected=False):
        """상관계수 출력 헬퍼"""
        if corr is None:
            return
        sign = "음의" if corr < 0 else "양의"
        abs_corr = abs(corr)
        if abs_corr > 0.7:
            strength = "매우 강한"
        elif abs_corr > 0.5:
            strength = "강한"
        elif abs_corr > 0.3:
            strength = "중간"
        else:
            strength = "약한"
        
        expected_note = ""
        if is_negative_expected:
            if corr < 0:
                expected_note = " (예상대로 음의 상관: 거리가 작을수록 점수 높음)"
            else:
                expected_note = " (주의: 양의 상관, 예상과 반대)"
        
        print(f"  {name}: {corr:.4f} ({strength} {sign} 상관관계){expected_note}")
    
    print_corr("1. 핫 일치 수", corr_hot_score)
    print_corr("2. 평균합 거리", corr_sum_score, is_negative_expected=True)
    print_corr("3. 홀짝 거리", corr_odd_even_score, is_negative_expected=True)
    print_corr("4. AC 거리", corr_ac_score, is_negative_expected=True)
    
    print("\n【정성도 순위와의 상관계수】\n")
    print_corr("5. 핫 일치 수와 순위", corr_hot_rank)
    
    if corr_score_rank is not None:
        print(f"\n【검증】\n")
        print(f"  정성도 점수와 순위의 상관계수: {corr_score_rank:.4f} (1에 가까울수록 정확)\n")
    
    # 상세 통계
    mean_hot = sum(hot_matches) / len(hot_matches) if hot_matches else 0
    mean_rank = sum(ranks) / len(ranks) if ranks else 0
    mean_score = sum(score_values) / len(score_values) if score_values else 0
    mean_sum_dist = sum(sum_dists) / len(sum_dists) if sum_dists else 0
    mean_odd_even_dist = sum(odd_even_dists) / len(odd_even_dists) if odd_even_dists else 0
    mean_ac_dist = sum(ac_dists) / len(ac_dists) if ac_dists else 0
    
    print("【상세 통계】\n")
    print("  핫 일치 수:")
    print(f"    - 평균: {mean_hot:.2f}개")
    print(f"    - 범위: {min(hot_matches)} ~ {max(hot_matches)}개")
    print(f"  평균합 거리:")
    print(f"    - 평균: {mean_sum_dist:.2f}")
    print(f"    - 범위: {min(sum_dists):.1f} ~ {max(sum_dists):.1f}")
    print(f"  홀짝 거리:")
    print(f"    - 평균: {mean_odd_even_dist:.2f}")
    print(f"    - 범위: {min(odd_even_dists):.2f} ~ {max(odd_even_dists):.2f}")
    print(f"  AC 거리:")
    print(f"    - 평균: {mean_ac_dist:.2f}")
    print(f"    - 범위: {min(ac_dists):.2f} ~ {max(ac_dists):.2f}")
    print(f"  정성도 점수:")
    print(f"    - 평균: {mean_score:.2f}")
    print(f"    - 범위: {min(score_values):.1f} ~ {max(score_values):.1f}")
    print(f"  정성도 순위:")
    print(f"    - 평균: {mean_rank:.2f}")
    print(f"    - 범위: {min(ranks)} ~ {max(ranks)}\n")
    
    # 샘플 데이터 (상위 5개, 하위 5개)
    print("정성도 순위 상위 5개:")
    for i, s in enumerate(scores_sorted[:5], 1):
        print(f"  {i}. 회차 {s['round']}: 핫 {s['hotMatch']}개, 점수 {s['score']:.1f}, 순위 {s['rank']}")
    
    print("\n정성도 순위 하위 5개:")
    for i, s in enumerate(scores_sorted[-5:], 1):
        print(f"  {i}. 회차 {s['round']}: 핫 {s['hotMatch']}개, 점수 {s['score']:.1f}, 순위 {s['rank']}")

if __name__ == '__main__':
    calculate_correlation()
