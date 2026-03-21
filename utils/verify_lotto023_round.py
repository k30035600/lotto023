#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lotto023 특정 회차 데이터 검증 스크립트"""

import sys
import io
from pathlib import Path
import openpyxl

# UTF-8 출력 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 프로젝트 루트 경로
BASE_DIR = Path(__file__).parent.parent
SOURCE_DIR = BASE_DIR / '.source'
XLSX_PATH = SOURCE_DIR / 'Lotto023.xlsx'

def calculate_ac(numbers):
    """AC (Alternating Count) 계산"""
    if len(numbers) != 6:
        return 0
    sorted_nums = sorted(numbers)
    ac = 0
    for i in range(5):
        for j in range(i + 1, 6):
            if sorted_nums[j] - sorted_nums[i] > 1:
                ac += 1
    return ac

def count_sequential_pairs(numbers):
    """연속 쌍 개수 계산"""
    if len(numbers) < 2:
        return 0
    sorted_nums = sorted(numbers)
    count = 0
    for i in range(len(sorted_nums) - 1):
        if sorted_nums[i + 1] - sorted_nums[i] == 1:
            count += 1
    return count

def calculate_win_stats(rounds):
    """당첨번호(보너스 제외) 통계"""
    win_map = {}
    for r in rounds:
        nums = r.get('numbers', [])
        if len(nums) >= 6:
            for n in nums[:6]:
                n_int = int(n)
                win_map[n_int] = win_map.get(n_int, 0) + 1
    return win_map

def calculate_appearance_stats(rounds):
    """출현횟수 통계 (보너스 포함)"""
    app_map = {}
    for r in rounds:
        nums = r.get('numbers', [])
        bonus = r.get('bonus')
        if len(nums) >= 6:
            for n in nums[:6]:
                n_int = int(n)
                app_map[n_int] = app_map.get(n_int, 0) + 1
        if bonus:
            b_int = int(bonus)
            app_map[b_int] = app_map.get(b_int, 0) + 1
    return app_map

def calculate_consecutive_stats(rounds):
    """연속 출현 횟수 통계"""
    seq_map = {i: 0 for i in range(1, 46)}
    for r in rounds:
        nums = r.get('numbers', [])
        if len(nums) >= 6:
            sorted_nums = sorted([int(n) for n in nums[:6]])
            for j in range(len(sorted_nums) - 1):
                if sorted_nums[j + 1] == sorted_nums[j] + 1:
                    seq_map[sorted_nums[j + 1]] = seq_map.get(sorted_nums[j + 1], 0) + 1
    return seq_map

def sort_and_split_hot_cold(win_map, app_map, seq_map):
    """핫/콜 번호 정렬 및 분류 (JavaScript와 동일한 로직)"""
    sorted_list = []
    for num in range(1, 46):
        count = win_map.get(num, 0)
        app_count = app_map.get(num, 0)
        seq_count = seq_map.get(num, 0)
        sorted_list.append({
            'number': num,
            'count': count,
            'appCount': app_count,
            'seqCount': seq_count
        })
    
    # 정렬: 1) 당첨횟수 내림차순, 2) 출현횟수 내림차순, 3) 연속횟수 내림차순, 4) 번호 내림차순
    sorted_list.sort(key=lambda x: (-x['count'], -x['appCount'], -x['seqCount'], -x['number']))
    
    hot = [item['number'] for item in sorted_list[:22]]
    cold = [item['number'] for item in sorted_list[22:]][::-1]  # 역순
    return {'hot': hot, 'cold': cold}

def get_hot_cold_numbers_before_round(round_num, all_645_data):
    """해당 회차 이전 데이터로 핫/콜 번호 계산 (JavaScript와 동일한 로직)"""
    filtered = [r for r in all_645_data if r.get('round', 0) < round_num]
    if not filtered:
        return {'hot': [], 'cold': []}
    win_map = calculate_win_stats(filtered)
    app_map = calculate_appearance_stats(filtered)
    seq_map = calculate_consecutive_stats(filtered)
    return sort_and_split_hot_cold(win_map, app_map, seq_map)

def verify_round(round_num):
    """특정 회차 데이터 검증"""
    if not XLSX_PATH.exists():
        print(f"오류: {XLSX_PATH} 파일이 없습니다.")
        return
    
    wb = openpyxl.load_workbook(XLSX_PATH)
    ws = wb.active
    
    # 헤더 읽기
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        print("오류: 데이터가 없습니다.")
        return
    
    headers = [str(h) if h is not None else '' for h in rows[0]]
    
    # 필요한 컬럼 인덱스 찾기
    try:
        idx_round = headers.index('회차')
        idx_set = headers.index('세트')
        idx_game = headers.index('게임')
        idx_odd_even = headers.index('홀짝') if '홀짝' in headers else None
        idx_sequence = headers.index('연속') if '연속' in headers else None
        idx_hot_cold = headers.index('핫콜') if '핫콜' in headers else None
        idx_game_mode = headers.index('게임선택') if '게임선택' in headers else None
        idx_pick_sum = headers.index('선택합계') if '선택합계' in headers else None
        idx_pick1 = headers.index('선택1') if '선택1' in headers else None
        idx_pick2 = headers.index('선택2') if '선택2' in headers else None
        idx_pick3 = headers.index('선택3') if '선택3' in headers else None
        idx_pick4 = headers.index('선택4') if '선택4' in headers else None
        idx_pick5 = headers.index('선택5') if '선택5' in headers else None
        idx_pick6 = headers.index('선택6') if '선택6' in headers else None
    except ValueError as e:
        print(f"오류: 필요한 컬럼을 찾을 수 없습니다: {e}")
        return
    
    # 해당 회차 데이터 찾기
    data_rows = []
    for r in rows[1:]:
        try:
            r_round = str(r[idx_round]).strip() if r[idx_round] else ''
            if r_round == str(round_num):
                data_rows.append(r)
        except (IndexError, TypeError):
            continue
    
    if not data_rows:
        print(f"{round_num}회차 데이터가 없습니다.")
        return
    
    print(f"\n=== {round_num}회차 데이터 검증 ===\n")
    print(f"총 {len(data_rows)}개 게임 발견\n")
    
    # Lotto645 데이터 로드 (핫콜 계산용)
    try:
        import json
        lotto645_path = SOURCE_DIR / 'Lotto645.json'
        if lotto645_path.exists():
            with open(lotto645_path, 'r', encoding='utf-8') as f:
                all_645_data = json.load(f)
        else:
            all_645_data = []
    except:
        all_645_data = []
    
    # 각 게임 검증
    for i, row in enumerate(data_rows, 1):
        try:
            set_num = str(row[idx_set]).strip() if row[idx_set] else '1'
            game_num = str(row[idx_game]).strip() if row[idx_game] else '1'
            
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
            
            if len(numbers) != 6:
                print(f"게임 {set_num}-{game_num}: 번호가 6개가 아닙니다. (실제: {len(numbers)}개)")
                continue
            
            sorted_nums = sorted(numbers)
            
            # 저장된 값 읽기
            stored_oe = str(row[idx_odd_even]).strip() if idx_odd_even is not None and row[idx_odd_even] else ''
            stored_seq = str(row[idx_sequence]).strip() if idx_sequence is not None and row[idx_sequence] else ''
            stored_hc = str(row[idx_hot_cold]).strip() if idx_hot_cold is not None and row[idx_hot_cold] else ''
            stored_mode = str(row[idx_game_mode]).strip() if idx_game_mode is not None and row[idx_game_mode] else ''
            stored_sum = str(row[idx_pick_sum]).strip() if idx_pick_sum is not None and row[idx_pick_sum] else ''
            
            # 실제 값 계산
            odd_count = sum(1 for n in sorted_nums if n % 2 == 1)
            even_count = 6 - odd_count
            actual_oe = f"{odd_count}"
            
            actual_seq = count_sequential_pairs(sorted_nums)
            
            # 핫콜 계산 (해당 회차 이전 데이터 기준)
            hot_cold = get_hot_cold_numbers_before_round(round_num, all_645_data)
            hot_set = set(hot_cold['hot'])
            actual_hc = sum(1 for n in sorted_nums if n in hot_set)
            
            actual_ac = calculate_ac(sorted_nums)
            actual_sum = sum(sorted_nums)
            
            # 검증
            print(f"게임 {set_num.zfill(2)}-{game_num.zfill(2)}게임:")
            print(f"  번호: {', '.join(map(str, sorted_nums))}")
            match_oe = 'OK' if stored_oe == actual_oe else 'NG'
            match_seq = 'OK' if stored_seq == str(actual_seq) else 'NG'
            match_hc = 'OK' if stored_hc == str(actual_hc) else 'NG'
            match_sum = 'OK' if stored_sum == str(actual_sum) else 'NG'
            print(f"  홀짝: 저장={stored_oe}, 계산={actual_oe} [{match_oe}]")
            print(f"  연속: 저장={stored_seq}, 계산={actual_seq} [{match_seq}]")
            print(f"  핫콜: 저장={stored_hc}, 계산={actual_hc} [{match_hc}]")
            print(f"  AC: 계산={actual_ac:02d}")
            print(f"  모드: {stored_mode}")
            print(f"  합계: 저장={stored_sum}, 계산={actual_sum} [{match_sum}]")
            print(f"  표시 형식: {set_num.zfill(2)}-{game_num.zfill(2)}게임/홀{actual_oe}/핫{actual_hc}/연{actual_seq}/AC{actual_ac:02d}/{stored_mode}[{actual_sum}]")
            print()
            
        except Exception as e:
            print(f"게임 {i} 검증 중 오류: {e}")
            import traceback
            traceback.print_exc()
    
    wb.close()

if __name__ == '__main__':
    round_num = int(sys.argv[1]) if len(sys.argv) > 1 else 1215
    verify_round(round_num)
