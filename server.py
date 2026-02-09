# -*- coding: utf-8 -*-
"""
HTTP 서버 모듈 (Python/Flask)
- 정적 파일 서빙
- 동행복권 최신 당첨번호: 내부 API(selectPstLt645Info.do) 단일 호출 → /api/lotto-latest
"""
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except (AttributeError, OSError):
    pass

import json
import os
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, send_from_directory, jsonify, request

# --- 설정 ---
PORT = int(os.environ.get('PORT', 8000))
BASE_DIR = Path(__file__).resolve().parent
CORS_HEADERS = {'Access-Control-Allow-Origin': '*'}
CORS_OPTIONS_HEADERS = {**CORS_HEADERS, 'Content-Length': '0'}
SERVER_START_TIME = time.strftime('%Y-%m-%d %H:%M:%S')

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
app.config['JSON_AS_ASCII'] = False


# 봇 탐지 우회를 위한 브라우저 헤더 설정 (utils/get_lotto_round.py에서 관리됨)









def _fmt_amount(val):
    """숫자를 천 단위 콤마 문자열로, 없으면 (없음)."""
    if val is None:
        return '(없음)'
    try:
        return format(int(val), ',')
    except (TypeError, ValueError):
        return '(없음)'


def _to_latest_response(parsed):
    """API 원본 데이터를 클라이언트용 규격(standard format)으로 변환. 추첨일 YYYY-MM-DD, 당첨금 천 단위 콤마."""
    import datetime
    d = parsed.get('drwNoDate')
    if not d:
        d = datetime.date.today().isoformat()
    amt = parsed.get('rnk1WnAmt')
    winnerAmtFmt = _fmt_amount(amt)

    out = {
        'returnValue': 'success',
        'drwNo': parsed.get('drwNo'),
        'drwNoDate': d,
        'drwtNo1': parsed['main'][0], 'drwtNo2': parsed['main'][1],
        'drwtNo3': parsed['main'][2], 'drwtNo4': parsed['main'][3],
        'drwtNo5': parsed['main'][4], 'drwtNo6': parsed['main'][5],
        'bnusNo': parsed['bnusNo'],
        'winnerAmt': winnerAmtFmt,
        'source': parsed.get('source', '동행복권 내부 API'),
    }
    # firstWinamnt, firstPrzwnerCo, firstAccumamnt, totSellamnt 추가
    out['firstWinamnt'] = parsed.get('firstWinamnt')
    out['firstWinamntFmt'] = _fmt_amount(parsed.get('firstWinamnt'))
    out['firstPrzwnerCo'] = parsed.get('firstPrzwnerCo')
    out['firstPrzwnerCoFmt'] = str(parsed.get('firstPrzwnerCo')) if parsed.get('firstPrzwnerCo') is not None else '(없음)'
    out['firstAccumamnt'] = parsed.get('firstAccumamnt')
    out['firstAccumamntFmt'] = _fmt_amount(parsed.get('firstAccumamnt'))
    out['totSellamnt'] = parsed.get('totSellamnt')
    out['totSellamntFmt'] = _fmt_amount(parsed.get('totSellamnt'))
    return out


def fetch_latest_lotto():
    """
    동행복권 당첨번호 조회.
    1. 로컬 파일(Lotto645.json/xlsx)에서 최신 회차 확인.
    2. 최신 회차 날짜가 오늘보다 이전이거나, 오늘이 토요일 20:35~ 이후인데 아직 반영 안 된 경우에만 API 호출.
    3. 그 외엔 로컬 데이터 반환.
    """
    import datetime
    
    # 1. 로컬 데이터 확인
    local_parsed = None
    try:
        # JSON 먼저 확인 (빠름)
        json_path = (BASE_DIR / 'source' / 'Lotto645.json').resolve()
        if json_path.is_file():
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data and len(data) > 0:
                    # 최신순 정렬 가정하고 첫 번째 요소, 혹은 drwNo 최대값 찾기
                    latest_local = data[0] if data[0].get('회차') else None
                    if latest_local:
                        local_parsed = {
                            'drwNo': int(latest_local.get('회차')),
                            'drwNoDate': latest_local.get('날짜'),
                            'main': [int(latest_local.get(f'번호{i}')) for i in range(1, 7)],
                            'bnusNo': int(latest_local.get('보너스번호')),
                            'rnk1WnAmt': latest_local.get('1등 당첨금액'), # 숫자 or None
                            'firstWinamnt': latest_local.get('1등 당첨금액'),
                            'firstPrzwnerCo': latest_local.get('1등 당첨자 수'),
                            'firstAccumamnt': latest_local.get('1등 총당첨금액'),
                            'totSellamnt': latest_local.get('전체 당첨상금 총액'),
                            'source': 'Lotto645.json (로컬)',
                        }
    except Exception as e:
        print('[Lotto645] 로컬 JSON 확인 중 오류: %s' % e)

    # 2. API 호출 필요 여부 판단
    need_api_call = True
    if local_parsed:
        need_api_call = False
        try:
            last_date_str = local_parsed.get('drwNoDate') # YYYY-MM-DD
            if last_date_str:
                last_date = datetime.datetime.strptime(last_date_str, '%Y-%m-%d').date()
                today = datetime.date.today()
                
                # 마지막 회차 날짜가 오늘보다 미래면(그럴 리 없지만) API 불필요
                if last_date >= today:
                    need_api_call = False
                else:
                    # 마지막 회차가 과거임. 다음 회차 추첨일 계산
                    # 로또는 매주 토요일. last_date 요일: 5 (토요일)
                    days_diff = (5 - last_date.weekday()) % 7 
                    if days_diff == 0: days_diff = 7 # 다음주 토요일
                    next_draw_date = last_date + datetime.timedelta(days=days_diff)
                    
                    if today < next_draw_date:
                        # 아직 다음 추첨일 안 됨 -> 로컬 데이터가 최신임
                        need_api_call = False
                    elif today == next_draw_date:
                        # 오늘이 추첨일(토요일). 20:45 이후여야 API 호출 시도
                        now = datetime.datetime.now()
                        if now.hour < 20 or (now.hour == 20 and now.minute < 45):
                             need_api_call = False
                        else:
                             # 추첨 시간 지남. API 호출 필요
                             need_api_call = True
                    else:
                        # 추첨일 지남 (일요일 등). API 호출 필요
                        need_api_call = True
        except Exception as e:
            print('[Lotto645] 날짜 계산 오류, API 호출 시도: %s' % e)
            need_api_call = True

    if not need_api_call and local_parsed:
        # print('[동행복권] 로컬 데이터가 최신입니다. API 호출 생략.')
        return _to_latest_response(local_parsed), None

    # 3. API 호출 (로컬 데이터가 없거나, 갱신이 필요한 경우)
    try:
        from utils.get_lotto_round import get_latest_lotto
        parsed = get_latest_lotto()
        if parsed:
            print('[동행복권] API 조회 성공: %s회 (%s)' % (parsed.get('drwNo'), parsed.get('drwNoDate')))
            # 로컬 파일보다 더 최신이면 자동 저장 로직 실행
            if local_parsed:
                 api_drw = parsed.get('drwNo')
                 local_drw = local_parsed.get('drwNo')
                 if api_drw and local_drw and api_drw > local_drw:
                      print('[동행복권] 새 회차 발견! 로컬 파일 업데이트 시도...')
                      # 이미 가져온 데이터를 넘겨서 중복 호출 방지!
                      _update_latest_lotto645(parsed)

            return _to_latest_response(parsed), None
        
        # API 실패 시, 로컬 데이터라도 있으면 반환
        if local_parsed:
            print('[동행복권] API 실패하여 기존 로컬 데이터 반환.')
            return _to_latest_response(local_parsed), None

        return None, '동행복권 API에서 당첨 정보를 가져오지 못했습니다.'
    except Exception as e:
        if local_parsed:
             return _to_latest_response(local_parsed), None
        return None, str(e)[:120]


# --- 라우트 ---
@app.route('/favicon.ico')
def favicon():
    return '', 204, {'Content-Type': 'image/x-icon'}


def _get_lotto645_data_row_count():
    """Lotto645.xlsx 데이터 행 수(헤더 제외). openpyxl 없으면 None."""
    try:
        import openpyxl
        p = (BASE_DIR / 'source' / 'Lotto645.xlsx').resolve()
        if not p.is_file():
            return None
        wb = openpyxl.load_workbook(p, read_only=True)
        ws = wb.active
        n = max(0, ws.max_row - 1) if ws.max_row else 0
        wb.close()
        return n
    except Exception:
        return None


def _fetch_rounds_draw_info(round_list):
    """
    누락 회차 목록을 독립형 API(get_lotto_round.get_lotto_number)로 조회해 추첨정보만 반환.
    Excel 미사용. 반환: [ { drwNo, date, numbers, bonus }, ... ]
    """
    try:
        from utils.get_lotto_round import get_lotto_number
    except ImportError as e:
        print('[로또] utils.get_lotto_round 임포트 실패: %s' % e)
        return []
    out = []
    for rno in round_list:
        try:
            rno = int(rno)
        except (TypeError, ValueError):
            continue
        try:
            result = get_lotto_number(rno)
        except Exception as e:
            print('[로또] 회차 %s 조회 예외: %s' % (rno, e))
            continue
        if result is not None:
            out.append({
                'drwNo': result.get('drwNo'),
                'date': result.get('date') or '',
                'numbers': result.get('numbers') or [],
                'bonus': result.get('bonus'),
            })
        else:
            print('[로또] 회차 %s: 동행복권 API에서 데이터 없음(또는 접속 실패)' % rno)
    if round_list and not out:
        print('[로또] 누락 회차 %s건 조회 결과 0건. 동행복권 접속/방화벽 확인 필요.' % len(round_list))
    return out



@app.route('/api/shutdown', methods=['POST'])
def api_shutdown():
    """서버 종료"""
    def shutdown_server():
        time.sleep(1)
        print('[Server] Shutting down by user request...')
        os._exit(0)
    
    import threading
    threading.Thread(target=shutdown_server).start()
    return jsonify(returnValue='success', message='Server is shutting down...'), 200, CORS_HEADERS


@app.route('/api/health', methods=['GET', 'OPTIONS'])

@app.route('/api/health/', methods=['GET', 'OPTIONS'])
def api_health():
    """Flask 서버 연결 확인용. 404가 나오면 server.py가 아닌 다른 서버가 8000번에서 동작 중."""
    if request.method == 'OPTIONS':
        return '', 204, CORS_OPTIONS_HEADERS
    return jsonify(returnValue='ok', server='Flask (server.py)', startTime=SERVER_START_TIME), 200, CORS_HEADERS


@app.route('/api/fetch-missing-rounds', methods=['GET', 'OPTIONS'])
@app.route('/api/fetch-missing-rounds/', methods=['GET', 'OPTIONS'])
def api_fetch_missing_rounds():
    """누락 회차 추첨정보만 조회(Excel 미수정). 쿼리: rounds=1201,1202,1209"""
    if request.method == 'OPTIONS':
        return '', 204, CORS_OPTIONS_HEADERS
    rounds_param = request.args.get('rounds', '')
    round_list = [x.strip() for x in rounds_param.split(',') if x.strip()]
    fetched = _fetch_rounds_draw_info(round_list)
    return jsonify(returnValue='success', rounds=fetched), 200, CORS_HEADERS


def _sync_lotto645_xlsx():
    """
    Lotto645.xlsx 검증 후 빠진 회차(1~동행복권 최신회차)를 API로 조회해 추가.
    반환: (success, added, total_rounds, error_msg)
    """
    try:
        import openpyxl
        from utils.get_lotto_round import get_latest_round_no, get_lotto_number
    except ImportError as e:
        return False, 0, 0, 'openpyxl 또는 utils.get_lotto_round 미설치: %s' % e, []

    xlsx_path = (BASE_DIR / 'source' / 'Lotto645.xlsx').resolve()
    if not xlsx_path.is_file():
        return False, 0, 0, 'Lotto645.xlsx 파일이 없습니다.', []

    latest = get_latest_round_no()
    if latest is None:
        return False, 0, 0, '동행복권 API에서 최신 회차를 가져오지 못했습니다.', []

    try:
        wb = openpyxl.load_workbook(xlsx_path)
    except Exception as e:
        return False, 0, 0, 'Lotto645.xlsx 열기 실패(Excel에서 닫아 주세요): %s' % str(e)[:80], []

    ws = wb.active
    if ws.max_row < 2:
        wb.close()
        return False, 0, 0, 'Lotto645.xlsx에 헤더만 있거나 비어 있습니다.', []

    header_row = [ws.cell(1, c).value for c in range(1, ws.max_column + 1)]
    header_row = [str(h).strip() if h is not None else '' for h in header_row]
    idx_round = idx_date = idx_bonus = None
    idx_nums = []
    for i, h in enumerate(header_row):
        c = i + 1
        if h == '회차':
            idx_round = c
        elif h == '날짜':
            idx_date = c
        elif h == '보너스번호':
            idx_bonus = c
        elif h and len(h) == 2 and h.startswith('번호') and h[1].isdigit():
            idx_nums.append((int(h[1]), c))
    idx_nums.sort(key=lambda x: x[0])
    idx_nums = [col for _, col in idx_nums]
    if idx_round is None or idx_date is None or len(idx_nums) != 6 or idx_bonus is None:
        if header_row[:9] != ['회차', '날짜', '번호1', '번호2', '번호3', '번호4', '번호5', '번호6', '보너스번호']:
            wb.close()
            return False, 0, 0, 'Lotto645.xlsx 헤더(회차, 날짜, 번호1~6, 보너스번호)를 찾을 수 없습니다.', []
        idx_round, idx_date = 1, 2
        idx_nums = list(range(3, 9))
        idx_bonus = 9

    existing_rounds = set()
    rows_by_round = {}
    for r in range(2, ws.max_row + 1):
        try:
            rno = int(ws.cell(r, idx_round).value)
        except (TypeError, ValueError):
            continue
        existing_rounds.add(rno)
        row_vals = [ws.cell(r, col).value for col in range(1, ws.max_column + 1)]
        rows_by_round[rno] = row_vals

    need_rounds = sorted(set(range(1, latest + 1)) - existing_rounds)
    if not need_rounds:
        wb.close()
        return True, 0, latest, None, []

    added = 0
    added_rounds = []
    for rno in need_rounds:
        result = get_lotto_number(rno)
        if result is None:
            continue
        row_vals = [None] * ws.max_column
        row_vals[idx_round - 1] = result.get('drwNo')
        row_vals[idx_date - 1] = result.get('date') or ''
        nums = result.get('numbers', [])
        for i, col in enumerate(idx_nums):
            row_vals[col - 1] = nums[i] if i < len(nums) else None
        row_vals[idx_bonus - 1] = result.get('bonus')
        rows_by_round[rno] = row_vals
        added += 1
        added_rounds.append({
            'drwNo': result.get('drwNo'),
            'date': result.get('date') or '',
            'numbers': nums,
            'bonus': result.get('bonus'),
        })

    # 회차 내림차순(최신 회차 먼저)으로 저장
    sorted_rounds = sorted(rows_by_round.keys(), reverse=True)
    while ws.max_row >= 2:
        ws.delete_rows(2, 1)
    for row_idx, rno in enumerate(sorted_rounds, start=2):
        row_vals = rows_by_round[rno]
        for col_idx, val in enumerate(row_vals, start=1):
            ws.cell(row_idx, col_idx, value=val)

    try:
        wb.save(xlsx_path)
        wb.close()
    except PermissionError:
        wb.close()
        return False, 0, 0, 'Lotto645.xlsx 저장 실패(파일 잠김). Excel에서 닫고 다시 시도하세요.', []
    except Exception as e:
        try:
            wb.close()
        except Exception:
            pass
        return False, 0, 0, '저장 실패: %s' % str(e)[:80], []

    # JSON도 갱신
    try:
        from utils.convert_to_json import convert_xlsx_to_json
        convert_xlsx_to_json()
    except Exception as e:
        print('[Lotto645] JSON 변환 실패: %s' % e)

    return True, added, len(sorted_rounds), None, added_rounds


# Lotto645.xlsx 확장 컬럼 (추첨정보: 당첨금·당첨자수·총액)
LOTTO645_EXTRA_HEADERS = ['1등 당첨금액', '1등 당첨자 수', '1등 총당첨금액', '전체 당첨상금 총액']


def _update_latest_lotto645(pre_fetched_data=None):
    """
    최신회차 추첨정보를 Lotto645.xlsx 해당 행에 업데이트합니다.
    pre_fetched_data: 이미 API로 가져온 데이터 딕셔너리 (없으면 내부에서 조회)
    반환: (success, error_msg)
    """
    try:
        import openpyxl
    except ImportError:
        return False, 'openpyxl이 필요합니다.'

    if pre_fetched_data:
        data = pre_fetched_data
        # _to_latest_response 포맷일 수 있으므로 키 매핑 확인 필요
        # 하지만 여기선 _fetch_dhlottery_api 결과(parsed)를 그대로 받는다고 가정
    else:
        # 데이터가 없으면 직접 조회
        data, err = fetch_latest_lotto()
        if err or not data:
            return False, (err or '최신 추첨정보를 가져오지 못했습니다.')
        # fetch_latest_lotto는 _to_latest_response로 변환된 값을 리턴함.
        # 내부 로직엔 원본 키(rnk1WnAmt 등)가 필요할 수 있으나,
        # _to_latest_response 결과물에는 firstWinamnt 등이 있으므로 이를 활용.

    # 데이터 유효성 체크
    drw_no = data.get('drwNo')
    if not drw_no:
        return False, '회차 정보가 없습니다.'

    xlsx_path = (BASE_DIR / 'source' / 'Lotto645.xlsx').resolve()
    if not xlsx_path.is_file():
        return False, 'Lotto645.xlsx 파일이 없습니다.'

    try:
        wb = openpyxl.load_workbook(xlsx_path)
    except Exception as e:
        return False, 'Lotto645.xlsx 열기 실패(Excel에서 닫아 주세요): %s' % str(e)[:80]

    ws = wb.active
    if ws.max_row < 1:
        wb.close()
        return False, 'Lotto645.xlsx에 헤더가 없습니다.'

    header_row = [ws.cell(1, c).value for c in range(1, ws.max_column + 1)]
    header_row = [str(h).strip() if h is not None else '' for h in header_row]

    idx_round = idx_date = idx_bonus = None
    idx_nums = []
    for i, h in enumerate(header_row):
        c = i + 1
        if h == '회차':
            idx_round = c
        elif h == '날짜':
            idx_date = c
        elif h == '보너스번호':
            idx_bonus = c
        elif h and len(h) == 2 and h.startswith('번호') and h[1].isdigit():
            idx_nums.append((int(h[1]), c))
    idx_nums.sort(key=lambda x: x[0])
    idx_nums = [col for _, col in idx_nums]
    if idx_round is None or idx_date is None or len(idx_nums) != 6 or idx_bonus is None:
        wb.close()
        return False, 'Lotto645.xlsx 헤더(회차, 날짜, 번호1~6, 보너스번호)를 찾을 수 없습니다.'

    # 확장 헤더(1등 당첨금액 등) 없으면 추가
    need_extra = LOTTO645_EXTRA_HEADERS
    extra_indices = []
    for eh in need_extra:
        try:
            ci = header_row.index(eh) + 1
        except ValueError:
            ci = None
        extra_indices.append(ci)
    if any(i is None for i in extra_indices):
        for eh in need_extra:
            if eh not in header_row:
                header_row.append(eh)
        max_col = len(header_row)
        for c in range(1, max_col + 1):
            ws.cell(1, c, value=header_row[c - 1] if c <= len(header_row) else None)
        for r in range(2, ws.max_row + 1):
            for c in range(ws.max_column + 1, max_col + 1):
                ws.cell(r, c, value=None)
        idx_1amt = header_row.index('1등 당첨금액') + 1
        idx_1cnt = header_row.index('1등 당첨자 수') + 1
        idx_1sum = header_row.index('1등 총당첨금액') + 1
        idx_tot = header_row.index('전체 당첨상금 총액') + 1
    else:
        idx_1amt, idx_1cnt, idx_1sum, idx_tot = extra_indices

    num_cols = max(ws.max_column, len(header_row))
    
    # 데이터 매핑 (pre_fetched_data가 parsed 원본인지, _to_latest_response 변환본인지에 따라 다름)
    # 여기서는 fetch_latest_lotto() 내부에서 호출 시 원본 parsed를 넘기도록 수정할 예정이므로
    # 원본 키와 변환 키를 모두 고려
    
    row_vals = [None] * num_cols
    row_vals[idx_round - 1] = drw_no
    row_vals[idx_date - 1] = data.get('drwNoDate') or ''
    
    # 당첨번호 매핑
    # parsed 원본: main=[1,2,3,4,5,6] 형태 / _to_latest_response: drwtNo1...drwtNo6
    if 'main' in data:
        nums = data['main']
    else:
        nums = [data.get(f'drwtNo{i}') for i in range(1, 7)]

    for i, col in enumerate(idx_nums):
        row_vals[col - 1] = nums[i] if i < len(nums) else None
        
    row_vals[idx_bonus - 1] = data.get('bnusNo')
    
    # 당첨금 매핑
    # 원본: rnk1WnAmt 등, 변환본: firstWinamnt 등
    # 단, 엑셀에는 '숫자'로 넣어야 함. 포맷팅된 문자열(x,xxx원)이 아님.
    
    def get_int(k1, k2):
        v = data.get(k1)
        if v is None: v = data.get(k2)
        try:
            return int(v)
        except (TypeError, ValueError):
            return None
            
    row_vals[idx_1amt - 1] = get_int('firstWinamnt', 'rnk1WnAmt')
    row_vals[idx_1cnt - 1] = get_int('firstPrzwnerCo', 'rnk1WnNope')
    row_vals[idx_1sum - 1] = get_int('firstAccumamnt', 'rnk1SumWnAmt')
    row_vals[idx_tot - 1] = get_int('totSellamnt', 'wholEpsdSumNtslAmt')

    target_row = None
    for r in range(2, ws.max_row + 1):
        try:
            if int(ws.cell(r, idx_round).value) == int(drw_no):
                target_row = r
                break
        except (TypeError, ValueError):
            continue

    if target_row is not None:
        for col_idx, val in enumerate(row_vals, start=1):
            ws.cell(target_row, col_idx, value=val)
    else:
        # 최신 데이터를 맨 위(2행)에 삽입
        ws.insert_rows(2, 1)
        for col_idx, val in enumerate(row_vals, start=1):
            ws.cell(2, col_idx, value=val)

    try:
        wb.save(xlsx_path)
        wb.close()
    except PermissionError:
        wb.close()
        return False, 'Lotto645.xlsx 저장 실패(파일 잠김). Excel에서 닫고 다시 시도하세요.'
    except Exception as e:
        try:
            wb.close()
        except Exception:
            pass
        return False, '저장 실패: %s' % str(e)[:80]

    # JSON도 갱신
    try:
        from utils.convert_to_json import convert_xlsx_to_json
        convert_xlsx_to_json()
    except Exception as e:
        print('[Lotto645] JSON 변환 실패: %s' % e)

    print('[Lotto645] 최신회차 %s회 추첨정보로 업데이트 완료.' % drw_no)
    return True, None


@app.route('/api/update-latest-lotto645', methods=['POST', 'OPTIONS'])
@app.route('/api/update-latest-lotto645/', methods=['POST', 'OPTIONS'])
def api_update_latest_lotto645():
    """최신회차 추첨정보를 API로 취득해 Lotto645.xlsx 해당 행을 업데이트(당첨회차·추첨일·당첨번호·보너스·1등당첨금·당첨자수·총액)."""
    if request.method == 'OPTIONS':
        return '', 204, CORS_OPTIONS_HEADERS
    success, err = _update_latest_lotto645()
    if err:
        return jsonify(returnValue='fail', error=err), 200, CORS_HEADERS
    return jsonify(returnValue='success'), 200, CORS_HEADERS


@app.route('/api/sync-lotto645', methods=['GET', 'POST', 'OPTIONS'])
@app.route('/api/sync-lotto645/', methods=['GET', 'POST', 'OPTIONS'])
def api_sync_lotto645():
    """Lotto645.xlsx에 빠진 회차(1~동행복권 최신) 추가. Excel 마지막회차 < API 최신회차일 때 호출."""
    if request.method == 'OPTIONS':
        return '', 204, CORS_OPTIONS_HEADERS
    result = _sync_lotto645_xlsx()
    success, added, total_rounds, err, added_rounds = (result[0], result[1], result[2], result[3], result[4] if len(result) > 4 else [])
    if err:
        return jsonify(returnValue='fail', error=err, added=0, totalRounds=0, addedRounds=[]), 200, CORS_HEADERS
    return jsonify(returnValue='success', added=added, totalRounds=total_rounds, addedRounds=added_rounds), 200, CORS_HEADERS


@app.route('/api/lotto645-meta', methods=['GET', 'OPTIONS'])
@app.route('/api/lotto645-meta/', methods=['GET', 'OPTIONS'])
def api_lotto645_meta():
    """Lotto645.xlsx 현재 데이터 행 수 반환. 클라이언트가 캐시 여부 검증용으로 사용."""
    if request.method == 'OPTIONS':
        return '', 204, CORS_OPTIONS_HEADERS
    n = _get_lotto645_data_row_count()
    out = {'dataRows': n} if n is not None else {}
    headers = {**CORS_HEADERS, 'Cache-Control': 'no-store, no-cache, max-age=0', 'Pragma': 'no-cache'}
    return jsonify(out), 200, headers


@app.route('/api/lotto-latest', methods=['GET', 'OPTIONS'])
@app.route('/api/lotto-latest/', methods=['GET', 'OPTIONS'])
def api_lotto_latest():
    if request.method == 'OPTIONS':
        return '', 204, CORS_OPTIONS_HEADERS
    data, err = fetch_latest_lotto()
    if err:
        return jsonify(returnValue='fail', error=err), 200, CORS_HEADERS
    return jsonify(data), 200, CORS_HEADERS


def _get_round_from_lotto645_xlsx(round_no):
    """
    Lotto645.xlsx에서 특정 회차 행을 읽어 API 응답과 동일한 형식(parsed)으로 반환.
    동행복권 API 실패 시 fallback으로 사용. 반환: dict 또는 None
    """
    try:
        import openpyxl
    except ImportError:
        return None
    xlsx_path = (BASE_DIR / 'source' / 'Lotto645.xlsx').resolve()
    if not xlsx_path.is_file():
        return None
    try:
        rno = int(round_no)
    except (TypeError, ValueError):
        return None

    try:
        wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    except Exception:
        return None

    ws = wb.active
    if ws.max_row < 2:
        wb.close()
        return None

    header_row = [ws.cell(1, c).value for c in range(1, ws.max_column + 1)]
    header_row = [str(h).strip() if h is not None else '' for h in header_row]

    idx_round = idx_date = idx_bonus = None
    idx_nums = []
    for i, h in enumerate(header_row):
        c = i + 1
        if h == '회차':
            idx_round = c
        elif h == '날짜':
            idx_date = c
        elif h == '보너스번호':
            idx_bonus = c
        elif h and len(h) == 2 and h.startswith('번호') and h[1].isdigit():
            idx_nums.append((int(h[1]), c))
    idx_nums.sort(key=lambda x: x[0])
    idx_nums = [col for _, col in idx_nums]
    if idx_round is None or idx_date is None or len(idx_nums) != 6 or idx_bonus is None:
        wb.close()
        return None

    idx_1amt = idx_1cnt = idx_1sum = idx_tot = None
    for eh in LOTTO645_EXTRA_HEADERS:
        try:
            idx_1amt = header_row.index('1등 당첨금액') + 1
            idx_1cnt = header_row.index('1등 당첨자 수') + 1
            idx_1sum = header_row.index('1등 총당첨금액') + 1
            idx_tot = header_row.index('전체 당첨상금 총액') + 1
            break
        except ValueError:
            pass

    import datetime
    for r in range(2, ws.max_row + 1):
        try:
            cell_val = ws.cell(r, idx_round).value
            if cell_val is None:
                continue
            if int(cell_val) != rno:
                continue
        except (TypeError, ValueError):
            continue
        
        date_val = ws.cell(r, idx_date).value
        if isinstance(date_val, (datetime.datetime, datetime.date)):
             date_str = date_val.strftime('%Y-%m-%d')
        else:
             date_str = str(date_val).strip() if date_val is not None else ''
        
        # 날짜 문자열에 시간 포함 시 제거 (예: 2025-01-01 00:00:00)
        if ' ' in date_str:
            date_str = date_str.split(' ')[0]

        main = []
        for col in idx_nums:
            v = ws.cell(r, col).value
            try:
                n = int(v) if v is not None and str(v).strip() != '' else None
                main.append(n)
            except (TypeError, ValueError):
                main.append(None)
        if None in main or len(main) != 6:
            continue
        bns = ws.cell(r, idx_bonus).value
        try:
            bnus_no = int(bns) if bns is not None and str(bns).strip() != '' else None
        except (TypeError, ValueError):
            bnus_no = None
        if bnus_no is None:
            continue

        first_win = first_cnt = first_sum = tot_sell = None
        if idx_1amt is not None:
            try:
                v = ws.cell(r, idx_1amt).value
                first_win = int(v) if v is not None and str(v).strip() != '' else None
            except (TypeError, ValueError):
                pass
        if idx_1cnt is not None:
            try:
                v = ws.cell(r, idx_1cnt).value
                first_cnt = int(v) if v is not None and str(v).strip() != '' else None
            except (TypeError, ValueError):
                pass
        if idx_1sum is not None:
            try:
                v = ws.cell(r, idx_1sum).value
                first_sum = int(v) if v is not None and str(v).strip() != '' else None
            except (TypeError, ValueError):
                pass
        if idx_tot is not None:
            try:
                v = ws.cell(r, idx_tot).value
                tot_sell = int(v) if v is not None and str(v).strip() != '' else None
            except (TypeError, ValueError):
                pass

        wb.close()
        return {
            'drwNo': rno,
            'drwNoDate': date_str,
            'main': main,
            'bnusNo': bnus_no,
            'rnk1WnAmt': first_win,  # _to_latest_response 호환
            'firstWinamnt': first_win,
            'firstPrzwnerCo': first_cnt,
            'firstAccumamnt': first_sum,
            'totSellamnt': tot_sell,
            'source': 'Lotto645.xlsx (로컬)',
        }

    wb.close()
    return None


# --- Google Gemini AI 설정 ---
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print('[경고] GEMINI_API_KEY가 없습니다.')


@app.route('/api/ask-gemini', methods=['POST', 'OPTIONS'])
def api_ask_gemini():
    """Lotto645 최근 10회 데이터를 바탕으로 AI에게 질문"""
    if request.method == 'OPTIONS':
        return '', 204, CORS_OPTIONS_HEADERS

    if not GEMINI_API_KEY:
        print('[Gemini API 오류] API 키가 설정되지 않음.')
        return jsonify(returnValue='fail', error='API 키가 설정되지 않았습니다. .env 파일을 확인하세요.'), 200, CORS_HEADERS
        

    try:
        req_data = request.get_json() or {}
        user_question = req_data.get('question', '최근 로또 번호 패턴 분석해줘')
        start_round_param = req_data.get('startRound')
        end_round_param = req_data.get('endRound')
        
        # 최근 로또 데이터 로드 (JSON)
        json_path = (BASE_DIR / 'source' / 'Lotto645.json').resolve()
        
        recent_data = []
        analyze_count = 30  # 기본 분석 데이터 수

        if json_path.is_file():
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data:
                    # 1. 숫자형 회차 변환 및 정렬
                    for item in data:
                        item['_round_int'] = int(item.get('회차', 0))
                    
                    data.sort(key=lambda x: x['_round_int'], reverse=True)

                    max_analyze_count = 100
                    try:
                        s_target = int(start_round_param) if start_round_param else None
                        e_target = int(end_round_param) if end_round_param else None
                        
                        if s_target and e_target:
                            # 사용자가 지정한 범위 필터링
                            matched_data = [item for item in data if s_target <= item['_round_int'] <= e_target]
                            # 너무 많은 데이터는 AI 처리에 부담이 될 수 있으므로 최근 N개로 제한
                            if len(matched_data) > max_analyze_count:
                                recent_data = matched_data[:max_analyze_count]
                            else:
                                recent_data = matched_data
                        else:
                            # 범위가 없으면 최신 N회차
                            recent_data = data[:analyze_count]
                    except (ValueError, TypeError):
                        # 파라미터 오류 시 기본값 사용
                        recent_data = data[:analyze_count]

                    # 3. 시계열 분석을 위해 과거 -> 최신 순(오름차순)으로 재정렬
                    recent_data.sort(key=lambda x: x['_round_int'])
        
        if not recent_data:
            return jsonify(returnValue='fail', error='분석할 로또 데이터가 없습니다.'), 200, CORS_HEADERS

        analysis_range_text = f"{recent_data[0]['_round_int']}회 ~ {recent_data[-1]['_round_int']}회" if len(recent_data) > 1 else f"{recent_data[0]['_round_int']}회"
        history_text = f"분석 대상 범위: {analysis_range_text} (총 {len(recent_data)}회차)\n"
        history_text += "로또 당첨번호 이력 (과거 -> 최신순):\n"
        for row in recent_data:
            nums = [row.get(f'번호{i}') for i in range(1, 7)]
            history_text += f"- {row.get('회차')}회 ({row.get('날짜')}): {nums} + 보너스 {row.get('보너스번호')}\n"
        
        # AI 분석 모듈 호출
        try:
            from utils.ai_analysis import analyze_lotto_patterns
            answer = analyze_lotto_patterns(history_text, user_question, GEMINI_API_KEY)
            
            if answer:
                return jsonify(returnValue='success', answer=answer), 200, CORS_HEADERS
            else:
                return jsonify(returnValue='fail', error='AI 응답이 비어있습니다.'), 200, CORS_HEADERS
                
        except ImportError:
             return jsonify(returnValue='fail', error='AI 분석 모듈을 로드할 수 없습니다.'), 500, CORS_HEADERS
        except Exception as e:
             # AI 호출 실패 시 로그 남기고 클라이언트엔 간단히 전달
             print(f'[Gemini API 오류] {e}')
             return jsonify(returnValue='fail', error=f'AI 분석 중 오류가 발생했습니다: {str(e)[:100]}'), 200, CORS_HEADERS

    except Exception as e:
        print(f'[API 오류] {e}')
        return jsonify(returnValue='fail', error=f'서버 내부 오류: {str(e)[:100]}'), 200, CORS_HEADERS


@app.route('/api/lotto-round/<int:round_no>', methods=['GET', 'OPTIONS'])
@app.route('/api/lotto-round/<int:round_no>/', methods=['GET', 'OPTIONS'])
def api_lotto_round(round_no):
    """특정 회차 추첨정보 (동행복권 최신 추첨정보와 동일 형식). API 실패 시 Lotto645.xlsx 로컬 fallback."""
    if request.method == 'OPTIONS':
        return '', 204, CORS_OPTIONS_HEADERS
    
    from utils.get_lotto_round import get_lotto_number
    parsed = get_lotto_number(round_no)
    if not parsed:
        parsed = _get_round_from_lotto645_xlsx(round_no)
    if not parsed:
        return jsonify(returnValue='fail', error='해당 회차(%s) 추첨정보를 가져오지 못했습니다.' % round_no), 200, CORS_HEADERS
    return jsonify(_to_latest_response(parsed)), 200, CORS_HEADERS


# --- 정적 파일 (루트 및 하위 경로) ---
def _mimetype_with_charset(path):
    """한글 깨짐 방지: 텍스트 파일에 charset=utf-8 적용"""
    p = path.lower()
    if p.endswith('.html') or p.endswith('.htm'):
        return 'text/html; charset=utf-8'
    if p.endswith('.js'):
        return 'application/javascript; charset=utf-8'
    if p.endswith('.css'):
        return 'text/css; charset=utf-8'
    return None


@app.route('/')
def index():
    resp = send_from_directory(BASE_DIR, 'index.html')
    resp.headers['Content-Type'] = 'text/html; charset=utf-8'
    return resp


@app.route('/<path:path>')
def static_file(path):
    full = (BASE_DIR / path).resolve()
    base_resolved = BASE_DIR.resolve()
    if not str(full).startswith(str(base_resolved)) or not full.is_file():
        print('[404] 파일 없음: /%s  (기대 경로: %s)' % (path, full))
        return '404 - 파일을 찾을 수 없습니다.', 404, {'Content-Type': 'text/plain; charset=utf-8'}
    resp = send_from_directory(BASE_DIR, path)
    mimetype = _mimetype_with_charset(path)
    if mimetype:
        resp.headers['Content-Type'] = mimetype
    # Lotto645.xlsx 등 데이터 파일은 매번 서버에서 새로 읽도록 캐시 비활성화 (브라우저/프록시 캐시 방지)
    path_lower = path.replace('\\', '/').lower()
    if path_lower.endswith('.xlsx') or 'lotto645.xlsx' in path_lower or 'lotto023.xlsx' in path_lower:
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
    return resp


if __name__ == '__main__':
    # 서버 시작 시 JSON 파일 갱신 (Lotto023.xlsx 수정 사항 반영)
    try:
        from utils.convert_to_json import convert_xlsx_to_json
        print('[초기화] XLSX -> JSON 변환 시작...')
        convert_xlsx_to_json()
    except Exception as e:
        print('[초기화] JSON 변환 실패: %s' % e)

    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() in ('1', 'true', 'yes')
    print('서버 시작: http://localhost:%s/' % PORT)
    app.run(host='0.0.0.0', port=PORT, debug=debug_mode)
