#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""필터 우선순위 분석: min/max 합계 범위 내에서 홀짝/핫콜/AC 필터 적용 순서 최적화"""

import sys
import io
from pathlib import Path
import json
from collections import Counter
import random
import math

# UTF-8 출력 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 프로젝트 루트 경로
BASE_DIR = Path(__file__).parent.parent
SOURCE_DIR = BASE_DIR / '.source'
JSON_PATH = SOURCE_DIR / 'Lotto645.json'

def extract_numbers_from_round(r):
    """회차 데이터에서 번호 추출"""
    numbers = []
    for i in range(1, 7):
        key = f'번호{i}'
        if key in r and r[key] is not None:
            try:
                n = int(r[key])
                if 1 <= n <= 45:
                    numbers.append(n)
            except (ValueError, TypeError):
                pass
    return sorted(numbers) if len(numbers) == 6 else []

def get_round_number(r):
    """회차 번호 추출"""
    if 'round' in r:
        val = r['round']
        if isinstance(val, (int, float)):
            return int(val)
        elif isinstance(val, str):
            try:
                return int(val.strip())
            except:
                pass
    if '회차' in r:
        val = r['회차']
        if isinstance(val, (int, float)):
            return int(val)
        elif isinstance(val, str):
            try:
                return int(val.strip())
            except:
                pass
    return 0

def calculate_ac(numbers):
    """AC값 계산"""
    diffs = set()
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            diffs.add(abs(numbers[j] - numbers[i]))
    return len(diffs) - 5

def calculate_win_stats(rounds):
    """당첨 통계 계산"""
    from collections import defaultdict
    win_map = defaultdict(int)
    for r in rounds:
        nums = extract_numbers_from_round(r)
        if len(nums) == 6:
            for n in nums:
                win_map[n] += 1
    return win_map

def calculate_appearance_stats(rounds):
    """출현 통계 계산"""
    from collections import defaultdict
    app_map = defaultdict(int)
    for r in rounds:
        nums = extract_numbers_from_round(r)
        if len(nums) == 6:
            for n in nums:
                app_map[n] += 1
    return app_map

def calculate_consecutive_stats(rounds):
    """연속 출현 통계 계산"""
    from collections import defaultdict
    seq_map = defaultdict(int)
    for r in rounds:
        nums = extract_numbers_from_round(r)
        if len(nums) == 6:
            for i in range(len(nums) - 1):
                if nums[i+1] - nums[i] == 1:
                    seq_map[nums[i]] += 1
                    seq_map[nums[i+1]] += 1
    return seq_map

def sort_and_split_hot_cold(win_map, app_map, seq_map):
    """핫/콜 분할"""
    scores = {}
    for n in range(1, 46):
        w = win_map.get(n, 0)
        a = app_map.get(n, 0)
        s = seq_map.get(n, 0)
        scores[n] = (w * 3) + (a * 1) + (s * 2)
    
    sorted_nums = sorted(scores.items(), key=lambda x: (-x[1], x[0]))
    hot = [n for n, _ in sorted_nums[:22]]
    cold = [n for n, _ in sorted_nums[22:]]
    return {'hot': hot, 'cold': cold}

def get_hot_cold_before_round(round_num, all_645_data):
    """해당 회차 이전 데이터로 핫/콜 계산"""
    filtered = [r for r in all_645_data if get_round_number(r) < round_num]
    if not filtered:
        return {'hot': [], 'cold': []}
    win_map = calculate_win_stats(filtered)
    app_map = calculate_appearance_stats(filtered)
    seq_map = calculate_consecutive_stats(filtered)
    return sort_and_split_hot_cold(win_map, app_map, seq_map)

def generate_with_filter_order(sum_min, sum_max, filter_order, target_round, all_645_data, max_attempts=10000):
    """특정 필터 순서로 번호 생성 시도"""
    hc = get_hot_cold_before_round(target_round, all_645_data)
    hot_set = set(hc['hot'])
    cold_set = set(hc['cold'])
    
    # 통계 계산
    stat_rounds = [r for r in all_645_data if get_round_number(r) < target_round and len(extract_numbers_from_round(r)) == 6]
    
    # 평균 홀수 개수
    ref_odd_avg = 3.0
    if stat_rounds:
        odd_counts = []
        for r in stat_rounds:
            ns = extract_numbers_from_round(r)
            if len(ns) == 6:
                odd_counts.append(len([n for n in ns if n % 2 == 1]))
        if odd_counts:
            ref_odd_avg = sum(odd_counts) / len(odd_counts)
    
    # 평균 AC값
    ref_ac_avg = 8.0
    if stat_rounds:
        acs = []
        for r in stat_rounds:
            ns = extract_numbers_from_round(r)
            if len(ns) == 6:
                ac_val = calculate_ac(ns)
                if ac_val > 5:
                    acs.append(ac_val)
        if acs:
            ref_ac_avg = sum(acs) / len(acs)
    
    # 목표값 설정
    target_hot = 3
    target_cold = 3
    target_odd = round(ref_odd_avg)
    target_even = 6 - target_odd
    target_ac = round(ref_ac_avg)
    
    success_count = 0
    total_attempts = 0
    
    for attempt in range(max_attempts):
        total_attempts += 1
        
        # 랜덤 선택
        pool = list(range(1, 46))
        random.shuffle(pool)
        selected = sorted(pool[:6])
        
        # 합계 체크
        num_sum = sum(selected)
        if num_sum < sum_min or num_sum > sum_max:
            continue
        
        # 필터 순서대로 적용
        passed = True
        
        for filter_type in filter_order:
            if filter_type == 'hot_cold':
                hot_count = len([n for n in selected if n in hot_set])
                cold_count = len([n for n in selected if n in cold_set])
                if hot_count != target_hot or cold_count != target_cold:
                    passed = False
                    break
            elif filter_type == 'odd_even':
                odd_count = len([n for n in selected if n % 2 == 1])
                even_count = 6 - odd_count
                if odd_count != target_odd or even_count != target_even:
                    passed = False
                    break
            elif filter_type == 'ac':
                ac_val = calculate_ac(selected)
                if ac_val <= 5:
                    passed = False
                    break
                if abs(ac_val - target_ac) > 2:  # AC값이 목표에서 너무 멀면
                    passed = False
                    break
        
        if passed:
            success_count += 1
            if success_count >= 100:  # 100개 성공하면 충분
                break
    
    success_rate = (success_count / total_attempts) * 100 if total_attempts > 0 else 0
    return success_count, total_attempts, success_rate

def analyze_filter_priority():
    """필터 우선순위 분석"""
    # 데이터 로드
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        all_645_data = json.load(f)
    
    if not all_645_data:
        print("오류: 데이터를 로드할 수 없습니다.")
        return
    
    print("\n=== 필터 우선순위 분석 ===\n")
    
    # 테스트 회차 선택 (최근 회차)
    all_rounds = sorted([get_round_number(r) for r in all_645_data if get_round_number(r) > 0], reverse=True)
    test_rounds = all_rounds[:5]  # 최근 5회차
    
    # 합계 범위 설정 (일반적인 범위)
    sum_min = 100
    sum_max = 200
    
    print(f"테스트 조건:")
    print(f"  합계 범위: {sum_min} ~ {sum_max}")
    print(f"  테스트 회차: {test_rounds}\n")
    
    # 필터 조합 순서들
    filter_orders = [
        ['hot_cold', 'odd_even', 'ac'],
        ['hot_cold', 'ac', 'odd_even'],
        ['odd_even', 'hot_cold', 'ac'],
        ['odd_even', 'ac', 'hot_cold'],
        ['ac', 'hot_cold', 'odd_even'],
        ['ac', 'odd_even', 'hot_cold'],
    ]
    
    order_names = {
        'hot_cold': '핫/콜',
        'odd_even': '홀짝',
        'ac': 'AC'
    }
    
    results = []
    
    for filter_order in filter_orders:
        order_str = ' → '.join([order_names[f] for f in filter_order])
        print(f"테스트 중: {order_str}")
        
        total_success = 0
        total_attempts = 0
        
        for target_round in test_rounds:
            success, attempts, rate = generate_with_filter_order(
                sum_min, sum_max, filter_order, target_round, all_645_data, max_attempts=5000
            )
            total_success += success
            total_attempts += attempts
        
        avg_success_rate = (total_success / total_attempts * 100) if total_attempts > 0 else 0
        avg_attempts_per_success = total_attempts / total_success if total_success > 0 else float('inf')
        
        results.append({
            'order': filter_order,
            'order_str': order_str,
            'success_rate': avg_success_rate,
            'attempts_per_success': avg_attempts_per_success,
            'total_success': total_success,
            'total_attempts': total_attempts
        })
        
        print(f"  성공률: {avg_success_rate:.2f}%, 평균 시도 횟수: {avg_attempts_per_success:.1f}회\n")
    
    # 결과 정렬 (성공률 높은 순)
    results.sort(key=lambda x: x['success_rate'], reverse=True)
    
    print("【결과 요약】\n")
    print("순위 | 필터 순서 | 성공률 | 평균 시도 횟수")
    print("-" * 60)
    for idx, r in enumerate(results, 1):
        print(f"{idx:2d}위 | {r['order_str']:20s} | {r['success_rate']:6.2f}% | {r['attempts_per_success']:8.1f}회")
    
    # 최적 순서 분석
    best = results[0]
    print(f"\n【최적 필터 순서】\n")
    print(f"  {best['order_str']}")
    print(f"  성공률: {best['success_rate']:.2f}%")
    print(f"  평균 시도 횟수: {best['attempts_per_success']:.1f}회")
    
    # 각 필터의 특성 분석
    print(f"\n【필터 특성 분석】\n")
    
    # 핫/콜 필터 특성
    print("1. 핫/콜 필터:")
    print("   - 제약 강도: 중간 (22개 핫, 23개 콜)")
    print("   - 목표 비율: 핫3:콜3 (34% 확률)")
    print("   - 실제 분포: 핫3:콜3이 가장 많음")
    print("   - 제약 효과: 번호 풀을 약 50%로 축소")
    
    # 홀짝 필터 특성
    print("\n2. 홀짝 필터:")
    print("   - 제약 강도: 중간 (홀수 23개, 짝수 22개)")
    print("   - 목표 비율: 홀3:짝3 (33.4% 확률)")
    print("   - 실제 분포: 홀3:짝3이 가장 많음")
    print("   - 제약 효과: 번호 풀을 약 50%로 축소")
    
    # AC 필터 특성
    print("\n3. AC 필터:")
    print("   - 제약 강도: 높음 (AC값은 조합 특성)")
    print("   - 목표 값: AC 8 (35% 확률)")
    print("   - 실제 분포: AC 8이 가장 많음")
    print("   - 제약 효과: 조합의 산술적 복잡도 제한")
    print("   - AC 5 이하는 5.85%로 매우 드묾 (배제 필요)")
    
    # 우선순위 추천 근거
    print(f"\n【우선순위 추천 근거】\n")
    
    if best['order'][0] == 'hot_cold':
        print("1순위: 핫/콜 필터")
        print("   - 이유: 번호 풀을 명확하게 2분할하여 후속 필터 적용 시 효율적")
        print("   - 효과: 핫/콜 비율이 정성도 점수에 큰 영향 (hotColdDist 페널티)")
        print("   - 장점: 먼저 적용하면 나머지 필터 조건을 만족하는 조합을 찾기 쉬움")
    elif best['order'][0] == 'odd_even':
        print("1순위: 홀짝 필터")
        print("   - 이유: 번호 풀을 명확하게 2분할하여 후속 필터 적용 시 효율적")
        print("   - 효과: 홀짝 비율이 정성도 점수에 영향 (oddEvenDist)")
        print("   - 장점: 먼저 적용하면 나머지 필터 조건을 만족하는 조합을 찾기 쉬움")
    else:
        print("1순위: AC 필터")
        print("   - 이유: AC값은 조합의 산술적 특성을 나타내므로 먼저 제한")
        print("   - 효과: 극한 조합(AC 5 이하)을 먼저 배제")
        print("   - 장점: 유효한 조합만 남겨서 후속 필터 적용 시 효율적")
    
    print(f"\n2순위: {order_names[best['order'][1]]} 필터")
    print(f"3순위: {order_names[best['order'][2]]} 필터")

if __name__ == '__main__':
    analyze_filter_priority()
