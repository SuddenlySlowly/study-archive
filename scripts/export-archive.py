#!/usr/bin/env python3
"""Build data/archive.json from the Google Doc dump plus link and figure notes.

Summaries, titles, sources, tags, and statuses are copied from the dump.
Figure numbers are checked against each summary before the file is written.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DUMP_CANDIDATES = [
    Path("/home/ubuntu/.cursor/projects/workspace/uploads/study-archive-doc_dcc8.json"),
    ROOT / "data" / "source-dump.json",
]

PROFILE = "https://x.com/sshleo84"
STATUS_URL = {
    "반도체 사이클은 끝나가는가": "https://x.com/sshleo84/status/2110860757726646291",
    "9월 수출입 물가지수": "https://x.com/sshleo84/status/2111075884652429616",
}
YOUTUBE_URL = {
    "돈의 신뢰와 비트코인·이더리움": "https://youtu.be/kRmwzk0MRvo",
    "병목에서 해자로: AI 시대 투자 전략 (성상현)": "https://youtu.be/DLu-u4xo3Pc",
}

TOPICS = [
    {
        "id": "ai-education",
        "name": "AI·교육",
        "en": "AI & Education",
        "blurb": "장하석 대담에서 붙잡은, AI와 교육 경험에 대한 메모.",
        "color": "#3d4fa3",
        "colorDark": "#b7c2ff",
        "overviewCount": 1,
        "overviewLatest": "2026-10-08",
    },
    {
        "id": "economy",
        "name": "경제",
        "en": "Economy",
        "blurb": "매크로비욘드와 관련 영상에서 붙잡은 금리, 물가, AI 투자 메모.",
        "color": "#8a4b12",
        "colorDark": "#f0b27a",
        "overviewCount": 18,
        "overviewLatest": "2026-10-16",
    },
    {
        "id": "agents",
        "name": "AI·에이전트",
        "en": "Agents",
        "blurb": "코딩 에이전트의 신뢰와 구글 AI 인프라에 대한 메모.",
        "color": "#0f6e62",
        "colorDark": "#8ee0d4",
        "overviewCount": 2,
        "overviewLatest": "2026-10-15",
    },
    {
        "id": "security",
        "name": "국제·안보",
        "en": "Security",
        "blurb": "북한 DMZ 요새화와 김여정 담화를 다룬 메모.",
        "color": "#8e2f3f",
        "colorDark": "#f3b3bd",
        "overviewCount": 1,
        "overviewLatest": "2026-10-11",
    },
]

IDS = {
    "AI 시대 교육의 방향 (장하석 대담)": "education-direction",
    "돈의 신뢰와 비트코인·이더리움": "money-trust-btc-eth",
    "AI 붐과 '네덜란드병', 연준의 금리 딜레마 (아폴로)": "ai-dutch-disease",
    "AI 투자의 병목과 소부장·전력망 기회": "ai-bottleneck-supply",
    "장기물 국채 입찰 중단·YCC 주장 (인용)": "ycc-treasury",
    "병목에서 해자로: AI 시대 투자 전략 (성상현)": "bottleneck-to-moat",
    "AI 거품론을 넘는 투자 질문": "ai-bubble-questions",
    "주가 조정과 사이클 끝의 구분": "correction-vs-cycle",
    "시장에서 오래 살아남으려면 늘 학생으로": "stay-a-student",
    "미국 9월 CPI 결과": "cpi-sep",
    "고금리 긴축 효과는 나뉘어 전달된다": "rates-pass-through",
    "AI 인프라 투자는 언제까지 지속될까": "ai-spend-duration",
    "앤트로픽 3분기 실적·S-1 경고": "anthropic-q3",
    "인플레이션 수혜주·방어주 구분": "inflation-winners",
    "코스피 Deep Value 신호와 반등": "kospi-deep-value",
    "9월 PPI 생산자물가 결과": "ppi-sep",
    "9월 소매판매·주간 실업수당": "retail-claims-sep",
    "반도체 사이클은 끝나가는가": "semiconductor-cycle",
    "9월 수출입 물가지수": "trade-prices-sep",
    "코딩 에이전트를 믿고 맡기는 법 (Lauren Tan 토크)": "coding-agent-trust",
    "구글 AI 인프라: TPU 공동설계·굿푻·전력 (아민 바흐다트)": "google-ai-infra",
    "북한의 DMZ 국경 요새화와 김여정 담화": "dprk-dmz",
}


def visuals_for(title: str) -> tuple[list, list]:
    """Return (highlights, visuals) for a known title."""
    # Strings below are checked against the summary after the dump is loaded.
    if title == "AI 시대 교육의 방향 (장하석 대담)":
        return [], [
            {
                "type": "flow",
                "title": "해법",
                "caption": "계산기처럼 '할 줄 아는 일'을 빠르게 하려고 써야지, 못하는 일의 결과만 받아오면 교육이 무너진다. 해법은 정답 없는 탐구 경험, 왜 배우는지 의미 주기, AI는 결과를 검토하고 책임지는 '조수'로 쓰기.",
                "steps": [
                    "계산기처럼 '할 줄 아는 일'을 빠르게",
                    "못하는 일의 결과만 받아오면 교육이 무너진다",
                    "정답 없는 탐구 경험",
                    "왜 배우는지 의미 주기",
                    "결과를 검토하고 책임지는 '조수'",
                ],
            }
        ]
    if title == "돈의 신뢰와 비트코인·이더리움":
        return [], [
            {
                "type": "flow",
                "title": "믿음이 옮겨가는 역사",
                "caption": "화폐의 역사는 믿음이 옮겨가는 역사(금 → 국가 제도 → 코드·네트워크 실험).",
                "steps": ["금", "국가 제도", "코드·네트워크 실험"],
            },
            {
                "type": "split",
                "title": "은행 없는 공동 장부",
                "caption": "비트코인은 장비·전기 비용(작업증명)으로, 이더리움은 자산을 맡기는 보증금(지분증명)으로 은행 없는 공동 장부를 지킨다.",
                "columns": [
                    {"title": "비트코인", "points": ["장비·전기 비용(작업증명)"]},
                    {"title": "이더리움", "points": ["자산을 맡기는 보증금(지분증명)"]},
                ],
            },
            {"type": "callout", "tone": "warn", "text": "매수 권유 아님"},
        ]
    if title == "AI 붐과 '네덜란드병', 연준의 금리 딜레마 (아폴로)":
        return [], [
            {
                "type": "split",
                "title": "서로 다른 속도",
                "caption": "AI 기업들은 데이터센터·반도체·전력·인력을 선점하느라 금리가 높아도 투자를 쉽게 줄이지 않지만 주택·자동차는 금리에 민감해 수요 둔화와 비용 상승을 함께 겪을 수 있다고 설명.",
                "columns": [
                    {
                        "title": "AI 기업들",
                        "points": ["데이터센터", "반도체", "전력", "인력", "금리가 높아도 투자를 쉽게 줄이지 않지만"],
                    },
                    {
                        "title": "주택·자동차",
                        "points": ["금리에 민감", "수요 둔화와 비용 상승"],
                    },
                ],
            },
            {
                "type": "callout",
                "tone": "note",
                "text": "연준은 하나의 금리로 서로 다른 속도의 산업을 조절해야 하며, 전력·인력·설비 공급 제약이 물가 압력으로 이어지면 금리 인하 여지가 좁아질 수 있다는 관점.",
            },
        ]
    if title == "AI 투자의 병목과 소부장·전력망 기회":
        return [], [
            {
                "type": "split",
                "title": "돈이 어디서 막히는지",
                "caption": "반도체 공급 부족은 생산능력 확대·첨단 패키징과 소재·부품·장비 수요로, 데이터센터 전력 수요는 송전망·변압기·배전설비와 ESS(배터리·전력변환장치·제어시스템) 수요로 이어질 수 있다.",
                "columns": [
                    {"title": "반도체 공급 부족", "points": ["생산능력 확대", "첨단 패키징", "소재·부품·장비"]},
                    {"title": "데이터센터 전력 수요", "points": ["송전망", "변압기", "배전설비", "ESS(배터리·전력변환장치·제어시스템)"]},
                ],
            },
            {
                "type": "checklist",
                "title": "확인해야 한다고 강조",
                "caption": "실제 수주 연결, 기술 경쟁력·가격 결정력, 매출이 이익·현금흐름으로 이어지는지 확인해야 한다고 강조.",
                "items": ["실제 수주 연결", "기술 경쟁력·가격 결정력", "매출이 이익·현금흐름으로 이어지는지"],
            },
        ]
    if title == "장기물 국채 입찰 중단·YCC 주장 (인용)":
        return [
            {
                "labelParts": ["절사평균 PCE"],
                "display": "2.2%",
                "detailParts": ["2.2% 근처"],
                "quote": "절사평균 PCE가 2.2% 근처",
                "home": False,
            }
        ], [
            {
                "type": "stats",
                "title": "절사평균 PCE",
                "caption": "절사평균 PCE가 2.2% 근처라 광범위한 인플레이션 확산의 증거는 약하다며",
                "items": [{"k": "절사평균 PCE", "v": "2.2%"}],
            },
            {
                "type": "flow",
                "title": "인용 원문",
                "caption": "인용 원문은 채권 자경단의 신뢰를 얻을 때까지 20·30년물 신규 국채 입찰을 일시 중단하고 표적형 수익률곡선통제(YCC)를 도입해 시간을 벌자고 주장한다.",
                "steps": [
                    "20·30년물 신규 국채 입찰을 일시 중단",
                    "표적형 수익률곡선통제(YCC)",
                    "시간을 벌자",
                ],
            },
            {"type": "quote", "text": "'현실화 될 수 있을까'"},
        ]
    if title == "병목에서 해자로: AI 시대 투자 전략 (성상현)":
        return [
            {
                "labelParts": ["선행 PER"],
                "display": "5.3배",
                "detailParts": ["3년 범위 5.1~11배"],
                "quote": "선행 PER 5.3배(3년 범위 5.1~11배)",
                "home": True,
            }
        ], [
            {
                "type": "flow",
                "title": "병목에서 해자",
                "caption": "AI 인프라는 처음엔 병목(파운드리·메모리·HBM·전력·원전)에서 시작하지만, 결국 이를 활용해 생산성을 높이는 기업(해자: 팔란티어 같은 소프트웨어·클라우드)으로 돈이 옮겨간다는 관점.",
                "steps": ["파운드리·메모리·HBM·전력·원전", "팔란티어 같은 소프트웨어·클라우드"],
            },
            {
                "type": "range",
                "title": "선행 PER",
                "caption": "코스피는 선행 PER 5.3배(3년 범위 5.1~11배)로 저평가·과매도라 팔 때는 아니지만",
                "min": "5.1",
                "max": "11",
                "value": "5.3",
                "unit": "배",
            },
            {
                "type": "split",
                "title": "돈이 가는 곳",
                "caption": "한국은 삼성전자·하이닉스 설비투자 수혜 소부장, 미국은 소프트웨어로 돈이 간다고 보며 IT·에너지 섹터와 동일가중 전략을 선호.",
                "columns": [
                    {"title": "한국", "points": ["삼성전자·하이닉스 설비투자 수혜 소부장"]},
                    {"title": "미국", "points": ["소프트웨어로 돈이 간다", "IT·에너지 섹터", "동일가중 전략"]},
                ],
            },
            {"type": "callout", "tone": "note", "text": "6,700선 회복을 확인한 뒤 비중을 늘리자고 제안."},
            {"type": "callout", "tone": "note", "text": "2027년 상반기 물가 상승률이 둔화(5월쯤 2% 하회 추정)"},
        ]
    if title == "AI 거품론을 넘는 투자 질문":
        return [], [
            {
                "type": "checklist",
                "title": "투자자가 알아야 할 것",
                "caption": "투자가 실제 유료 사용으로 이어지는지, 사용이 고객의 비용 절감·매출 증가로 이어지는지, 그 성과를 어느 기업이 이익·현금흐름으로 가져가는지를 묻는다.",
                "items": [
                    "투자가 실제 유료 사용으로 이어지는지",
                    "사용이 고객의 비용 절감·매출 증가로 이어지는지",
                    "그 성과를 어느 기업이 이익·현금흐름으로 가져가는지",
                ],
            },
            {
                "type": "flow",
                "title": "순서",
                "caption": "‘돈의 방향 → 산업 → 주도주’ 순서로 보고",
                "steps": ["돈의 방향", "산업", "주도주"],
            },
        ]
    if title == "주가 조정과 사이클 끝의 구분":
        return [], [
            {
                "type": "split",
                "title": "같은 시점에 오지 않으며",
                "caption": "주가 하락·기업 이익 정점·산업 성장 둔화는 같은 시점에 오지 않으며",
                "columns": [
                    {"title": "주가 하락", "points": ["같은 시점에 오지 않으며"]},
                    {"title": "기업 이익 정점", "points": ["같은 시점에 오지 않으며"]},
                    {"title": "산업 성장 둔화", "points": ["같은 시점에 오지 않으며"]},
                ],
            },
            {"type": "quote", "text": "한국 시장 급락을 장기 하락장의 시작이 아니라 AI 투자 사이클 속 조정으로 본다."},
        ]
    if title == "시장에서 오래 살아남으려면 늘 학생으로":
        return [], [
            {"type": "quote", "text": "‘내 판단이 틀렸다면 어떤 증거가 나타날까’"},
            {
                "type": "split",
                "title": "가격이 떨어졌을 때",
                "caption": "가격이 떨어졌을 땐 기업 가치가 달라졌는지 가격만 달라졌는지 다시 확인해야 한다고 말한다.",
                "columns": [
                    {"title": "기업 가치", "points": ["기업 가치가 달라졌는지"]},
                    {"title": "가격", "points": ["가격만 달라졌는지"]},
                ],
            },
        ]
    if title == "미국 9월 CPI 결과":
        highlights = [
            {
                "labelParts": ["헤드라인 CPI", "전년비"],
                "display": "+3.7%",
                "detailParts": ["예상 3.6%", "전월 3.4%"],
                "quote": "전년비 +3.7%(예상 3.6%, 전월 3.4%)",
                "relation": "예상 상회",
                "relationQuote": "예상을 소폭 웃돌았다",
                "home": True,
            },
            {
                "labelParts": ["헤드라인 CPI", "전월비"],
                "display": "+0.6%",
                "detailParts": ["예상 +0.6%", "전월 +0.4%"],
                "quote": "전월비 +0.6%(예상 +0.6%, 전월 +0.4%)",
                "home": False,
            },
            {
                "labelParts": ["근원 CPI", "전년비"],
                "display": "+2.6%",
                "detailParts": ["예상 2.5%", "전월 2.4%"],
                "quote": "전년비 +2.6%(예상 2.5%, 전월 2.4%)",
                "home": False,
            },
        ]
        visuals = [
            {
                "type": "grouped-bar",
                "title": "헤드라인 CPI",
                "unit": "%",
                "caption": "헤드라인 CPI는 전월비 +0.6%(예상 +0.6%, 전월 +0.4%), 전년비 +3.7%(예상 3.6%, 전월 3.4%)로 예상을 소폭 웃돌았다.",
                "series": ["실제", "예상", "전월"],
                "rows": [
                    {"label": "전월비", "values": ["+0.6", "+0.6", "+0.4"]},
                    {"label": "전년비", "values": ["+3.7", "3.6", "3.4"]},
                ],
            },
            {
                "type": "grouped-bar",
                "title": "근원 CPI",
                "unit": "%",
                "caption": "근원 CPI는 전월비 +0.3%(예상 +0.2%), 전년비 +2.6%(예상 2.5%, 전월 2.4%)였고",
                "series": ["실제", "예상", "전월"],
                "rows": [
                    {"label": "전월비", "values": ["+0.3", "+0.2", None]},
                    {"label": "전년비", "values": ["+2.6", "2.5", "2.4"]},
                ],
            },
            {
                "type": "bars",
                "title": "항목별로는",
                "unit": "%",
                "caption": "항목별로는 에너지 +5.2%, 주거비 +0.4%, 운송서비스 +0.6%, 음식 0.0%(모두 전월비)였다.",
                "rows": [
                    {"label": "에너지", "value": "+5.2"},
                    {"label": "주거비", "value": "+0.4"},
                    {"label": "운송서비스", "value": "+0.6"},
                    {"label": "음식", "value": "0.0"},
                ],
            },
            {
                "type": "grouped-bar",
                "title": "실질 평균임금",
                "unit": "%",
                "caption": "실질 평균임금은 시간당 전년비 -0.7%(전월 -0.3%), 주간당 -0.1%(전월 +0.4%)로 감소했다.",
                "series": ["실제", "전월"],
                "rows": [
                    {"label": "시간당 전년비", "values": ["-0.7", "-0.3"]},
                    {"label": "주간당", "values": ["-0.1", "+0.4"]},
                ],
            },
        ]
        return highlights, visuals
    if title == "고금리 긴축 효과는 나뉘어 전달된다":
        return [], [
            {
                "type": "split",
                "title": "나누어 전달",
                "caption": "고금리는 긴축 효과를 잃는 것이 아니라 그 효과를 서로 다른 계층과 시점에 나누어 전달한다는 짧은 코멘트.",
                "columns": [
                    {"title": "계층", "points": ["서로 다른 계층"]},
                    {"title": "시점", "points": ["시점에 나누어 전달"]},
                ],
            },
            {"type": "quote", "text": "경제 전체의 평균만 보면 이 차이를 놓치기 쉬우며, 물가도 마찬가지라고 덧붙였다."},
        ]
    if title == "AI 인프라 투자는 언제까지 지속될까":
        highlights = [
            {
                "labelParts": ["±10% 안으로 맞힌"],
                "display": "11%",
                "detailParts": ["지난해 15%", "396개 기업"],
                "quote": "11%(지난해 15%)",
                "home": True,
            },
            {
                "labelParts": ["62%"],
                "display": "62%",
                "detailParts": ["의사결정을 바꿨으며"],
                "quote": "62%가 예상 밖 AI 비용으로 의사결정을 바꿨으며",
                "home": False,
            },
            {
                "labelParts": ["63%"],
                "display": "63%",
                "detailParts": ["6~15%p"],
                "quote": "63%는 매출총이익률이 6~15%p 낮아졌다고 답했다",
                "home": False,
            },
        ]
        visuals = [
            {
                "type": "grouped-bar",
                "title": "예상치 ±10% 안으로 맞힌 기업",
                "unit": "%",
                "caption": "AI 지출을 예상치 ±10% 안으로 맞힌 기업은 11%(지난해 15%)뿐이고",
                "series": ["11%", "지난해"],
                "rows": [{"label": "±10% 안", "values": ["11", "15"]}],
            },
            {
                "type": "stats",
                "title": "396개 기업 설문",
                "caption": "Mavvrik·Benchmarkit의 396개 기업 설문에서 AI 지출을 예상치 ±10% 안으로 맞힌 기업은 11%(지난해 15%)뿐이고, 62%가 예상 밖 AI 비용으로 의사결정을 바꿨으며 63%는 매출총이익률이 6~15%p 낮아졌다고 답했다.",
                "items": [
                    {"k": "기업 설문", "v": "396개"},
                    {"k": "의사결정을 바꿨으며", "v": "62%"},
                    {"k": "매출총이익률", "v": "63%"},
                    {"k": "6~15%p", "v": "6~15%p"},
                ],
            },
            {"type": "quote", "text": "토큰 가격 하락은 AI 투자의 끝이 아니라 새로운 수요의 시작이라고 결론짓고"},
        ]
        return highlights, visuals
    if title == "앤트로픽 3분기 실적·S-1 경고":
        return [
            {
                "labelParts": ["3분기 매출"],
                "display": "168억 달러",
                "detailParts": ["약 50%"],
                "quote": "3분기 매출이 168억 달러로 2분기 대비 약 50% 급증",
                "home": True,
            }
        ], [
            {
                "type": "stats",
                "title": "3분기 매출",
                "caption": "앤트로픽의 3분기 매출이 168억 달러로 2분기 대비 약 50% 급증했고, 조정 기준 흑자와 플러스 현금흐름을 기록했다.",
                "items": [
                    {"k": "3분기 매출", "v": "168억 달러"},
                    {"k": "2분기 대비", "v": "약 50%"},
                ],
            },
            {"type": "callout", "tone": "note", "text": "조정 기준 흑자와 플러스 현금흐름을 기록했다."},
            {
                "type": "callout",
                "tone": "warn",
                "text": "기업공개 등록신고서(S-1) 초안에서는 AI가 인류의 존립을 위협하는 위험을 초래할 수 있다고 경고했다.",
            },
        ]
    if title == "인플레이션 수혜주·방어주 구분":
        return [], [
            {
                "type": "split",
                "title": "인플레이션은",
                "caption": "인플레이션은 물가 수준이 아니라 상승 속도이며, 원천(민간 수요 vs 재정·공급)에 따라 금리 인상의 전달 경로가 달라진다고 본다.",
                "columns": [
                    {"title": "물가 수준", "points": ["물가 수준이 아니라"]},
                    {"title": "상승 속도", "points": ["상승 속도"]},
                    {"title": "민간 수요", "points": ["민간 수요 vs 재정·공급"]},
                    {"title": "재정·공급", "points": ["재정·공급"]},
                ],
            }
        ]
    if title == "코스피 Deep Value 신호와 반등":
        return [
            {
                "labelParts": ["1·3월 신호 후 다음 달"],
                "display": "19.5%, 30.6%",
                "detailParts": ["각각"],
                "quote": "1·3월 신호 후 다음 달 수익률은 각각 19.5%, 30.6%",
                "home": False,
            },
            {
                "labelParts": ["7월 신호 후 3개월"],
                "display": "–8.5%",
                "quote": "7월 신호 후 3개월은 –8.5%",
                "home": False,
            },
        ], [
            {
                "type": "stats",
                "title": "Deep Value 신호",
                "caption": "2026년 1·3월 신호 후 다음 달 수익률은 각각 19.5%, 30.6%였으나 7월 신호 후 3개월은 –8.5%였다.",
                "items": [
                    {"k": "1·3월 신호 후 다음 달", "v": "19.5%, 30.6%"},
                    {"k": "7월 신호 후 3개월", "v": "–8.5%"},
                ],
            },
            {"type": "quote", "text": "싸다는 이유만으로 현금을 한꺼번에 투입할 필요는 없다고 말한다."},
        ]
    if title == "9월 PPI 생산자물가 결과":
        return [
            {
                "labelParts": ["9월 PPI", "전년비"],
                "display": "+6.3%",
                "detailParts": ["예상 +5.4%"],
                "quote": "전년비 +6.3%(예상 +5.4%)",
                "relation": "예상 상회",
                "relationQuote": "예상을 크게 웃돌았다",
                "home": True,
            },
            {
                "labelParts": ["9월 PPI", "전월비"],
                "display": "+1.3%",
                "detailParts": ["예상 +0.6%"],
                "quote": "전월비 +1.3%(예상 +0.6%)",
                "relation": "예상 상회",
                "relationQuote": "예상을 크게 웃돌았다",
                "home": False,
            },
            {
                "labelParts": ["핵심 PPI", "전년비"],
                "display": "+5.0%",
                "detailParts": ["예상치를 상회"],
                "quote": "전년비 +5.0%로 예상치를 상회",
                "relation": "예상 상회",
                "relationQuote": "예상치를 상회",
                "home": False,
            },
        ], [
            {
                "type": "grouped-bar",
                "title": "9월 PPI",
                "unit": "%",
                "caption": "9월 PPI는 전월비 +1.3%(예상 +0.6%), 전년비 +6.3%(예상 +5.4%)로 예상을 크게 웃돌았다.",
                "series": ["실제", "예상"],
                "rows": [
                    {"label": "전월비", "values": ["+1.3", "+0.6"]},
                    {"label": "전년비", "values": ["+6.3", "+5.4"]},
                ],
            },
            {
                "type": "bars",
                "title": "핵심 PPI",
                "unit": "%",
                "caption": "핵심 PPI도 전월비 +0.7%, 전년비 +5.0%로 예상치를 상회했고",
                "rows": [
                    {"label": "전월비", "value": "+0.7"},
                    {"label": "전년비", "value": "+5.0"},
                ],
            },
            {
                "type": "bars",
                "title": "상승 폭",
                "unit": "%",
                "caption": "에너지(+10.8%), 재화(+2.6%), 운송·창고(+3.4%) 등에서 상승 폭이 컸다.",
                "rows": [
                    {"label": "에너지", "value": "+10.8"},
                    {"label": "재화", "value": "+2.6"},
                    {"label": "운송·창고", "value": "+3.4"},
                ],
            },
        ]
    if title == "9월 소매판매·주간 실업수당":
        return [
            {
                "labelParts": ["9월 소매판매", "전월비"],
                "display": "+0.8%",
                "detailParts": ["예상 +0.3%"],
                "quote": "전월비 +0.8%(예상 +0.3%)",
                "home": True,
            },
            {
                "labelParts": ["핵심 소매판매"],
                "display": "+0.2%",
                "detailParts": ["예상과 같았다"],
                "quote": "+0.2%로 예상과 같았다",
                "relation": "예상 부합",
                "relationQuote": "예상과 같았다",
                "home": False,
            },
            {
                "labelParts": ["주간 실업수당"],
                "display": "19만9천건",
                "detailParts": ["20만건", "하회"],
                "quote": "19만9천건으로 예상(20만건)을 하회",
                "relation": "예상 하회",
                "relationQuote": "하회",
                "home": False,
            },
        ], [
            {
                "type": "grouped-bar",
                "title": "9월 소매판매",
                "unit": "%",
                "caption": "9월 소매판매는 전월비 +0.8%(예상 +0.3%)",
                "series": ["실제", "예상"],
                "rows": [
                    {"label": "전월비", "values": ["+0.8", "+0.3"]},
                ],
            },
            {
                "type": "callout",
                "tone": "note",
                "text": "핵심 소매판매(자동차·휘발유 제외)는 +0.2%로 예상과 같았다.",
            },
            {
                "type": "stats",
                "title": "주간 실업수당",
                "caption": "주간 실업수당 신청건수는 19만9천건으로 예상(20만건)을 하회했고, 일주일 이상 신청건수는 171만건으로 예상과 비슷했다.",
                "items": [
                    {"k": "주간 실업수당 신청건수", "v": "19만9천건", "sub": "20만건"},
                    {"k": "일주일 이상 신청건수", "v": "171만건", "sub": "예상과 비슷"},
                ],
            },
        ]
    if title == "반도체 사이클은 끝나가는가":
        return [
            {
                "labelParts": ["미국 10년물 금리"],
                "display": "약 125bp",
                "detailParts": ["최근 1년간"],
                "quote": "최근 1년간 미국 10년물 금리가 약 125bp 올랐는데도",
                "home": True,
            }
        ], [
            {
                "type": "stats",
                "title": "미국 10년물 금리",
                "caption": "최근 1년간 미국 10년물 금리가 약 125bp 올랐는데도 데이터센터 건설은 이어지고",
                "items": [{"k": "최근 1년간", "v": "약 125bp"}],
            },
            {
                "type": "checklist",
                "title": "돈의 흐름",
                "caption": "사이클 판단은 주가보다 하이퍼스케일러 설비투자, 데이터센터 계획 취소 여부, HBM·DRAM 수요 전망, 반도체 이익 추정치 같은 돈의 흐름으로 확인해야 하며",
                "items": ["하이퍼스케일러 설비투자", "데이터센터 계획 취소 여부", "HBM·DRAM 수요 전망", "반도체 이익 추정치"],
            },
            {"type": "quote", "text": "기대수익률이 자본비용(WACC)을 웃돈고 투자를 미루면 뒤처질 위험까지 계산하기 때문이라고 본다."},
        ]
    if title == "9월 수출입 물가지수":
        return [
            {
                "labelParts": ["수출물가지수", "전년비"],
                "display": "+11.6%",
                "detailParts": ["예상 +9.6%"],
                "quote": "전년비 +11.6%(예상 +9.6%)",
                "relation": "예상 상회",
                "relationQuote": "예상을 크게 웃돈다",
                "home": True,
            },
            {
                "labelParts": ["수출물가지수", "전월비"],
                "display": "+2.2%",
                "detailParts": ["예상 +0.9%"],
                "quote": "전월비 +2.2%(예상 +0.9%)",
                "relation": "예상 상회",
                "relationQuote": "예상을 크게 웃돈다",
                "home": False,
            },
            {
                "labelParts": ["수입물가지수", "전월비"],
                "display": "+1.1%",
                "detailParts": ["예상 +1.0%"],
                "quote": "전월비 +1.1%(예상 +1.0%)",
                "home": False,
            },
            {
                "labelParts": ["수입물가지수", "전년비"],
                "display": "+8.1%",
                "detailParts": ["예상 +8.2%"],
                "quote": "전년비 +8.1%(예상 +8.2%)",
                "home": False,
            },
        ], [
            {
                "type": "grouped-bar",
                "title": "수입물가지수",
                "unit": "%",
                "caption": "9월 수입물가지수는 전월비 +1.1%(예상 +1.0%), 전년비 +8.1%(예상 +8.2%)였다.",
                "series": ["실제", "예상"],
                "rows": [
                    {"label": "전월비", "values": ["+1.1", "+1.0"]},
                    {"label": "전년비", "values": ["+8.1", "+8.2"]},
                ],
            },
            {
                "type": "grouped-bar",
                "title": "수출물가지수",
                "unit": "%",
                "caption": "수출물가지수는 전월비 +2.2%(예상 +0.9%), 전년비 +11.6%(예상 +9.6%)로 예상을 크게 웃돈다.",
                "series": ["실제", "예상"],
                "rows": [
                    {"label": "전월비", "values": ["+2.2", "+0.9"]},
                    {"label": "전년비", "values": ["+11.6", "+9.6"]},
                ],
            },
        ]
    if title == "코딩 에이전트를 믿고 맡기는 법 (Lauren Tan 토크)":
        return [], [
            {
                "type": "flow",
                "title": "검증",
                "caption": "에이전트가 직접 앱을 실행해 확인하는 검증 능력이 신뢰의 핵심. 실패할 때마다 스킬(마크다운)로 만들고, eval(루브릭·서브에이전트·판정 모델)로 유지한다. 로컬에서 관찰하며 시작해 신뢰가 쌓이면 클라우드로 확장하고, 반복되는 리뷰 코멘트는 컴파일러·린트·CI의 강제 규칙으로 바꾼다.",
                "steps": [
                    "직접 앱을 실행해 확인하는 검증",
                    "스킬(마크다운)",
                    "eval(루브릭·서브에이전트·판정 모델)",
                    "로컬에서 관찰",
                    "클라우드로 확장",
                    "컴파일러·린트·CI의 강제 규칙",
                ],
            }
        ]
    if title.startswith("구글 AI 인프라"):
        return [
            {
                "labelParts": ["가속기 10만 개"],
                "display": "10만 개",
                "detailParts": ["하루 수회~시간당 수회"],
                "quote": "가속기 10만 개 규모에서는 하루 수회~시간당 수회 장애",
                "home": False,
            }
        ], [
            {
                "type": "stack",
                "title": "함께 설계",
                "caption": "칩·네트워크·소프트웨어·데이터센터를 함께 설계(co-design)해 계층마다 10~20%·2배씩 곱해지는 효율을 얻는다.",
                "layers": ["칩", "네트워크", "소프트웨어", "데이터센터"],
            },
            {"type": "callout", "tone": "note", "text": "계층마다 10~20%·2배씩 곱해지는 효율을 얻는다."},
            {"type": "quote", "text": "가장 근본적인 제약은 전력이라고 본다."},
        ]
    if title.startswith("북한의 DMZ"):
        return [
            {
                "labelParts": ["약 74%"],
                "display": "약 74%",
                "detailParts": ["2028년 완공 추정"],
                "quote": "약 74% 진행, 2028년 완공 추정",
                "home": True,
            }
        ], [
            {
                "type": "timeline",
                "title": "국경이 된 과정",
                "caption": "2018년 9·19 합의로 낮추던 경계가 합의 파기(2023), '적대적 두 국가' 선언, 2026년 헌법 영토 조항을 거쳐 '국경'이 됐다.",
                "events": [
                    {"when": "2018년", "text": "9·19 합의로 낮추던 경계"},
                    {"when": "2023", "text": "합의 파기(2023)"},
                    {"when": "", "text": "'적대적 두 국가' 선언"},
                    {"when": "2026년", "text": "2026년 헌법 영토 조항"},
                    {"when": "", "text": "'국경'이 됐다"},
                ],
            },
            {
                "type": "stats",
                "title": "2026-09-21",
                "caption": "2026-09-21 서부전선 지뢰 폭발(한국군 3명 부상) 뒤 김여정은 동부전선 21사단 맞은편 요새화 공사 현장을 지목하며 실사격 시 보복을 경고했다.",
                "items": [
                    {"k": "서부전선 지뢰 폭발", "v": "한국군 3명 부상"},
                    {"k": "김여정은", "v": "동부전선 21사단"},
                ],
            },
            {
                "type": "meter",
                "title": "요새화",
                "caption": "요새화(약 74% 진행, 2028년 완공 추정)",
                "value": "74",
                "label": "약 74%",
                "notes": ["2028년 완공 추정"],
            },
        ]
    raise SystemExit(f"no visuals mapped for {title}")


TOKEN = re.compile(r"\d+(?:\.\d+)?")
ALLOWED_SERIES = {"실제", "예상", "전월", "지난해"}
ALLOWED_REL = {
    "예상 상회": ("웃돌", "웃돈", "상회"),
    "예상 하회": ("하회",),
    "예상 부합": ("같았", "비슷"),
}


def tokens(text: str) -> set[str]:
    return set(TOKEN.findall(text))


def need(summary: str, text: str, ctx: str) -> None:
    if text is None:
        return
    if not isinstance(text, str) or text not in summary:
        raise SystemExit(f"{ctx}: not in summary:\n{text}")


def check_value(caption: str, value, ctx: str) -> None:
    if value is None:
        return
    if not isinstance(value, str):
        raise SystemExit(f"{ctx}: value must be string or null, got {value!r}")
    found = tokens(caption)
    for tok in TOKEN.findall(value):
        if tok not in found:
            raise SystemExit(f"{ctx}: number {tok} from {value} not in caption")
    if value[:1] in "-–−":
        num = value[1:]
        if not any(sig + num in caption for sig in "-–−"):
            raise SystemExit(f"{ctx}: signed value {value} not in caption")


def check_visual(summary: str, title: str, visual: dict) -> None:
    ctx = title + " / " + visual.get("type", "?")
    caption = visual.get("caption")
    if visual["type"] in {"quote", "callout"}:
        need(summary, visual["text"], ctx)
        return
    need(summary, caption, ctx + " caption")
    bag = summary
    if visual.get("title") and any(ch.isdigit() for ch in visual["title"]):
        if visual["title"] not in summary and visual["title"] not in title:
            raise SystemExit(f"{ctx}: numeric title not in text: {visual['title']}")
    for step in visual.get("steps") or []:
        need(bag, step, ctx)
    for col in visual.get("columns") or []:
        need(bag, col["title"], ctx)
        for pt in col["points"]:
            need(bag, pt, ctx)
    for item in visual.get("items") or []:
        if isinstance(item, str):
            need(bag, item, ctx)
        else:
            need(bag, item["k"], ctx)
            need(bag, item["v"], ctx)
            if item.get("sub"):
                need(bag, item["sub"], ctx)
    for ev in visual.get("events") or []:
        if ev.get("when"):
            need(bag, ev["when"], ctx)
        need(bag, ev["text"], ctx)
    for layer in visual.get("layers") or []:
        need(bag, layer, ctx)
    if visual.get("label"):
        need(bag, visual["label"], ctx)
    for note in visual.get("notes") or []:
        need(bag, note, ctx)
    if "series" in visual:
        for name in visual["series"]:
            if name not in ALLOWED_SERIES and name not in caption:
                raise SystemExit(f"{ctx}: series {name}")
    for row in visual.get("rows") or []:
        need(bag, row["label"], ctx)
        if "value" in row:
            check_value(caption, row["value"], ctx)
        for value in row.get("values") or []:
            check_value(caption, value, ctx)
    for key in ("min", "max", "value"):
        if key in visual and visual["type"] == "range":
            check_value(caption, visual[key], ctx)
    if visual["type"] == "meter":
        check_value(caption, visual["value"], ctx)


def check_highlight(summary: str, title: str, h: dict) -> None:
    ctx = title + " highlight"
    need(summary, h["quote"], ctx)
    if h["display"] not in h["quote"]:
        raise SystemExit(f"{ctx}: display {h['display']} not in quote")
    for part in h["labelParts"] + h.get("detailParts", []):
        need(summary, part, ctx)
    rel = h.get("relation")
    if rel:
        if rel not in ALLOWED_REL:
            raise SystemExit(f"{ctx}: bad relation {rel}")
        rq = h.get("relationQuote")
        need(summary, rq, ctx)
        if not any(tok in rq for tok in ALLOWED_REL[rel]):
            raise SystemExit(f"{ctx}: relation {rel} not justified by {rq}")


def load_dump() -> dict:
    for path in DUMP_CANDIDATES:
        if path.exists():
            raw = path.read_text()
            return json.loads(raw[raw.find("{") : raw.rfind("}") + 1])
    raise SystemExit("study archive dump not found")


def parse_items(doc: dict) -> list[dict]:
    topic_by_name = {t["name"]: t for t in TOPICS}
    current = None
    items = []
    for el in doc["elements"]:
        if el.get("style") == "HEADING_2" and el.get("text", "").startswith("📂 "):
            name = el["text"].replace("📂 ", "", 1).strip()
            if name not in topic_by_name:
                raise SystemExit(f"unknown topic {name}")
            current = topic_by_name[name]
            continue
        if "cells" not in el or el.get("table") == "5x3":
            continue
        cells = el["cells"]
        if not current:
            continue
        rows = [cells[i : i + 7] for i in range(0, len(cells), 7)]
        header = [c["text"] for c in rows[0]]
        if header[0] != "날짜":
            raise SystemExit(f"unexpected header {header}")
        for row in rows[1:]:
            date, title, summary, source, thought, tags, status = [c["text"] for c in row]
            if title not in IDS:
                # Google Doc extraction can mangle one syllable. Match by prefix.
                matches = [k for k in IDS if title.startswith(k[:12]) or k.startswith(title[:12])]
                if len(matches) != 1:
                    raise SystemExit(f"unmapped title {title!r} candidates {matches}")
                canonical = matches[0]
            else:
                canonical = title
            highlights, visuals = visuals_for(canonical if canonical == title else title)
            # visuals_for for google/dprk uses startswith on the passed title.
            if canonical != title:
                highlights, visuals = visuals_for(title)
            for vis in visuals:
                check_visual(summary, title, vis)
            for h in highlights:
                check_highlight(summary, title, h)
            url = None
            kind = "text"
            if "youtu.be/" in source or "youtube.com/" in source:
                kind = "youtube"
                m = re.search(r"https://youtu\.be/\S+", source)
                url = m.group(0).strip() if m else None
                if url is None:
                    kind = "youtube-title"
            elif source.startswith("YouTube:"):
                kind = "youtube-title"
            elif source.startswith("X:"):
                kind = "x"
                url = STATUS_URL.get(title, PROFILE)
            elif source.startswith("X 영상"):
                kind = "x-video"
            if title in YOUTUBE_URL:
                url = YOUTUBE_URL[title]
                kind = "youtube"
            if "youtu.be/HYkXmBCHtTE" in source:
                url = "https://youtu.be/HYkXmBCHtTE"
                kind = "youtube"
            status_id = {"📖 공부중": "reading", "📥 읽을거리": "todo", "✅ 정리완료": "done"}.get(status)
            if not status_id:
                raise SystemExit(f"bad status {status}")
            tag_list = [t[1:] if t.startswith("#") else t for t in tags.split() if t]
            items.append(
                {
                    "id": IDS[canonical] if title not in IDS else IDS[title],
                    "topic": current["id"],
                    "date": date,
                    "title": title,
                    "summary": summary,
                    "source": {"label": source, "url": url, "kind": kind},
                    "thought": None if thought.strip() == "-" else thought,
                    "tags": tag_list,
                    "status": status_id,
                    "highlights": highlights,
                    "visuals": visuals,
                }
            )
    return items


def main() -> None:
    doc = load_dump()
    items = parse_items(doc)
    by_topic: dict[str, list] = {t["id"]: [] for t in TOPICS}
    for item in items:
        by_topic[item["topic"]].append(item)
    for topic in TOPICS:
        rows = by_topic[topic["id"]]
        if len(rows) != topic["overviewCount"]:
            raise SystemExit(f"{topic['name']} count {len(rows)} != {topic['overviewCount']}")
        latest = max(r["date"] for r in rows)
        if latest != topic["overviewLatest"]:
            raise SystemExit(f"{topic['name']} latest {latest} != {topic['overviewLatest']}")
    subtitle = next(el["text"] for el in doc["elements"] if el.get("style") == "SUBTITLE")
    archive = {
        "title": "공부 아카이브",
        "subtitle": subtitle,
        "statusLegend": "상태: 📥 읽을거리 · 📖 공부중 · ✅ 정리완료",
        "site": "https://suddenlyslowly.github.io/study-archive",
        "updated": max(item["date"] for item in items),
        "statuses": {
            "reading": {"label": "공부중", "mark": "📖"},
            "todo": {"label": "읽을거리", "mark": "📥"},
            "done": {"label": "정리완료", "mark": "✅"},
        },
        "topics": TOPICS,
        "items": items,
    }
    out = ROOT / "data" / "archive.json"
    out.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out} items={len(items)} topics={len(TOPICS)}")


if __name__ == "__main__":
    main()
