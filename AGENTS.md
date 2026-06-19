# Agent Operating Instructions

This repository defines a skill-based development process. Every agent must treat the repository documents as active operating context, not passive reference material.

## Required Context Loading

Before planning, implementing, reviewing, or answering project-specific questions, inspect the relevant current documents:

1. `README.md` for the overall skill workflow and repository intent.
2. `CONTEXT.md` for canonical domain language.
3. `docs/adr/` for accepted architectural and product decisions.
4. `docs/superpowers/specs/` for approved product and feature designs.
5. `docs/superpowers/plans/` for implementation plans when they exist.

If a path does not exist yet, note that and continue. Do not invent missing decisions.

## Skill Usage and Document Precedence

- Use the required skill workflow, but do not let a skill run from memory alone.
- When a skill asks for project context, load the documents above before making project decisions.
- **Every decision gate is run with Matt Pocock grilling / human interaction first.** The human is the protagonist at each stage. Use Matt Pocock skills (grill-with-docs, grilling, domain-modeling, codebase-design) to drive alignment, naming, and module design through interview.
- **Superpowers provides the stage skeleton and opt-in automation only.** Subagent-driven execution and automated verification (subagent-driven-development, executing-plans, requesting-code-review, verification-before-completion) are NOT the default. Use them only when the human explicitly opts in, and treat their output as a *proposal*: bring automated review/verification results back to the human via grilling and get confirmation before proceeding.
- Parallel worktree development (using-git-worktrees) is opt-in; never auto-merge worktree results — the human converges them via grilling before integration.
- If a document conflicts with the current user instruction, ask or resolve the conflict explicitly before changing code or plans.

## Keeping Documents Current

- When domain terms are clarified, update `CONTEXT.md`.
- When a hard-to-reverse architectural or product decision is made, add an ADR under `docs/adr/`.
- When a design changes, update the relevant file under `docs/superpowers/specs/`.
- When implementation order, task boundaries, files, or tests change, update the relevant file under `docs/superpowers/plans/`.

## Planning and Implementation Discipline

- Do not implement from an idea alone when an approved spec or plan exists.
- Prefer the newest relevant spec and plan; if multiple documents apply, state which one governs the work.
- **Default implementation is direct, human-driven `tdd`/`test-driven-development`:** read the newest plan in `docs/superpowers/plans/` (self-contained — exact file paths + failing-test code) and implement step-by-step in vertical slices (one test → one implementation), confirming interface and behaviors with the human. The `tdd` skill itself only loads `CONTEXT.md`/ADRs, so **reading the plan document is wired here** — always load the governing plan before implementing. `executing-plans` (in-session batch) and `subagent-driven-development` (parallel subagents with per-task review — heavier/slower) are opt-in automation, not the default.
- Keep implementation aligned with the glossary and ADRs. Do not introduce alternate names for established domain concepts.
- If implementation reveals that a spec, plan, ADR, or glossary entry is wrong, update the document in the same change set as the code or stop and ask for direction.
