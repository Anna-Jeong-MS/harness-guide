# Harness Guide

This context defines the language for the skill-driven development guide in this repository.

## Language

**Skill-driven development**:
A development workflow where agents choose and follow named skills for alignment, design, planning, implementation, review, and release.
_Avoid_: Agent workflow, automation workflow

**Human gate**:
A decision point where the human confirms scope, design, plan, implementation evidence, or integration before the process proceeds.
_Avoid_: Automatic gate, verification gate

**Matt Pocock-led flow**:
The default flow where Matt Pocock skills drive human interaction, domain language, module design, and direct TDD implementation.
_Avoid_: Matt supplement, engineering judgment layer

**Superpowers supplement**:
The supporting role where Superpowers skills provide stage structure and optional automation, but do not own the decision gate.
_Avoid_: Superpowers spine, Superpowers-led process

**Opt-in automation**:
Automation that runs only when the human explicitly chooses it, and whose output is treated as a proposal until a human gate accepts it.
_Avoid_: Default automation, mandatory automation

**Direct TDD**:
The default implementation path where the agent reads the governing plan and uses `tdd` to implement one vertical slice at a time with human-confirmed behavior.
_Avoid_: Subagent-first implementation, batch implementation

**Parallel worktree development**:
An opt-in workflow where independent tasks run in separate git worktrees and are converged by a human gate before integration.
_Avoid_: Automatic parallel merge, default subagent development
