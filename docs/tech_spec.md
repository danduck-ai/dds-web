# DSS 기술스택 정의서
**프로젝트**: 동성실리콘 Digital Transformation
**작성일**: 2026-03-28

---

## 프론트엔드

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js (App Router) |
| 언어 | TypeScript |
| 디자인 시스템 | IBM Carbon Design System |
| 차트/시각화 | Carbon Charts |

## 백엔드 / 데이터

| 항목 | 기술 |
|------|------|
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (이메일 + 비밀번호) |
| API 레이어 | Next.js Server Actions |
| DB 클라이언트 | Supabase JS Client |

## 배포 / 인프라

| 항목 | 기술 |
|------|------|
| 호스팅 | Vercel |
| 환경변수 관리 | Vercel Environment Variables |

## 개발 도구

| 항목 | 기술 |
|------|------|
| 패키지 매니저 | pnpm |
| 코드 포매터 | Prettier + ESLint |
| 버전 관리 | Git + GitHub |

## 접근 환경

PC, 모바일, 태블릿 모두 지원 (브라우저 기반, 앱 설치 없음)

## 사용자 역할

| 역할 | 정의 |
|------|------|
| **A** | Administrative (사무직) |
| **P** | Production (현장직, 팀장 포함) |
| **E** | Executive (임원) |
