# ADR 0002: 프론트엔드 스킬 고정과 직접 TDD 기본 경로

- 날짜: 2026-06-19
- 상태: 승인됨

## 맥락

ADR 0001은 Matt Pocock 주도·사람 인터랙션 우선 원칙을 세웠지만, 이후 실제 운영에서 두
가지 보완이 필요해졌다. 첫째, `baseline-ui`만으로는 프론트엔드 생성 품질이 약해
생성형 디자인 스킬을 프로젝트에 고정해야 했다. 둘째, `subagent-driven-development`는
task별 리뷰가 붙어 무겁고 느리므로 기본 구현 경로로 두면 "자동화는 보조"라는 원칙과
충돌한다.

## 결정

1. `frontend-design`(anthropics/skills)과 `design-taste-frontend`
   (leonxlnx/taste-skill)를 프로젝트 스킬로 고정한다. 프론트엔드 흐름은
   **생성 → 테이스트 → 정제**로 설명한다.
2. 기본 구현 경로는 직접적인 사람 주도 `tdd`다. `writing-plans`가 만든 최신 계획 문서를
   읽고 세로 슬라이스(한 테스트→한 구현)로 진행한다.
3. `executing-plans`(한 세션 배치)와 `subagent-driven-development`
   (서브에이전트 병렬+task별 리뷰)는 옵트인 자동화다. 특히 `subagent-driven-development`는
   검증이 무겁고 느리므로 기본값으로 쓰지 않는다.
4. in-repo worktree 위치(`.worktrees/`)는 dirty status와 accidental add를 막기 위해
   `.gitignore`에 추가한다.

## 결과

- `skills-lock.json`은 프론트엔드 스킬 고정을 반영해 변경된다.
- `README.md`와 `AGENTS.md`는 직접 `tdd` 기본 경로와 옵트인 자동화를 명확히 구분한다.
