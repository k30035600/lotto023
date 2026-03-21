#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AC 값이 홀짝/핫콜 필터에 주는 영향 분석"""

import sys
import io
from pathlib import Path
import json
from collections import defaultdict, Counter

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
    win_map = defaultdict(int)
    for r in rounds:
        nums = extract_numbers_from_round(r)
        if len(nums) == 6:
            for n in nums:
                win_map[n] += 1
    return win_map

def calculate_appearance_stats(rounds):
    """출현 통계 계산"""
    app_map = defaultdict(int)
    for r in rounds:
        nums = extract_numbers_from_round(r)
        if len(nums) == 6:
            for n in nums:
                app_map[n] += 1
    return app_map

def calculate_consecutive_stats(rounds):
    """연속 출현 통계 계산"""
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

def analyze_ac_impact_on_filters():
    """AC 값이 홀짝/핫콜 필터에 주는 영향 분석"""
    # 데이터 로드
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        all_645_data = json.load(f)
    
    if not all_645_data:
        print("오류: 데이터를 로드할 수 없습니다.")
        return
    
    print("\n=== AC 값이 홀짝/핫콜 필터에 주는 영향 분석 ===\n")
    
    # 최근 100회차 분석
    all_rounds = sorted([get_round_number(r) for r in all_645_data if get_round_number(r) > 0], reverse=True)[:100]
    
    print(f"분석 대상: 최근 100회차 ({min(all_rounds)}회 ~ {max(all_rounds)}회)\n")
    
    # 각 회차별로 분석
    results = []
    
    for round_num in all_rounds:
        # 해당 회차 이전 데이터로 핫/콜 계산
        hc = get_hot_cold_before_round(round_num, all_645_data)
        hot_set = set(hc['hot'])
        cold_set = set(hc['cold'])
        
        # 해당 회차의 당첨 번호
        round_data = next((r for r in all_645_data if get_round_number(r) == round_num), None)
        if not round_data:
            continue
        
        nums = extract_numbers_from_round(round_data)
        if len(nums) != 6:
            continue
        
        # AC 값 계산
        ac_val = calculate_ac(nums)
        
        # 홀짝 비율
        odd_count = len([n for n in nums if n % 2 == 1])
        even_count = 6 - odd_count
        
        # 핫/콜 비율
        hot_count = len([n for n in nums if n in hot_set])
        cold_count = len([n for n in nums if n in cold_set])
        
        results.append({
            'round': round_num,
            'ac': ac_val,
            'odd': odd_count,
            'even': even_count,
            'hot': hot_count,
            'cold': cold_count,
            'numbers': nums
        })
    
    # AC 값별 분석
    print("【1. AC 값별 홀짝 비율 분포】\n")
    
    ac_odd_even = defaultdict(lambda: {'odd': [], 'even': []})
    for r in results:
        ac_odd_even[r['ac']]['odd'].append(r['odd'])
        ac_odd_even[r['ac']]['even'].append(r['even'])
    
    for ac_val in sorted(ac_odd_even.keys()):
        data = ac_odd_even[ac_val]
        if len(data['odd']) == 0:
            continue
        
        avg_odd = sum(data['odd']) / len(data['odd'])
        avg_even = sum(data['even']) / len(data['even'])
        count = len(data['odd'])
        
        # 홀짝 비율 분포
        odd_dist = Counter(data['odd'])
        
        print(f"AC {ac_val} (총 {count}회):")
        print(f"  평균 홀수: {avg_odd:.2f}개, 평균 짝수: {avg_even:.2f}개")
        print(f"  홀짝 비율 분포:")
        for odd_count in sorted(odd_dist.keys()):
            even_count = 6 - odd_count
            ratio_count = odd_dist[odd_count]
            ratio_pct = (ratio_count / count) * 100
            print(f"    홀{odd_count}:짝{even_count}: {ratio_count}회 ({ratio_pct:.1f}%)")
        print()
    
    # AC 값별 핫/콜 비율 분포
    print("【2. AC 값별 핫/콜 비율 분포】\n")
    
    ac_hot_cold = defaultdict(lambda: {'hot': [], 'cold': []})
    for r in results:
        ac_hot_cold[r['ac']]['hot'].append(r['hot'])
        ac_hot_cold[r['ac']]['cold'].append(r['cold'])
    
    for ac_val in sorted(ac_hot_cold.keys()):
        data = ac_hot_cold[ac_val]
        if len(data['hot']) == 0:
            continue
        
        avg_hot = sum(data['hot']) / len(data['hot'])
        avg_cold = sum(data['cold']) / len(data['cold'])
        count = len(data['hot'])
        
        # 핫/콜 비율 분포
        hot_dist = Counter(data['hot'])
        
        print(f"AC {ac_val} (총 {count}회):")
        print(f"  평균 핫: {avg_hot:.2f}개, 평균 콜: {avg_cold:.2f}개")
        print(f"  핫/콜 비율 분포:")
        for hot_count in sorted(hot_dist.keys()):
            cold_count = 6 - hot_count
            ratio_count = hot_dist[hot_count]
            ratio_pct = (ratio_count / count) * 100
            print(f"    핫{hot_count}:콜{cold_count}: {ratio_count}회 ({ratio_pct:.1f}%)")
        print()
    
    # AC 값이 낮을 때와 높을 때의 차이
    print("【3. AC 값 구간별 비교】\n")
    
    low_ac = [r for r in results if r['ac'] <= 6]  # AC 6 이하
    mid_ac = [r for r in results if 7 <= r['ac'] <= 8]  # AC 7-8
    high_ac = [r for r in results if r['ac'] >= 9]  # AC 9 이상
    
    def analyze_group(group, label):
        if len(group) == 0:
            return
        
        avg_odd = sum(r['odd'] for r in group) / len(group)
        avg_even = sum(r['even'] for r in group) / len(group)
        avg_hot = sum(r['hot'] for r in group) / len(group)
        avg_cold = sum(r['cold'] for r in group) / len(group)
        
        # 홀짝 비율 분포
        odd_dist = Counter(r['odd'] for r in group)
        hot_dist = Counter(r['hot'] for r in group)
        
        print(f"{label} (총 {len(group)}회):")
        print(f"  평균 홀수: {avg_odd:.2f}개, 평균 짝수: {avg_even:.2f}개")
        print(f"  평균 핫: {avg_hot:.2f}개, 평균 콜: {avg_cold:.2f}개")
        
        # 가장 많은 홀짝 비율
        most_common_odd = odd_dist.most_common(1)[0]
        print(f"  가장 많은 홀짝 비율: 홀{most_common_odd[0]}:짝{6-most_common_odd[0]} ({most_common_odd[1]}회, {(most_common_odd[1]/len(group)*100):.1f}%)")
        
        # 가장 많은 핫/콜 비율
        most_common_hot = hot_dist.most_common(1)[0]
        print(f"  가장 많은 핫/콜 비율: 핫{most_common_hot[0]}:콜{6-most_common_hot[0]} ({most_common_hot[1]}회, {(most_common_hot[1]/len(group)*100):.1f}%)")
        print()
    
    analyze_group(low_ac, "AC 6 이하 (낮은 복잡도)")
    analyze_group(mid_ac, "AC 7-8 (중간 복잡도)")
    analyze_group(high_ac, "AC 9 이상 (높은 복잡도)")
    
    # AC 값과 홀짝/핫콜의 상관관계
    print("【4. AC 값과 홀짝/핫콜의 상관관계】\n")
    
    def pearson_corr(x, y):
        """피어슨 상관계수 계산"""
        n = len(x)
        if n < 2:
            return None
        
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(x[i] * y[i] for i in range(n))
        sum_x2 = sum(x[i] ** 2 for i in range(n))
        sum_y2 = sum(y[i] ** 2 for i in range(n))
        
        numerator = (n * sum_xy) - (sum_x * sum_y)
        denominator = ((n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2)) ** 0.5
        
        if denominator == 0:
            return None
        
        return numerator / denominator
    
    ac_values = [r['ac'] for r in results]
    odd_counts = [r['odd'] for r in results]
    hot_counts = [r['hot'] for r in results]
    
    corr_ac_odd = pearson_corr(ac_values, odd_counts)
    corr_ac_hot = pearson_corr(ac_values, hot_counts)
    
    if corr_ac_odd is not None:
        print(f"AC 값과 홀수 개수 상관계수: {corr_ac_odd:.4f}")
        if abs(corr_ac_odd) > 0.3:
            strength = "강한" if abs(corr_ac_odd) > 0.5 else "중간"
            sign = "양의" if corr_ac_odd > 0 else "음의"
            print(f"  → {strength} {sign} 상관관계")
        else:
            print(f"  → 약한 상관관계")
    else:
        print("AC 값과 홀수 개수 상관계수: 계산 불가")
    
    if corr_ac_hot is not None:
        print(f"AC 값과 핫 개수 상관계수: {corr_ac_hot:.4f}")
        if abs(corr_ac_hot) > 0.3:
            strength = "강한" if abs(corr_ac_hot) > 0.5 else "중간"
            sign = "양의" if corr_ac_hot > 0 else "음의"
            print(f"  → {strength} {sign} 상관관계")
        else:
            print(f"  → 약한 상관관계")
    else:
        print("AC 값과 핫 개수 상관계수: 계산 불가")
    
    print()
    
    # 샘플 분석
    print("【5. 샘플 분석】\n")
    
    # AC 값이 낮은 조합 샘플
    low_ac_samples = sorted([r for r in results if r['ac'] <= 6], key=lambda x: x['ac'])[:5]
    print("AC 값이 낮은 조합 (낮은 복잡도) 샘플:")
    for r in low_ac_samples:
        print(f"  {r['round']}회차: {r['numbers']} (AC{r['ac']}, 홀{r['odd']}:짝{r['even']}, 핫{r['hot']}:콜{r['cold']})")
    
    print()
    
    # AC 값이 높은 조합 샘플
    high_ac_samples = sorted([r for r in results if r['ac'] >= 9], key=lambda x: -x['ac'])[:5]
    print("AC 값이 높은 조합 (높은 복잡도) 샘플:")
    for r in high_ac_samples:
        print(f"  {r['round']}회차: {r['numbers']} (AC{r['ac']}, 홀{r['odd']}:짝{r['even']}, 핫{r['hot']}:콜{r['cold']})")

if __name__ == '__main__':
    analyze_ac_impact_on_filters()
