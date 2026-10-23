# CONTACT — 근미래 어반 판타지 웹게임 (1차 프로토타입)

세계관 속 "현실조작형 자동접촉 프로그램"을 그대로 화면으로 옮긴 웹 RPG입니다.
구현 규칙은 `SPEC.md`, 세계관과 문구는 `GAME_DESIGN.md`를 따릅니다.

## 기술 스택

- Next.js (App Router, TypeScript, Server Actions) + Tailwind CSS
- Prisma + PostgreSQL (개발은 로컬 Postgres, 배포 시 Supabase Postgres 접속 문자열로 교체)
- 자체 세션 쿠키 인증 (아이디 + 비밀번호, 초대 코드 필수)

## 실행 방법

```bash
pnpm install
cp .env.example .env            # DATABASE_URL, SESSION_SECRET, ADMIN_* 확인
scripts/local-db.sh start       # 로컬 Postgres (이미 Postgres가 있으면 생략)
pnpm db:migrate                 # 스키마 적용
pnpm db:seed                    # 관리자 계정, 기본 아이템 5종, 초대 코드 발급
pnpm dev                        # http://localhost:3000
```

- 관리자 계정: `.env`의 `ADMIN_LOGIN_ID` / `ADMIN_PASSWORD` (기본 admin / admin1234)
- 시드 초대 코드: `WELCOME-0001` ~ `WELCOME-0005`

## 디렉터리

| 경로 | 내용 |
| --- | --- |
| `prisma/schema.prisma` | 전체 데이터 모델 (2차 항목도 구조만 미리 포함) |
| `prisma/seed.ts` | 초기 시드 |
| `src/lib/game-config.ts` | 모든 "기본값" 수치 정의. 관리자 "게임 설정" 양식의 원본 |
| `src/lib/rules.ts` | 침식률 단계, 배율, 페널티, 레벨업 등 규칙 계산 |
| `src/lib/time.ts` | KST, 04:00 게임일 키, 다음 초기화 시각 |
| `src/lib/auth.ts` | 세션, 로그인 확인 |
| `src/lib/character.ts` | 일일 초기화(요청 시점에 늦게 적용) |
| `src/app/(auth)` | 설치(가입), 접속(로그인) |
| `src/app/create-character` | 유저 등록(캐릭터 생성, 능력 제출) |
| `src/app/(game)` | 상태 표시줄이 있는 게임 화면들 |
| `src/app/admin` | 관리자 페이지 (메뉴별 `page.tsx` + `actions.ts`) |
| `src/lib/content-types.ts` | 아이템 효과, 능력 효과, 결과 효과, 표시 조건 등 운영자가 고르는 타입 정의 |
| `src/lib/content-schemas.ts` | 위 타입들의 서버 검증 스키마 |
| `src/lib/realm-validate.ts` | 이계 오류 검사 |
| `prisma/seed-realm.ts` | 샘플 이계 "구 성모요양병원" 시드 |

## 단계별 진행

1. ✅ 골격, DB 스키마, 게임 설정, 초대 코드 가입·로그인, 캐릭터 생성, 홈
2. ✅ 관리자 페이지 기본 메뉴 (대시보드, 아이템, 드랍 테이블, 유저, 능력 심사, 능력 태그, 초대 코드, 공지, 게임 설정, 변경 기록)
3. ✅ 이계 편집기 (React Flow 노드 그래프, 노드·장면·선택지·효과 양식, 적대 존재 자동 생성, 오류 검사, 공개 초기화, 샘플 이계 시드)
4. 탐사 엔진과 탐사 화면
5. 지도, 상점, 유저 화면(설정·스탯 배분·능력·보관함 통합), 탐사기록, 대시보드, 마감
