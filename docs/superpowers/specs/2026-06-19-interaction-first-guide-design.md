# 인터랙션 우선 가이드 설계 (Matt Pocock 주도 / Superpowers 보조)

- 날짜: 2026-06-19
- 상태: 승인됨, ADR 0002로 보완됨
- 관련 ADR: `docs/adr/0001-interaction-first.md`

## 1. 배경과 문제

이 저장소(`harness-guide`)는 Superpowers(obra)와 Matt Pocock Skills를 결합한
end-to-end 스킬 기반 개발 프로세스를 정의한다. 기존 가이드는 **Superpowers를
"프로세스의 척추(주인공)"**, Matt Pocock을 보조(관절 판단)로 배치했다.

문제: Superpowers는 상호검증·자동화(서브에이전트 병렬 실행, 자동 검증 게이트)에
무게가 실려 있어 **사람과의 인터랙션이 줄어든다.** 사용자는 사람이 매 의사결정의
주인이 되는 워크플로를 원한다. Matt Pocock의 grilling(집요한 인터뷰)이 그 인터랙션
중심성을 가장 잘 대표한다.

## 2. 목표

1. **주인공 역전.** 단계 흐름의 골격은 유지하되, 매 단계의 의사결정 게이트를
   Matt Pocock의 grilling(사람과의 집요한 인터뷰)으로 운영한다.
2. **자동화 강등.** Superpowers의 서브에이전트 실행·자동 검증은 기본값이 아니라
   **옵트인 보조 동력**이며, 산출물은 '제안'으로 취급한다. 자동 리뷰/검증은 돌리되
   그 결과를 grilling으로 사람에게 가져와 확인받은 뒤에만 진행한다.
3. **병렬 worktree 워크플로 추가.** 새 스킬 설치 없이 기존 `using-git-worktrees`
   기반의 병렬 개발 워크플로를 가이드 문서에 명시한다. 병렬 자동화는 인터랙션을
   줄이므로 사람이 명시적으로 켤 때만 사용하는 옵트인이다.

## 3. 비목표 (YAGNI)

- 병렬 worktree 자동화를 위해 새 스킬을 설치하지 않는다(`dispatching-parallel-agents` 등 미설치 유지).
  프론트엔드 품질 강화를 위한 디자인 스킬 추가는 ADR 0002에서 별도로 승인했다.
- 단계 자체를 재배열·개명하지 않는다(골격 유지).
- 스킬 파일(`.agents/skills/**`)의 내용은 수정하지 않는다.

## 4. 설계

### 4.1 역할 분담 (역전)

- **Matt Pocock — 주인공(인터랙션 드라이버).** 매 단계의 의사결정 게이트를
  grilling으로 운영하고, "무엇을·얼마나 잘 만들지"를 사람이 최종 판단한다.
  스킬: `grill-with-docs`, `grilling`, `domain-modeling`, `codebase-design`,
  `improve-codebase-architecture`.
- **Superpowers — 단계 골격 + 옵트인 자동화.** 단계 순서(진입→발산→계획→실행→
  리뷰→출시)를 제공하는 뼈대이자, 사람이 켤 때만 도는 자동화 동력. 산출물은 제안.
  스킬: `using-superpowers`, `brainstorming`, `writing-plans`,
  `subagent-driven-development`/`executing-plans`(옵트인),
  `test-driven-development`, `systematic-debugging`,
  `requesting-code-review`·`verification-before-completion`(자동 제안 → 사람 확인),
  `using-git-worktrees`, `finishing-a-development-branch`.

### 4.2 프로세스 표 재구성

열 구조를 `단계 | 목적 | 사람 게이트(grilling 주도) | 옵트인 자동화(Superpowers)`로
바꾼다.

| 단계 | 목적 | 사람 게이트(grilling 주도) | 옵트인 자동화(Superpowers) |
|------|------|----------------------------|----------------------------|
| 0. 셋업 | 1회 준비 | `domain-modeling`으로 `CONTEXT.md` 시작 | `using-superpowers`, 필요 시 `using-git-worktrees` |
| 1. 정렬 | 무엇을 만들지 합의 | **`grill-with-docs`**(설계 추궁 + 용어집/ADR) | `brainstorming`(옵션 발산, 보조) |
| 2. 모듈 설계 | 어떻게 잘 만들지 | `codebase-design` + `domain-modeling`로 경계 합의 | — |
| 3. 계획 | 실행 가능한 작업 분해 | `writing-plans` 초안을 grilling으로 검토 | `writing-plans`(초안 생성) |
| 4. 구현 | 코드 작성 | `tdd` 슬라이스마다 사람 확인 | `subagent-driven-development`/`executing-plans`(옵트인) |
| 5. 디버깅 | 막힘 해소 | `systematic-debugging` 가설을 사람과 합의 | — |
| 6. 리뷰·검증 | 품질 게이트 | 자동 결과를 grilling으로 확인 후 진행 | `requesting-code-review`·`verification-before-completion`(제안) |
| 7. 출시 | 통합/배포 | 사람이 통합 결정 | `finishing-a-development-branch` |
| 상시 | 구조 건강 | `improve-codebase-architecture`(사람과 함께) | — |

### 4.3 병렬 worktree 워크플로 (신설 절)

1. `using-git-worktrees`로 격리 작업공간 N개를 만든다(worktree당 task 1개).
2. (옵트인) 각 worktree에 서브에이전트를 병렬 투입할 수 있다 — 사람이 명시적으로
   켤 때만.
3. **수렴은 사람이 한다.** 각 worktree 결과를 grilling으로 검토·수렴한다.
4. `finishing-a-development-branch`로 통합(머지/PR/정리)한다.

원칙: 병렬 자동화는 인터랙션을 줄이므로 기본 비활성이며, 옵트인일 때도 결과는
반드시 사람 확인 게이트를 거친다.

### 4.4 AGENTS.md 우선순위 역전

- 기존: "Superpowers를 프로세스 흐름에, Matt Pocock을 도메인/모듈/grilling에 사용."
- 변경: "매 게이트는 **Matt Pocock grilling/사람 인터랙션을 우선**한다. Superpowers
  자동화(서브에이전트·자동 검증)는 사람이 옵트인할 때만 쓰고, 자동 검증 결과는
  grilling으로 사람 확인을 받은 뒤 진행한다."
- "Keeping Documents Current"의 ADR/CONTEXT/spec/plan 갱신 규칙은 유지한다.

## 5. 영향 범위 (변경 파일)

- `README.md` — 역할 분담, 프로세스 표, 운영 팁, 중복 스킬 안내, 빠른 시작,
  병렬 worktree 절 추가.
- `AGENTS.md` — 스킬 우선순위 규칙 역전.
- `docs/adr/0001-interaction-first.md` — 신규.
- `docs/superpowers/specs/2026-06-19-interaction-first-guide-design.md` — 본 문서.

## 6. 성공 기준

- README와 AGENTS.md가 일관되게 "사람 인터랙션 우선, 자동화는 옵트인 제안"을 말한다.
- 프로세스 표의 모든 단계에 사람 게이트가 grilling 기반으로 명시된다.
- 병렬 worktree 절이 "옵트인 + 사람 수렴" 원칙과 함께 존재한다.
- 병렬 worktree 자동화를 위해 새 스킬을 설치하지 않는다. 프론트엔드 디자인 스킬 추가로
  `skills-lock.json`이 변경될 수 있으며, 해당 변경은 ADR 0002를 따른다.

## 7. 보완 결정

- ADR 0002: 프론트엔드 품질 강화를 위해 `frontend-design`과
  `design-taste-frontend`를 프로젝트 스킬로 고정한다.
- 기본 구현 경로는 직접적인 사람 주도 `tdd`다. `writing-plans`가 만든 계획 문서를
  읽고 세로 슬라이스(한 테스트→한 구현)로 진행한다. `executing-plans`는 한 세션 배치,
  `subagent-driven-development`는 서브에이전트 병렬+task별 리뷰를 원하는 경우의 무거운
  옵트인 자동화다.
