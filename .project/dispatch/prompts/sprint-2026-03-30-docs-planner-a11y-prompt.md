# Sprint Dispatch: Documentation Update — Planner & A11y

## Mission

Update README.md to document the Planner module and accessibility features from goals 4 and 13.
**Exit Criteria:** README has Planner section, a11y features listed, and planner/ in project structure.

**Project:** `/Users/jima/comware/workspace/paddock`
**Duration:** ~1 hour

---

## Handoffs (2 total)

Execute in dependency order. P0 handoffs are blocking.

---

### Handoff 1: `DOC16-001-readme-updates` (P0, 0.5h)

**Update README with Planner Section, A11y Features, and Project Structure**

Update README.md with three additions:

1. ADD PLANNER MODULE SECTION after the Propagation Module section (### header with emoji, matching existing style):
   - Crop calendar and succession planning
   - Event creation with lifecycle tracking
   - Integration with Grow trays and Propagation batches
   - Calendar view (react-big-calendar)
   - Event list and detail views

2. ADD ACCESSIBILITY FEATURES to the Platform Features section:
   - Skip navigation link
   - Toast notification system for action feedback
   - aria-live regions for dynamic content
   - Focus ring indicators on interactive elements
   - prefers-reduced-motion support
   - Semantic HTML and ARIA attributes

3. UPDATE PROJECT STRUCTURE to include planner/:
   Add `planner/` line between `grow/` and `propagation/` in the tree.

**Tasks:**
1. Read current README.md
2. Add Planner Module section after Propagation Module section
3. Add Accessibility subsection to Platform Features
4. Add `planner/` to project structure tree
5. Verify all three changes are present

**Acceptance:**
- [ ] README has Planner module section with at least 3 feature bullets
- [ ] README lists skip nav, toast, aria-live, focus rings
- [ ] Project structure includes planner/ line

**Signals:**
- When starting: `<comware:handoff_start id="DOC16-001-readme-updates">`
- When done: `<comware:handoff_complete id="DOC16-001-readme-updates">`
- If blocked/failed: `<comware:handoff_failed id="DOC16-001-readme-updates">`

---

### FINAL Handoff: `DOC16-999-commit-verify` (P0, 0.5h)

**Commit, Verify CI, Update Goal Progress**

This handoff is MANDATORY. Do NOT skip it. Do NOT signal `<comware:done>` until CI is green and goal progress is updated.

**Tasks:**
1. Review all changes: `git status`
2. Stage README.md: `git add README.md`
3. Commit: `git commit -m "docs: add Planner module section and accessibility features to README"`
4. Push: `git push origin main`
5. Wait for CI and watch: `sleep 10 && gh run watch --exit-status`
6. If CI fails:
   - Read failure logs: `gh run view --log-failed`
   - Fix the failures, commit, push again
   - Re-watch until green
7. **Update goal progress in `.project/project.yaml`:**
   - Mark sc-16-1, sc-16-2, sc-16-3 as `completed: true`
   - Set goal-16 `progress: 100`
   - Set goal-16 `status: completed`
   - Add `completed_date: 2026-03-30`
   - Stage and commit project.yaml update

**Acceptance:**
- [ ] All sprint changes committed
- [ ] Changes pushed to remote
- [ ] CI pipeline passed (verified via: `gh run list --limit 1` shows success)
- [ ] No uncommitted work remains
- [ ] Goal success_criteria updated for completed items
- [ ] Goal progress set to 100

Blocked by: DOC16-001-readme-updates

**Signals:**
- When starting: `<comware:handoff_start id="DOC16-999-commit-verify">`
- When done: `<comware:handoff_complete id="DOC16-999-commit-verify">`
- If blocked: `<comware:handoff_failed id="DOC16-999-commit-verify">`

---

## Completion

After ALL handoffs complete (including commit-verify):

1. Verify all acceptance criteria met
2. Verify CI is green
3. Signal completion:

```
<comware:done>
```

---

## Notes

- Docs-only sprint — no code changes, no new tests needed
- Keep README style consistent with existing emoji-prefixed sections
- Planner module was delivered in goal-4 (commits f1210f0, caec5eb)
- Accessibility features were delivered in goal-13
