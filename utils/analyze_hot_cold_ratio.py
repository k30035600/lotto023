#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""과거 당첨 번호들의 실제 핫/콜 비율 분석"""

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
    """핫/콜 분할 (JavaScript와 동일한 로직)"""
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

def analyze_hot_cold_ratio():
    """과거 당첨 번호들의 실제 핫/콜 비율 분석"""
    # 데이터 로드
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        all_645_data = json.load(f)
    
    if not all_645_data:
        print("오류: 데이터를 로드할 수 없습니다.")
        return
    
    print(f"\n=== 과거 당첨 번호들의 실제 핫/콜 비율 분석 ===\n")
    
    # 최근 100회차 분석
    recent_rounds = sorted([get_round_number(r) for r in all_645_data if get_round_number(r) > 0], reverse=True)[:100]
    
    print(f"분석 대상: 최근 100회차 ({min(recent_rounds)}회 ~ {max(recent_rounds)}회)\n")
    
    # 각 회차별로 핫/콜 비율 계산
    hot_cold_ratios = []
    
    for round_num in recent_rounds:
        # 해당 회차 이전 데이터로 핫/콜 계산
        filtered = [r for r in all_645_data if get_round_number(r) < round_num]
        if not filtered:
            continue
        
        win_map = calculate_win_stats(filtered)
        app_map = calculate_appearance_stats(filtered)
        seq_map = calculate_consecutive_stats(filtered)
        hc = sort_and_split_hot_cold(win_map, app_map, seq_map)
        
        hot_set = set(hc['hot'])
        cold_set = set(hc['cold'])
        
        # 해당 회차의 당첨 번호
        round_data = next((r for r in all_645_data if get_round_number(r) == round_num), None)
        if not round_data:
            continue
        
        nums = extract_numbers_from_round(round_data)
        if len(nums) != 6:
            continue
        
        hot_count = len([n for n in nums if n in hot_set])
        cold_count = len([n for n in nums if n in cold_set])
        
        hot_cold_ratios.append({
            'round': round_num,
            'hot': hot_count,
            'cold': cold_count,
            'numbers': nums
        })
    
    # 핫/콜 비율 분포
    ratio_dist = Counter()
    for r in hot_cold_ratios:
        ratio_key = f"{r['hot']}-{r['cold']}"
        ratio_dist[ratio_key] += 1
    
    print("【실제 당첨 번호들의 핫/콜 비율 분포】\n")
    total = len(hot_cold_ratios)
    for ratio_key in sorted(ratio_dist.keys(), key=lambda x: ratio_dist[x], reverse=True):
        count = ratio_dist[ratio_key]
        percentage = (count / total) * 100
        print(f"  핫{ratio_key.split('-')[0]}:콜{ratio_key.split('-')[1]}: {count}회 ({percentage:.1f}%)")
    
    # 평균 핫/콜 개수
    avg_hot = sum(r['hot'] for r in hot_cold_ratios) / len(hot_cold_ratios)
    avg_cold = sum(r['cold'] for r in hot_cold_ratios) / len(hot_cold_ratios)
    
    print(f"\n【평균】\n")
    print(f"  평균 핫 개수: {avg_hot:.2f}개")
    print(f"  평균 콜 개수: {avg_cold:.2f}개")
    
    # 핫 6개인 경우가 얼마나 되는지
    hot_6_count = len([r for r in hot_cold_ratios if r['hot'] == 6])
    hot_6_percentage = (hot_6_count / total) * 100
    
    print(f"\n【핫 6개인 경우】\n")
    print(f"  횟수: {hot_6_count}회 ({hot_6_percentage:.1f}%)")
    
    # 샘플: 핫 6개인 회차들
    if hot_6_count > 0:
        print(f"\n  샘플 (핫 6개인 회차):")
        hot_6_samples = [r for r in hot_cold_ratios if r['hot'] == 6][:5]
        for r in hot_6_samples:
            print(f"    {r['round']}회차: {r['numbers']} (핫{r['hot']}:콜{r['cold']})")

if __name__ == '__main__':
    analyze_hot_cold_ratio()
