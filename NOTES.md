# NOTES

## 현재 상태
- 셋업 완료 (Vite + React + TypeScript, React Router, Zustand, Tailwind CSS v4)
- 과제 원문 정리: docs/assignment.md
- 기획서 v1 작성: docs/planning.md (GPT 초안 + 리뷰 반영)
- 준비용 컨텍스트(JD 요약, 내 경험↔과제 연결): docs/private/context.md — git 제외

- 개발 기반 완료
  - 도메인 타입/상수/포맷: src/domain
  - 게이트 판정(evaluateGates, 순수 함수) · 매입세액 계산(calcVat) · 전이 가드/권한(rules.ts)
  - mock 200대: scripts/generate-mock.mjs → src/mock/*.json (수출 검증 150대 = 정상 115 / 보완 28 / 차단 7)
  - 스토어(useErpStore, useEvaluations) · 공통 레이아웃(사이드바, 시연 사용자 전환) · 라우트 뼈대

- 검증 작업 큐 (/workbench) 완료 — 역할별 할 일, 수출 검증/매입 진행/사후 증빙 탭, 리스크·게이트 필터, 검색, 페이지네이션, 조건부 선적 요청, 선적 전표 생성

- 차량 상세 (/vehicles/:id) 완료 — 진행 단계, 게이트별 사유·해소 액션(역할별), 매입세액, 증빙 제출·검증, 신고필증 대조, 조건부 선적, Audit Trail

- 매입 등록 (/purchases/new) 완료 — VIN 즉시 조회(시연 VIN 3종), 유형별 증빙 체크리스트, 실물 인수, 입력값으로 실시간 게이트 판정(applyDraft 공유), 등록/등록 후 확정

## 다음 할 일 (페이지 단위로 하나씩)
4. 판매 등록 (/sales/new) — 크로스체크 패널
5. 선적 전표 · 결재 (/shipments) — 일괄/조건부 결재, 선적 처리(VIN 재조회)
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
- 공통 UI: Button, Chip, Modal, Toast, Dropdown, TextField, TextArea, Tabs, Checkbox, Pagination
- 칩은 dot 없이 sm 크기 기본, 상태 표시에만 사용 — 게이트 항목은 칩 대신 [코드] 제목 텍스트(GateLabel)
- 금액 입력은 NumberField(천 단위 구분자), 통화별 소수 자릿수는 CURRENCY_DECIMALS
- 페이지 제목·설명은 본문이 아닌 상단 헤더에 표시 (usePageTitle)
- import는 '@/' 별칭 사용 (같은 폴더만 './')
- 섹션(Panel) 내부 요소에는 따로 패딩을 두지 않고 Panel 본문 여백으로 통일
- 선적 완료 차량의 보완 항목이 모두 해소되면 스토어 공통 정리(settle)에서 자동 종결 + 조건부 선적 해소 처리
- 필터·탭·페이지는 URL 쿼리로 관리 → 할 일 카드에서 필터 적용된 목록으로 바로 이동
- 데모 기준일은 2026-09-29로 고정 (mock 날짜와 D-day 계산 일관성)
- 기획서에 없던 S8(국내 판매 전환) 게이트 추가 — 4.3 시나리오를 게이트로 승격
- 수출신고 수리(H7)·신고필증 VIN(H6)은 판매 등록 이후부터 판정, 결재 미승인(H8)은 게이트가 아니라 선적 처리 가드로 구현
- S4·S5·S8은 회계 확인(acknowledge)으로도 해소 가능, 그 외 Soft는 조건부 선적 승인으로만 통과
