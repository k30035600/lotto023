#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""과거 당첨 번호들의 실제 홀짝 비율 분석"""

import sys
import io
from pathlib import Path
import json
from collections import Counter

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

def analyze_odd_even_ratio():
    """과거 당첨 번호들의 실제 홀짝 비율 분석"""
    # 데이터 로드
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        all_645_data = json.load(f)
    
    if not all_645_data:
        print("오류: 데이터를 로드할 수 없습니다.")
        return
    
    print(f"\n=== 과거 당첨 번호들의 실제 홀짝 비율 분석 ===\n")
    
    # 전체 회차 분석
    all_rounds = []
    for r in all_645_data:
        round_num = get_round_number(r)
        if round_num > 0:
            nums = extract_numbers_from_round(r)
            if len(nums) == 6:
                all_rounds.append({
                    'round': round_num,
                    'numbers': nums
                })
    
    print(f"분석 대상: 전체 {len(all_rounds)}회차\n")
    
    # 각 회차별 홀짝 비율 계산
    odd_even_ratios = []
    
    for r in all_rounds:
        nums = r['numbers']
        odd_count = len([n for n in nums if n % 2 == 1])
        even_count = 6 - odd_count
        
        odd_even_ratios.append({
            'round': r['round'],
            'odd': odd_count,
            'even': even_count,
            'ratio': f"{odd_count}-{even_count}",
            'numbers': nums
        })
    
    # 홀짝 비율 분포
    ratio_dist = Counter()
    for r in odd_even_ratios:
        ratio_dist[r['ratio']] += 1
    
    print("【실제 당첨 번호들의 홀짝 비율 분포】\n")
    total = len(odd_even_ratios)
    
    # 비율별로 정렬 (홀수 개수 기준)
    sorted_ratios = sorted(ratio_dist.items(), key=lambda x: (-int(x[0].split('-')[0]), int(x[0].split('-')[1])))
    
    for ratio_key, count in sorted_ratios:
        percentage = (count / total) * 100
        odd_part, even_part = ratio_key.split('-')
        print(f"  홀{odd_part}:짝{even_part}: {count}회 ({percentage:.1f}%)")
    
    # 평균 홀/짝 개수
    avg_odd = sum(r['odd'] for r in odd_even_ratios) / len(odd_even_ratios)
    avg_even = sum(r['even'] for r in odd_even_ratios) / len(odd_even_ratios)
    
    print(f"\n【평균】\n")
    print(f"  평균 홀수 개수: {avg_odd:.2f}개")
    print(f"  평균 짝수 개수: {avg_even:.2f}개")
    
    # 최근 100회차 분석
    recent_100 = sorted(odd_even_ratios, key=lambda x: x['round'], reverse=True)[:100]
    avg_odd_recent = sum(r['odd'] for r in recent_100) / len(recent_100)
    avg_even_recent = sum(r['even'] for r in recent_100) / len(recent_100)
    
    print(f"\n【최근 100회차 평균】\n")
    print(f"  평균 홀수 개수: {avg_odd_recent:.2f}개")
    print(f"  평균 짝수 개수: {avg_even_recent:.2f}개")
    
    # 각 회차별로 이전 회차들의 평균 계산 (정성도 점수 계산 방식)
    print(f"\n【정성도 점수 계산 방식 (각 회차별 이전 회차 평균)】\n")
    
    sample_rounds = [1210, 1215, 1220] if len(all_rounds) >= 1220 else [all_rounds[-1]['round']]
    
    for target_round in sample_rounds:
        # 해당 회차 이전 데이터만 필터링
        before_rounds = [r for r in odd_even_ratios if r['round'] < target_round]
        
        if len(before_rounds) > 0:
            avg_odd_before = sum(r['odd'] for r in before_rounds) / len(before_rounds)
            avg_even_before = sum(r['even'] for r in before_rounds) / len(before_rounds)
            
            # 해당 회차의 실제 홀짝 비율
            target_round_data = next((r for r in odd_even_ratios if r['round'] == target_round), None)
            if target_round_data:
                target_odd = target_round_data['odd']
                target_even = target_round_data['even']
                dist = abs(target_odd - avg_odd_before)
                
                print(f"  {target_round}회차:")
                print(f"    이전 {len(before_rounds)}회차 평균: 홀수 {avg_odd_before:.2f}개, 짝수 {avg_even_before:.2f}개")
                print(f"    실제 당첨: 홀수 {target_odd}개, 짝수 {target_even}개")
                print(f"    홀짝 비율 거리: |{target_odd} - {avg_odd_before:.2f}| = {dist:.2f}")

if __name__ == '__main__':
    analyze_odd_even_ratio()
