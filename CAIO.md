# Caio's Workflow

## 0) Ground Rules (Always On)

**Repo layout must contain:**
```
/docs/plans/
/docs/decisions/
frontend/
backend/
testing
AGENTS.md
```

### Branching model:
main (protected) → feat/<short-name> → PR → CI → merge.

### Quality gates:
lint → test → build.

### Single sources of truth:
- Scope & execution → /docs/plans
- Decisions → /docs/decisions
- Rules & conventions → AGENTS.md

---

## 1) Discovery (Codex — NO CODE)

**Objective:** understand the task before coding.

**Must produce:**
- dependency map
- impacted modules / files
- constraints
- risks
- numbered open questions

**Rules:**
- MUST read AGENTS.md and /testing/README.md
- MUST NOT write code here
- MUST NOT expand scope
- MUST stop discovery once all ambiguities are resolved

---

## 2) Plan Creation (Writes Markdown Only)

Generate a **plan file**:
```
/docs/plans/plan1.md
```
If one exists, generate plan2.md, and so on.

Plan must include:

### Checklist
- 🟥 To Do
- 🟨 In Progress
- 🟩 Done
- Overall Progress % at top

### Intended Outcome / UX / UI

### Technical Design
- structure
- data flow
- modules
- contracts
- error handling

### Tests
Follow /testing/README.md.

### Notes & Decisions
- trade-offs
- rejected approaches
- design reasoning

**Rules:**
- No scope expansion
- Minimal, modular steps
- Must obey AGENTS.md

---

## 3) Implementation Loop (Autonomous Mode)

Controls **all** coding.

### Implementation Rules
For each task in the plan:
1. implement code exactly as specified
2. update the plan (🟥 → 🟩 or 🟨)
3. update the Overall Progress %
4. add a Note/Decision entry
5. commit:
```
feat(plan-step-x.y): <description>
```
6. **immediately move to the next red task**
   (no waiting, no questions, no confirmation, unless an ambiguity is found — in that case, discuss and ask what to do)

---

## 4) Integration & Hardening

Must:
- verify FE ↔ BE contracts
- ensure no mismatches in DTOs/routes/types
- ensure tests pass
- ensure npm run build is clean
- update docs

---

## 5) Governance

- All major choices → /docs/decisions/YYYY-MM-DD-topic.md
- Every merge → add simple release notes
- New ideas → backlog (never modify active plan)
