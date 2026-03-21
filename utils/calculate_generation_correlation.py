#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""번호 자동 생성 함수와 정성도 점수의 상관관계 분석"""

import sys
import io
from pathlib import Path
import json
from collections import defaultdict
import random

# UTF-8 출력 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 프로젝트 루트 경로
BASE_DIR = Path(__file__).parent.parent
SOURCE_DIR = BASE_DIR / '.source'
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

def extract_numbers_from_round(r):
    """회차 데이터에서 번호 추출"""
    numbers = []
    # 'numbers' 키가 있으면 사용
    if 'numbers' in r and isinstance(r['numbers'], list):
        numbers = [int(n) for n in r['numbers'][:6] if isinstance(n, (int, float, str)) and 1 <= int(n) <= 45]
    else:
        # 한글 키 사용: '번호1'~'번호6'
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

def get_hot_cold_before_round(round_num, all_645_data):
    """해당 회차 이전 데이터로 핫/콜 계산"""
    filtered = [r for r in all_645_data if get_round_number(r) < round_num]
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
    # game이 dict이고 'numbers' 키가 있으면 사용, 없으면 직접 번호 리스트로 간주
    if isinstance(game, dict):
        if 'numbers' in game:
            nums = [int(n) for n in game['numbers'][:6] if isinstance(n, (int, float, str)) and 1 <= int(n) <= 45]
        else:
            nums = game.get('numbers', [])
            if not isinstance(nums, list):
                nums = []
    else:
        nums = game if isinstance(game, list) else []
    
    nums = sorted([int(n) for n in nums if isinstance(n, (int, float, str)) and 1 <= int(n) <= 45])
    if len(nums) != 6 or len(set(nums)) != 6:
        return {'hotMatch': 0, 'sumDist': 999999, 'oddEvenDist': 999, 'acDist': 999, 'score': 0}
    
    # 핫 일치
    hc = get_hot_cold_before_round(round_num, all_645_data)
    hot_set = set(hc['hot'])
    hot_match = len([n for n in nums if n in hot_set])
    
    # 통계 데이터
    stat_rounds = [r for r in all_645_data if get_round_number(r) < round_num and len(extract_numbers_from_round(r)) == 6]
    
    # 평균합
    ref_avg = 138.0
    if stat_rounds:
        sums = []
        for r in stat_rounds:
            ns = extract_numbers_from_round(r)
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
            ns = extract_numbers_from_round(r)
            if len(ns) == 6:
                odd_counts.append(len([n for n in ns if n % 2 == 1]))
        if odd_counts:
            ref_odd_avg = sum(odd_counts) / len(odd_counts)
    
    game_odd = len([n for n in nums if n % 2 == 1])
    odd_even_dist = abs(game_odd - ref_odd_avg)
    
    # AC 평균 (실제 평균은 약 8.0)
    ref_ac_avg = 8.0
    if stat_rounds:
        acs = []
        for r in stat_rounds:
            ns = extract_numbers_from_round(r)
            if len(ns) == 6:
                ac_val = calculate_ac(ns)
                # AC 5 이하는 배제 (분포 5% 미만)
                if ac_val > 5:
                    acs.append(ac_val)
        if acs:
            ref_ac_avg = sum(acs) / len(acs)
    
    game_ac = calculate_ac(nums)
    
    # AC값이 5 이하인 경우 큰 페널티 (분포 5% 미만인 극한 조합)
    if game_ac <= 5:
        if game_ac <= 1:
            ac_dist = 999  # 최극한: 매우 큰 페널티
        else:
            ac_dist = 50 + (5 - game_ac) * 10  # AC 2~5: 단계적 페널티
    else:
        ac_dist = abs(game_ac - ref_ac_avg)
    
    # 핫/콜 비율 거리 계산
    cold_set = set(hc['cold'])
    cold_match = len([n for n in nums if n in cold_set])
    ref_hot_avg = 3.0
    ref_cold_avg = 3.0
    hot_cold_dist = abs(hot_match - ref_hot_avg) + abs(cold_match - ref_cold_avg)
    
    # 점수 계산
    # 핫/콜 비율 거리 페널티를 ×40으로 강화하여 균형잡힌 비율 유도
    score = (hot_match * 100) - (sum_dist * 0.5) - (odd_even_dist * 10) - (ac_dist * 5) - (hot_cold_dist * 40)
    
    return {
        'hotMatch': hot_match,
        'sumDist': sum_dist,
        'oddEvenDist': odd_even_dist,
        'acDist': ac_dist,
        'hotColdDist': hot_cold_dist,
        'score': score
    }

def generate_numbers_by_quality_score_sim(target_round, all_645_data, candidate_count=200, top_percent=0.1):
    """정성도 점수 기반 번호 생성 시뮬레이션 (JavaScript와 동일한 로직)"""
    if not target_round or target_round < 1:
        return None
    
    if not all_645_data:
        return None
    
    # 통계 계산
    stat_rounds = [r for r in all_645_data if get_round_number(r) < target_round and len(extract_numbers_from_round(r)) == 6]
    
    # 평균합
    ref_avg = 138.0
    if stat_rounds:
        sums = []
        for r in stat_rounds:
            ns = extract_numbers_from_round(r)
            if len(ns) == 6:
                sums.append(sum(ns))
        if sums:
            ref_avg = sum(sums) / len(sums)
    
    # 홀수 개수 평균
    ref_odd_avg = 3.0
    if stat_rounds:
        odd_counts = []
        for r in stat_rounds:
            ns = extract_numbers_from_round(r)
            if len(ns) == 6:
                odd_counts.append(len([n for n in ns if n % 2 == 1]))
        if odd_counts:
            ref_odd_avg = sum(odd_counts) / len(odd_counts)
    
    # AC 평균 (실제 평균은 약 8.0)
    ref_ac_avg = 8.0
    if stat_rounds:
        acs = []
        for r in stat_rounds:
            ns = extract_numbers_from_round(r)
            if len(ns) == 6:
                ac_val = calculate_ac(ns)
                # AC 5 이하는 배제 (분포 5% 미만)
                if ac_val > 5:
                    acs.append(ac_val)
        if acs:
            ref_ac_avg = sum(acs) / len(acs)
    
    # 핫 번호
    hc = get_hot_cold_before_round(target_round, all_645_data)
    hot_set = set(hc['hot'])
    
    # 후보 생성
    candidates = []
    pool = list(range(1, 46))
    
    for i in range(candidate_count):
        # 가중치 없이 랜덤 선택 (핫 일치 수 가중치 ×100이 이미 충분히 핫 번호를 선호함)
        random.shuffle(pool)
        selected = []
        seen = set()
        for n in pool:
            if n not in seen:
                selected.append(n)
                seen.add(n)
                if len(selected) == 6:
                    break
        
        # 부족하면 추가 선택
        if len(selected) < 6:
            remaining = [n for n in pool if n not in seen]
            random.shuffle(remaining)
            selected.extend(remaining[:6 - len(selected)])
        
        selected = sorted(selected[:6])
        
        if len(selected) == 6 and len(set(selected)) == 6:
            # AC값 체크: AC 5 이하는 배제 (분포 5% 미만)
            ac_val = calculate_ac(selected)
            if ac_val <= 5:
                continue  # AC 5 이하는 다음 후보로
            
            # 정성도 점수 계산
            score_info = calculate_pending_score({'numbers': selected}, target_round, all_645_data)
            
            if score_info['score'] > 0:
                candidates.append({
                    'numbers': selected,
                    'score': score_info['score'],
                    'hotMatch': score_info['hotMatch'],
                    'sumDist': score_info['sumDist'],
                    'oddEvenDist': score_info['oddEvenDist'],
                    'acDist': score_info['acDist'],
                    'hotColdDist': score_info['hotColdDist']
                })
    
    if not candidates:
        return None
    
    # 정성도 점수 내림차순 정렬
    candidates.sort(key=lambda x: -x['score'])
    
    # 상위 그룹 추출
    top_count = max(1, int(len(candidates) * top_percent))
    top_group = candidates[:top_count]
    
    # 상위 그룹에서 랜덤 선택
    selected = random.choice(top_group)
    return selected['numbers']

def calculate_generation_correlation():
    """번호 생성과 정성도 점수의 상관관계 분석"""
    # 데이터 로드
    all_645_data = load_lotto645_data()
    if not all_645_data:
        print("오류: Lotto645 데이터를 로드할 수 없습니다.")
        return
    
    # 추첨 완료된 최신 회차 찾기
    drawn_rounds = []
    for r in all_645_data:
        round_num = get_round_number(r)
        if round_num > 0:
            drawn_rounds.append(round_num)
    
    if not drawn_rounds:
        print("오류: 추첨 데이터가 없습니다.")
        return
    
    max_drawn_round = max(drawn_rounds)
    
    # 테스트할 미추첨 회차들 (최신 회차 + 1부터 + 10까지)
    test_rounds = [max_drawn_round + 1 + i for i in range(10)]
    
    print(f"\n=== 번호 자동 생성과 정성도 점수 상관관계 분석 ===\n")
    print(f"테스트 회차: {test_rounds[0]}회 ~ {test_rounds[-1]}회 (총 {len(test_rounds)}개 회차)\n")
    
    # 각 회차마다 번호 생성 및 정성도 점수 계산
    generated_results = []
    
    for target_round in test_rounds:
        # 각 회차마다 5번 생성 (5게임 시뮬레이션)
        for game_idx in range(5):
            generated = generate_numbers_by_quality_score_sim(target_round, all_645_data, 200, 0.1)
            if generated:
                score_info = calculate_pending_score({'numbers': generated}, target_round, all_645_data)
                generated_results.append({
                    'round': target_round,
                    'numbers': generated,
                    'score': score_info['score'],
                    'hotMatch': score_info['hotMatch'],
                    'sumDist': score_info['sumDist'],
                    'oddEvenDist': score_info['oddEvenDist'],
                    'acDist': score_info['acDist']
                })
    
    if len(generated_results) < 2:
        print("오류: 생성된 번호가 부족합니다.")
        return
    
    # 생성된 번호들의 통계
    scores = [r['score'] for r in generated_results]
    hot_matches = [r['hotMatch'] for r in generated_results]
    sum_dists = [r['sumDist'] for r in generated_results]
    odd_even_dists = [r['oddEvenDist'] for r in generated_results]
    ac_dists = [r['acDist'] for r in generated_results]
    hot_cold_dists = [r.get('hotColdDist', 0) for r in generated_results]
    
    print("【생성된 번호들의 정성도 점수 통계】\n")
    print(f"  생성된 번호 개수: {len(generated_results)}개")
    print(f"  평균 정성도 점수: {sum(scores) / len(scores):.2f}")
    print(f"  최고 정성도 점수: {max(scores):.2f}")
    print(f"  최저 정성도 점수: {min(scores):.2f}")
    print(f"  표준편차: {(sum((s - sum(scores)/len(scores))**2 for s in scores) / len(scores))**0.5:.2f}")
    
    print(f"\n  평균 핫 일치 수: {sum(hot_matches) / len(hot_matches):.2f}개")
    print(f"  핫 일치 수 범위: {min(hot_matches)} ~ {max(hot_matches)}개")
    # 핫 일치 수 분포
    from collections import Counter
    hot_dist = Counter(hot_matches)
    print(f"  핫 일치 수 분포:")
    for hot_count in sorted(hot_dist.keys()):
        count = hot_dist[hot_count]
        percentage = (count / len(hot_matches)) * 100
        print(f"    {hot_count}개: {count}개 ({percentage:.1f}%)")
    print(f"  평균 평균합 거리: {sum(sum_dists) / len(sum_dists):.2f}")
    print(f"  평균 홀짝 거리: {sum(odd_even_dists) / len(odd_even_dists):.2f}")
    print(f"  평균 AC 거리: {sum(ac_dists) / len(ac_dists):.2f}")
    print(f"  평균 핫/콜 비율 거리: {sum(hot_cold_dists) / len(hot_cold_dists):.2f}\n")
    
    # 각 회차별로 생성된 번호들의 평균 점수
    print("【회차별 생성된 번호들의 평균 정성도 점수】\n")
    for round_num in test_rounds:
        round_results = [r for r in generated_results if r['round'] == round_num]
        if round_results:
            avg_score = sum(r['score'] for r in round_results) / len(round_results)
            avg_hot = sum(r['hotMatch'] for r in round_results) / len(round_results)
            print(f"  {round_num}회차: 평균 점수 {avg_score:.2f}, 평균 핫 {avg_hot:.2f}개 (생성 {len(round_results)}개)")
    
    # 상관계수 계산
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
    
    # 생성된 번호들의 각 요소와 정성도 점수 상관관계
    corr_hot_score = pearson_corr(hot_matches, scores)
    corr_sum_score = pearson_corr(sum_dists, scores)
    corr_odd_even_score = pearson_corr(odd_even_dists, scores)
    corr_ac_score = pearson_corr(ac_dists, scores)
    corr_hot_cold_score = pearson_corr(hot_cold_dists, scores)
    
    print(f"\n【생성된 번호들의 상관계수】\n")
    
    def print_corr(name, corr, is_negative_expected=False):
        """상관계수 출력 헬퍼"""
        if corr is None:
            print(f"  {name}: 계산 불가")
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
    print_corr("5. 핫/콜 비율 거리", corr_hot_cold_score, is_negative_expected=True)
    
    # 생성된 번호들의 상위 비율 분석
    # 각 회차별로 모든 가능한 조합의 정성도 점수를 계산하고, 생성된 번호가 상위 몇 %에 속하는지 확인
    print(f"\n【생성된 번호들의 품질 분석】\n")
    
    # 샘플: 첫 번째 회차에 대해 상세 분석
    sample_round = test_rounds[0]
    sample_generated = [r for r in generated_results if r['round'] == sample_round]
    
    if sample_generated:
        # 해당 회차의 생성된 번호들 중 최고 점수
        best_generated = max(sample_generated, key=lambda x: x['score'])
        print(f"  {sample_round}회차 생성된 번호 중 최고 점수:")
        print(f"    번호: {best_generated['numbers']}")
        print(f"    정성도 점수: {best_generated['score']:.2f}")
        print(f"    핫 일치: {best_generated['hotMatch']}개")
        print(f"    평균합 거리: {best_generated['sumDist']:.2f}")
        print(f"    홀짝 거리: {best_generated['oddEvenDist']:.2f}")
        print(f"    AC 거리: {best_generated['acDist']:.2f}")
        print(f"    핫/콜 비율 거리: {best_generated.get('hotColdDist', 0):.2f}")

if __name__ == '__main__':
    calculate_generation_correlation()
