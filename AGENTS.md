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
- When Superpowers and Matt Pocock skills both apply, use Superpowers for process flow and Matt Pocock skills for domain language, module design, grilling, and architectural judgment.
- If a document conflicts with the current user instruction, ask or resolve the conflict explicitly before changing code or plans.

## Keeping Documents Current

- When domain terms are clarified, update `CONTEXT.md`.
- When a hard-to-reverse architectural or product decision is made, add an ADR under `docs/adr/`.
- When a design changes, update the relevant file under `docs/superpowers/specs/`.
- When implementation order, task boundaries, files, or tests change, update the relevant file under `docs/superpowers/plans/`.

## Planning and Implementation Discipline

- Do not implement from an idea alone when an approved spec or plan exists.
- Prefer the newest relevant spec and plan; if multiple documents apply, state which one governs the work.
- Keep implementation aligned with the glossary and ADRs. Do not introduce alternate names for established domain concepts.
- If implementation reveals that a spec, plan, ADR, or glossary entry is wrong, update the document in the same change set as the code or stop and ask for direction.
