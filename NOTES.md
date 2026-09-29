# NOTES

## 현재 상태
- 셋업 완료 (Vite + React + TypeScript, React Router, Zustand, Tailwind CSS v4)
- 과제 원문 정리: docs/assignment.md
- 기획서 v1 작성: docs/planning.md (GPT 초안 + 리뷰 반영)
- 준비용 컨텍스트(JD 요약, 내 경험↔과제 연결): docs/private/context.md — git 제외

## 다음 할 일
- 타입 정의(src/types) + mock 데이터(src/mock) — 기획서 13장 케이스 A~J
- 게이트 판정 로직(순수 함수) → 스토어
- 화면 5개 라우팅 뼈대 + 역할 전환 헤더
- 세무 요건(개인 매입 공제 특례 등) 표현 수위 최종 점검

## 결정사항
- 백엔드·외부 API 없이 src/mock/*.json 사용 (과제 지침)
- 대시보드가 아닌 매입→매출→선적 업무 흐름 + 리스크 게이트/알람에 집중
- 리스크는 Hard Gate(우회 불가) / Soft Gate(기한부 조건부 선적)로 등급화 — 영업·회계 중재의 핵심
- 매입·매출 언밸런스 = 가격 손실이 아니라 증빙 유형↔매출 처리(영세율) 불일치. 리스크는 미확보 매입세액 금액으로 표시
- 상태는 두 축: 진행 단계(Stage) / 리스크 판정(Risk, 게이트 결과로부터 파생)
- 정상 차량은 선적 전표 단위 일괄 결재, 조건부 선적만 회계 팀장 개별 결재
- 화면은 5개로 축소, 기준정보 관리 화면 제외
- 세법은 단정하지 않고 회계팀 소유의 규칙 테이블(Policy)로 분리
- 최종 제출 기획서는 개발 완료 후 HTML 보고서 형식으로 제작 (docs/planning.md는 작업용 원본)
- 공통 UI는 과제에 실제 쓰이는 것만: Button, Chip, Modal, Toast (src/components/ui)
- 색·타이포는 index.css @theme 디자인 토큰으로만 관리 (Tailwind 기본 팔레트 제거, bg-brand-70 / text-title-lg 등)
- 리스크 표시 매핑: 🟢 CLEAR → Chip success, 🟡 REVIEW → warning, 🔴 BLOCKED → error
- 추후 필요 시 DS에서 가져올 후보: StepBar(진행 단계 타임라인), Tabs, Empty, TextField, Dropdown
