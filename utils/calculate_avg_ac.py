#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""1회차부터 1215회차까지의 평균 AC값 계산"""

import sys
import io
from pathlib import Path
import json

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
    """AC값 계산 (JavaScript와 동일한 로직)"""
    diffs = set()
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            diffs.add(abs(numbers[j] - numbers[i]))
    return len(diffs) - 5

def calculate_avg_ac():
    """1회차부터 1215회차까지의 평균 AC값 계산"""
    # 데이터 로드
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        all_645_data = json.load(f)
    
    if not all_645_data:
        print("오류: 데이터를 로드할 수 없습니다.")
        return
    
    print(f"\n=== 1회차부터 1215회차까지의 평균 AC값 계산 ===\n")
    
    # 모든 회차의 AC값 계산
    ac_values = []
    round_ac_map = {}
    
    for r in all_645_data:
        round_num = get_round_number(r)
        if round_num > 0:
            nums = extract_numbers_from_round(r)
            if len(nums) == 6:
                ac = calculate_ac(nums)
                ac_values.append(ac)
                round_ac_map[round_num] = ac
    
    if len(ac_values) == 0:
        print("오류: AC값을 계산할 수 있는 데이터가 없습니다.")
        return
    
    # 통계 계산
    total_rounds = len(ac_values)
    avg_ac = sum(ac_values) / total_rounds
    min_ac = min(ac_values)
    max_ac = max(ac_values)
    
    # AC값 분포
    from collections import Counter
    ac_dist = Counter(ac_values)
    
    print(f"분석 대상: {total_rounds}회차\n")
    print("【AC값 통계】\n")
    print(f"  평균 AC값: {avg_ac:.4f}")
    print(f"  최소 AC값: {min_ac}")
    print(f"  최대 AC값: {max_ac}")
    print(f"  중앙값: {sorted(ac_values)[len(ac_values)//2]}")
    
    print(f"\n【AC값 분포】\n")
    for ac_val in sorted(ac_dist.keys()):
        count = ac_dist[ac_val]
        percentage = (count / total_rounds) * 100
        print(f"  AC{ac_val:2d}: {count:4d}회 ({percentage:5.2f}%)")
    
    # 구간별 분석
    print(f"\n【구간별 분석】\n")
    ranges = [
        (0, 3, "낮음 (0~3)"),
        (4, 6, "중간 (4~6)"),
        (7, 10, "높음 (7~10)")
    ]
    
    for min_val, max_val, label in ranges:
        count = len([ac for ac in ac_values if min_val <= ac <= max_val])
        percentage = (count / total_rounds) * 100
        print(f"  {label}: {count:4d}회 ({percentage:5.2f}%)")
    
    # 최근 100회차 평균
    if total_rounds >= 100:
        recent_100 = sorted(round_ac_map.items(), key=lambda x: x[0], reverse=True)[:100]
        recent_ac_values = [ac for _, ac in recent_100]
        recent_avg = sum(recent_ac_values) / len(recent_ac_values)
        print(f"\n【최근 100회차 평균】\n")
        print(f"  평균 AC값: {recent_avg:.4f}")
        print(f"  범위: {min(recent_ac_values)} ~ {max(recent_ac_values)}")

if __name__ == '__main__':
    calculate_avg_ac()
