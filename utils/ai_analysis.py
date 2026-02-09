# -*- coding: utf-8 -*-
"""
AI 분석 모듈 (Gemini API)
- 로또 번호 패턴 분석 및 질의응답 처리
"""
import os
from google import genai
from google.genai import types

def analyze_lotto_patterns(history_text, user_question, api_key):
    """
    Gemini API를 사용하여 로또 번호 패턴을 분석하고 사용자 질문에 답변합니다.
    
    Args:
        history_text (str): 분석할 로또 당첨번호 이력 텍스트
        user_question (str): 사용자 질문
        api_key (str): Google Gemini API Key
        
    Returns:
        str: AI 답변 텍스트
        
    Raises:
        Exception: API 호출 실패 시 예외 발생
    """
    if not api_key:
        raise ValueError("API 키가 설정되지 않았습니다.")

    prompt = f"""
당신은 로또 번호 분석 전문가입니다. 다음 데이터를 바탕으로 사용자의 질문에 답변해주세요.
{history_text}

사용자 질문: {user_question}

답변은 친절하고 전문적으로, 그리고 확률적 근거(홀짝, 번호대, 미출현 번호 등)를 들어 설명해주세요.
답변 끝에는 "이 분석은 참고용이며, 당첨을 보장하지 않습니다."라는 문구를 추가해주세요.
"""

    client = genai.Client(api_key=api_key)
    
    # 시도할 모델 리스트 (최신순)
    # 2.0-flash는 현재 프리뷰 단계라 지역이나 계정에 따라 제한될 수 있음
    models_to_try = [
        'gemini-2.0-flash', 
        'gemini-1.5-flash', 
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro'
    ]
    
    last_error = None
    errors = []

    for model_name in models_to_try:
        try:
            # print(f'[Gemini API] Trying {model_name}...')
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            if response and response.text:
                return response.text
            else:
                errors.append(f"{model_name}: Empty response")
        except Exception as e:
            last_error = str(e)
            errors.append(f"{model_name}: {last_error}")
            # 401 Unauthorized 등은 다시 시도해도 가망 없으므로 즉시 중단
            if '401' in last_error or 'API_KEY_INVALID' in last_error:
                raise Exception(f"API 키가 올바르지 않습니다: {last_error[:100]}")
            continue
    
    # 모든 모델 시도 후 실패 시
    error_summary = "; ".join(errors)
    raise Exception(f"모든 AI 모델 호출에 실패했습니다. (상세: {error_summary[:200]}...)")

