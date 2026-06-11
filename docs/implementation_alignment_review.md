# Implementation Alignment Review

작성일: 2026-06-10

## 검토 기준

- `docs/database_schema.md`를 중심 기준으로 주문 중심 데이터 모델을 확인했다.
- `docs/prd.md`, `docs/ui_spec.md`, `docs/information_architecture.md`를 함께 대조해 POC의 실제 의도를 재정리했다.
- UI 판단은 IBM Carbon Design System 공식 문서를 우선했다.

## 파악한 제품 의도

- POC의 중심은 엑셀 주문장을 웹 주문관리 UI로 대체하는 것이다.
- 주문 1건은 제품/설계 1개와 수량 1개를 직접 가진다.
- 납기는 `delivery_schedules`에 저장하며, 일반 출하는 1행, 분할 출하는 여러 행으로 표현한다.
- `orders.status`는 생산 진행 상태가 아니라 주문 운영 lifecycle이다.
- 생산팀 전달은 POC에서 `orders.status = released`까지만 관리하며, `production_tasks` 생성은 후속 확장이다.
- 주 화면은 주문 목록이며, 입력/수정은 페이지 전환 없이 우측 Drawer에서 처리한다.
- `접수(active)` 탭에서만 수정, 전달, 취소, 다중 선택 액션을 제공한다.
- 기준정보 화면은 POC에서 조회 중심이지만, 설계/고객 검색은 IA상 필요한 조회 기능이다.

## 발견한 불일치와 조치

| 영역 | 기존 상태 | 문서 기준 | 조치 |
| --- | --- | --- | --- |
| 주문 입력 표면 | Carbon Modal로 입력/수정 | 우측 슬라이딩 Drawer, 배경 목록 비활성화, 하단 저장 고정 | 주문 입력/수정을 우측 패널 Drawer로 재구현 |
| 다중 취소 | 다중 전달만 제공 | 접수 탭에서 다중 취소 가능 | Carbon DataTable batch action에 `선택 주문 취소` 추가 |
| 주문 담당자 표시 | Drawer에 없음 | 로그인 계정 기반 주문 담당자 read-only 표시 | `주문 담당자` read-only 필드 추가 |
| 고객/제품 검색 | Select만 제공 | 고객사/담당자 및 제품/설계 검색 제공 | Drawer 안에 Carbon Search + Select 필터 추가 |
| 신규 기준정보 버튼 | Drawer 내부 버튼 disabled | 클릭 시 추후 개발 예정 Toast | 고객/제품 신규 버튼을 활성화하고 Toast 안내 연결 |
| 기준정보 조회 | 읽기 전용 표만 제공 | 설계/고객 기준정보 검색 | 설계/고객 페이지에 Carbon TableToolbarSearch 추가 |
| 모바일 Drawer 푸터 | 버튼이 좁은 폭에서 잘림 | 하단 저장 버튼 고정, 모바일에서도 조작 가능 | 모바일 푸터를 2열 grid로 조정 |

## Carbon 적용 판단

- 확인/취소처럼 사용자의 즉시 응답이 필요한 흐름은 Carbon Modal을 유지했다.
- 주문 목록의 다중 전달/다중 취소는 Carbon DataTable의 batch action bar를 사용했다.
- 기준정보 및 Drawer 내부 검색은 Carbon Search와 TableToolbarSearch를 사용했다.
- 우측 입력 Drawer는 Carbon UI shell right panel의 오른쪽 고정 패널 원칙을 따르되, 주문 폼이라는 제품 요구에 필요한 위치/스크롤/고정 푸터만 Carbon token 기반 CSS로 최소 구현했다.

## 추가된 기능 이력

- 기준정보 설계/고객 검색
- Drawer 내부 고객/담당자 검색
- Drawer 내부 제품/설계 검색
- Drawer 내부 신규 고객/제품 버튼의 future-scope Toast
- 선택 주문 다중 취소
- 주문 담당자 read-only 표시

위 항목들은 문서상 직접 명시되어 있거나, 문서 간 의도를 통합했을 때 원활한 POC 사용에 필요한 기능으로 판단해 추가했다.

## 검증

- `pnpm lint`
- `pnpm test --run`
- `pnpm build`
- `pnpm e2e`
- Browser QA
  - 1440x900: Drawer 오른쪽 고정, 배경 비활성화, 헤더/푸터 고정 확인
  - 390x844: Drawer 전체 폭, 내부 세로 스크롤, 푸터 버튼 잘림 없음 확인
  - 설계 검색: `3301` 검색 시 `DS-3301`만 표시 확인
