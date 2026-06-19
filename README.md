# Harness Guide — 아이디어에서 프로덕션까지의 스킬 기반 개발 프로세스

이 저장소는 **신규 앱 아이디어를 프로덕션 앱으로 만드는 end-to-end 개발 프로세스**를,
[Superpowers](https://github.com/obra/superpowers)(obra)와
[Matt Pocock Skills](https://github.com/mattpocock/skills) 두 스킬 모음을
**조화롭게 결합**해서 정의한다.

## 두 스킬 모음의 역할 분담

이 가이드는 **사람과의 인터랙션을 최우선**으로 둔다. 매 의사결정의 주인은 사람이고,
자동화는 사람이 켤 때만 도는 보조 동력이다. 두 모음은 경쟁하지 않고 **맞물린다**.

- **Matt Pocock — 주인공(인터랙션 드라이버).**
  매 단계의 의사결정 게이트를 사람과의 집요한 인터뷰(grilling)로 운영한다.
  정렬(grilling), 공용 언어(domain model), 깊은 모듈(deep module) 설계,
  아키텍처 건강을 책임진다. 즉 **"무엇을, 얼마나 잘 만들지를 사람이 최종 판단"**하게 한다.
- **Superpowers — 단계 골격 + 옵트인 자동화(보조).**
  에이전트가 따라갈 단계의 흐름(뼈대)을 제공한다: 진입 → 발산(brainstorm) → 계획 →
  실행 → 리뷰 → 출시. 작업을 작은 단위로 쪼개고, 서브에이전트로 병렬 실행하며, 자동
  검증을 돌린다. 단, 이 자동화·검증은 **기본값이 아니라 옵트인이며, 산출물은 '제안'**이다.
  자동 리뷰/검증 결과는 grilling으로 사람에게 가져와 확인받은 뒤에만 다음으로 넘어간다.

핵심 결합 예시: **`grill-with-docs`(수렴 + 문서화, 주도) ← `brainstorming`(발산, 보조)**.
브레인스토밍이 아이디어 공간을 넓혀 설계안을 *제안*하면, grill-with-docs가 그 설계를
집요하게 검증하면서 `CONTEXT.md`(용어집)와 ADR(결정 기록)을 사람과 함께 만든다.
주인공은 사람을 추궁하는 grill-with-docs이고, brainstorming은 옵션을 펼치는 보조다.

## 설치된 스킬 (`./.agents/skills`)

### Matt Pocock — 엔지니어링 판단 (주인공)
사람과의 인터랙션으로 매 게이트를 운영하는 주역이다.

| 스킬 | 역할 |
|------|------|
| `grill-with-docs` | 집요한 인터뷰로 설계를 검증 + `CONTEXT.md`/ADR 생성 (정렬의 주역) |
| `grilling` | 인터뷰 루프 본체(grill-with-docs가 사용) — 매 게이트의 사람 확인 |
| `domain-modeling` | 도메인 용어집(`CONTEXT.md`)·ADR을 최신으로 유지 |
| `codebase-design` | 깊은 모듈 설계 공용 어휘(module/interface/seam/depth) |
| `tdd` | red-green-refactor (Matt Pocock 버전) |
| `improve-codebase-architecture` | "진흙 공" 코드베이스를 주기적으로 구조 개선 |

### Superpowers (obra) — 단계 골격 + 옵트인 자동화 (보조)
단계 흐름의 뼈대를 제공하고, 사람이 켤 때만 자동화/검증을 돌린다. 산출물은 '제안'.

| 스킬 | 역할 |
|------|------|
| `using-superpowers` | 작업 시작 시 어떤 스킬을 쓸지 잡는 진입점/라우터 |
| `brainstorming` | 아이디어 → 접근법 비교 → 설계안 *제안* (발산, grill-with-docs의 보조) |
| `writing-plans` | 스펙 → 파일·인터페이스가 명시된 잘게 쪼갠 TDD 계획 초안 |
| `subagent-driven-development` | 작업별 서브에이전트로 계획 실행 (옵트인 병렬 자동화) |
| `executing-plans` | 한 세션에서 계획을 배치 실행 (옵트인) |
| `test-driven-development` | red-green-refactor 루프 |
| `systematic-debugging` | 재현 → 가설 → 계측 → 수정 → 회귀 테스트 디버깅 루프 |
| `requesting-code-review` | 머지 전 자동 코드 리뷰 — 결과는 사람 확인 게이트로 |
| `verification-before-completion` | "완료" 선언 전 자동 검증 — 결과는 사람 확인 게이트로 |
| `using-git-worktrees` | 격리된 작업 공간(worktree) 생성 (병렬 개발 토대) |
| `finishing-a-development-branch` | 머지 / PR / 정리로 작업 마무리 |

> **의존성 메모.** `tdd`와 `improve-codebase-architecture`는 `codebase-design`·`grilling`·
> `domain-modeling`을 참조한다. `writing-plans`가 만든 계획은 기본적으로 `tdd`가 직접
> 읽어 세로 슬라이스로 구현하고, `executing-plans`·`subagent-driven-development`는
> 옵트인 실행 자동화다. 이 저장소에는 그 **참조 스킬이 모두 함께 설치**되어 끊긴 의존성이 없다.

### 프론트엔드 / UX (생성 → 테이스트 → 정제)
프론트엔드 작업은 **생성 → 테이스트 → 정제** 세 층으로 나뉜다. `frontend-design`이
대담하고 의도적인 비주얼을 *생성*하고, `design-taste-frontend`가 브리프를 읽어 올바른
디자인 방향(테이스트)을 잡아 "템플릿 같지 않은" 결과를 만들며, ibelick의 크래프트
스킬이 그 결과를 일관된 기준으로 *정제*한다. 생성·테이스트 산출물도 사람이 grilling으로
검토한 뒤 다음으로 넘어간다.

| 스킬 | 출처 | 역할 |
|------|------|------|
| `frontend-design` | anthropics/skills | 생성형 미학 — 타이포·컬러·구성으로 템플릿 기본값처럼 보이지 않는 의도적 비주얼 디자인 생성 |
| `design-taste-frontend` | leonxlnx/taste-skill | anti-slop 테이스트 — 브리프에서 디자인 방향을 추론, 리디자인은 audit-first·엄격한 pre-flight (랜딩·포트폴리오·리디자인 특화) |
| `baseline-ui` | ibelick | anti-slop 정제 — 스페이싱·위계·타이포·레이아웃을 의견 있는 기준으로 정리(Tailwind/Base UI/`motion`) |
| `fixing-accessibility` | ibelick | 키보드·포커스·ARIA 등 접근성 결함 수정 |
| `fixing-motion-performance` | ibelick | 애니메이션 성능(지터·리플로우) 점검·개선 |

> **스코프 메모.** `design-taste-frontend`는 랜딩 페이지·포트폴리오·리디자인에 특화되어
> 있고 대시보드·데이터 테이블·다단계 제품 UI에는 맞지 않는다. 그런 화면은 `frontend-design`
> 생성 + `baseline-ui` 정제 조합을 쓴다.

> **선택 확장.** 프로덕션 품질 게이트(Core Web Vitals·성능·SEO·Lighthouse 감사)가 필요하면
> [`addyosmani/web-quality-skills`](https://github.com/addyosmani/web-quality-skills)
> (`core-web-vitals`·`performance`·`accessibility`·`web-quality-audit`)를 추가하면 된다.
> 현재는 미설치 — 한 줄로 도입 가능: `npx skills add addyosmani/web-quality-skills@core-web-vitals -y`

## End-to-End 개발 프로세스

단계의 **골격은 Superpowers**가 제공하지만, 매 단계의 **게이트는 사람과의 인터뷰
(grilling)**가 연다. 자동화는 그 사이에서 사람이 켤 때만 도는 옵트인 보조다.

```
아이디어 ──▶ 정렬 ──▶ 모듈 설계 ──▶ 계획 ──▶ 구현(TDD) ──▶ 디버깅 ──▶ 리뷰·검증 ──▶ 출시
            └─ 매 화살표마다 grilling으로 사람이 확인하고 넘어간다 ─┘          │
                                            (며칠마다) 아키텍처 개선 ◀────────┘
```

표의 열은 **사람 게이트(주도)**와 **옵트인 자동화(보조)**로 나뉜다. 기본은 사람
게이트이고, 자동화는 사람이 명시적으로 켤 때만 돌리며 그 결과는 다시 사람이 확인한다.

| 단계 | 목적 | 사람 게이트 (grilling 주도) | 옵트인 자동화 (Superpowers, 보조) |
|------|------|------------------------------|-----------------------------------|
| **0. 셋업** | 프로젝트 1회 준비 | `domain-modeling`로 `CONTEXT.md` 시작 | `using-superpowers`, 필요 시 `using-git-worktrees` |
| **1. 정렬** | 무엇을 만들지 합의 | **`grill-with-docs`**(설계를 끝까지 추궁 + 용어집/ADR 작성) — **최소 2–3회 반복**하여 충분히 수렴한 뒤 다음으로 넘어간다 | `brainstorming`(접근법 발산, 설계안 제안) |
| **2. 모듈 설계** | 어떻게 잘 만들지 | `codebase-design`(작은 인터페이스·깊은 구현·깨끗한 seam) + `domain-modeling`(결정 기록) | — |
| **3. 계획** | 실행 가능한 작업으로 분해 | `writing-plans` 초안을 grilling으로 검토·확정 | `writing-plans`(파일·인터페이스 명시한 TDD 계획 초안 생성) |
| **4. 구현** | 코드 작성 | `tdd`/`test-driven-development`로 계획 문서를 읽고 슬라이스마다 red-green-refactor를 사람이 확인 / *프론트엔드면* `frontend-design`+`design-taste-frontend` 생성 결과를 사람이 검토 | `executing-plans`(한 세션 배치) 또는 `subagent-driven-development`(서브에이전트 병렬+task별 리뷰, 무거움) |
| **5. 디버깅** | 막히면 | `systematic-debugging` 가설을 사람과 합의 | — |
| **6. 리뷰·검증** | 품질 게이트 | 자동 리뷰/검증 결과를 grilling으로 사람에게 확인받은 뒤 진행 / *프론트엔드면* `baseline-ui`·`fixing-accessibility`·`fixing-motion-performance`로 정제 | `requesting-code-review` + `verification-before-completion`(자동 제안) |
| **7. 출시** | 통합/배포 | 사람이 통합 결정 | `finishing-a-development-branch` (머지·PR·정리) |
| **상시** | 구조 건강 유지 | `improve-codebase-architecture`를 사람과 함께(며칠마다 1회, 얕은 모듈을 깊게) | — |

### 병렬 worktree 개발 (옵트인)

여러 작업을 동시에 진행할 때는 `using-git-worktrees`로 격리 작업공간을 쓴다. 병렬
자동화는 인터랙션을 줄이므로 **기본 비활성이며, 사람이 명시적으로 켤 때만** 사용한다.

1. **격리.** `using-git-worktrees`로 worktree를 N개 만든다 — worktree당 task 1개.
2. **(옵트인) 병렬 실행.** 각 worktree에 `subagent-driven-development`로 서브에이전트를
   병렬 투입할 수 있다. 켤지 말지는 사람이 결정한다.
3. **사람이 수렴.** 각 worktree의 결과를 grilling으로 검토·수렴한다 — 자동 병합 금지.
4. **통합.** `finishing-a-development-branch`로 머지/PR/정리한다.

> 원칙: 병렬 자동화의 산출물도 '제안'이다. 사람 확인 게이트를 거치지 않은 worktree
> 결과는 통합하지 않는다.

### 각 단계 운영 팁

1. **정렬(1단계)이 가장 중요하다.** 가장 흔한 실패는 "에이전트가 원하는 걸 안 만든 것".
   `brainstorming`으로 옵션을 펼쳐 *제안*을 받은 뒤, **주역인 `grill-with-docs`로 사람이
   설계를 끝까지 추궁**한다. 여기서 만든 `CONTEXT.md`는 이후 모든 단계의 토큰을 아끼고
   명명을 일관되게 만든다.
   > ⚠️ **`grill-with-docs`는 1회로 끝내지 않는다.** 한 번 grilling 후 brainstorming으로
   > 넘어가면 발산에 빠지기 쉽다. **최소 2–3회 반복**해서 설계 결정이 충분히 수렴된 뒤
   > brainstorming(보조 발산)이나 다음 단계로 넘어간다.
2. **계획 전에 모듈 경계를 정한다.** `codebase-design` 어휘(module/interface/seam/depth)로
   "작은 인터페이스 뒤에 많은 동작"을 추구하면 테스트 가능성이 따라온다.
3. **세로 슬라이스로만 만든다.** 테스트 전부 먼저(가로 슬라이스) 금지.
   한 테스트 → 한 구현 → 반복.
4. **자동화는 옵트인, 검증은 사람이 닫는다.** 서브에이전트 병렬 실행·자동 검증은 사람이
   켤 때만 돌리고, 그 결과(`requesting-code-review`·`verification-before-completion`)는
   grilling으로 사람에게 가져와 확인받은 뒤에만 "done"으로 넘어간다.

## 공통 원칙

- **사람이 매 게이트의 주인이다.** 자동화는 옵트인 보조이며 산출물은 '제안'이다.
- **DRY, YAGNI, TDD, 잦은 커밋.**
- 큰 기능은 한 번에 만들지 말고 검증 가능한 세로 슬라이스로 쪼갠다.
- 코드보다 먼저 문제·성공 기준·용어를 사람과 함께(grilling) 명확히 한다.
- 구조가 복잡해지면 구현보다 경계(seam)를 먼저 정리한다.
- 에이전트가 빨라질수록 엔트로피도 빨라진다 — 아키텍처를 **매일** 챙긴다.

## 중복 스킬에 대한 안내

두 모음에 비슷한 스킬이 있다. 충돌이 아니라 **진입 지점에 따라 자연스럽게 선택**된다.

- **TDD** — `test-driven-development`(Superpowers)와 `tdd`(Matt Pocock)는 같은
  red-green-refactor 규율이다. Superpowers 실행 체인(`subagent-driven-development`/
  `executing-plans`)을 옵트인으로 따라갈 땐 전자를, 사람이 직접 모는 독립 기능 작업에선
  후자를 쓴다.
- **인터뷰** — `brainstorming`은 **발산**(옵션을 펼쳐 제안), `grilling`/`grill-with-docs`는
  **수렴**(한 설계를 추궁해 결정 트리를 닫음). **주역은 사람을 추궁하는 grilling 계열**이고
  brainstorming은 옵션을 펼치는 보조다. `brainstorming`의 design/spec은 초안이고,
  `grill-with-docs`가 그 문서를 사람과 함께 검증해 같은 spec을 갱신한다. `CONTEXT.md`와
  ADR은 결정 기록이며, 구현 plan은 수렴된 spec 하나에서 `writing-plans`로만 생성한다.

## 빠른 시작

설계는 사람(Matt 스킬)이 주도하고, Superpowers 자동화는 옵트인 보조다.
`using-superpowers`는 스킬을 찾아 쓰는 상시 라우터일 뿐, 별도 단계가 아니다.

```text
1) /grill-with-docs 로 사람이 설계를 추궁·검증하고 CONTEXT.md·ADR을 만든다 (주역)
   ⚠️ 1회로 끝내지 않는다 — 최소 2–3회 반복하여 설계가 충분히 수렴된 후 다음으로 넘어간다.
   (1회만 하면 brainstorming으로 넘어가며 발산에 빠지기 쉽다)
   · (선택 보조) /brainstorming 으로 옵션을 펼쳐 설계안 후보를 받을 수 있다
2) /codebase-design + /domain-modeling 으로 모듈 경계를 사람과 합의한다
3) /writing-plans 로 docs/superpowers/plans/에 자기완결 TDD 계획을 만들고 grilling으로 확정한다
4) /tdd 로 그 계획 문서를 읽어 단계별로 직접 구현 — 인터페이스·테스트할 행동을 사람과 확인하고
   세로 슬라이스(한 테스트→한 구현) red-green-refactor (기본/주역)
   · (옵트인 자동화) 한 세션 배치는 /executing-plans, 독립 task가 많고 자동 리뷰를 원하면
     /subagent-driven-development(서브에이전트 병렬+task별 리뷰, 무겁고 느림),
     병렬 격리는 /using-git-worktrees — 결과는 grilling으로 사람이 수렴한다
5) /requesting-code-review·/verification-before-completion(자동 제안)을 돌린 뒤
   결과를 사람이 확인하고 /finishing-a-development-branch 로 마무리한다
```
