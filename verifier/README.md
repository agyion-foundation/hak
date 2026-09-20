# Verifier Index — HAK/Agyion goal-mode checks

## v1 (2026-09-19 ~22:00) — initial acceptance criteria
Measures: build/test correctness, completeness of one-shot deliverable set, language rule, deploy liveness.
Checks:
1. `cargo test` (contracts) — all pass, count recorded
2. `npm run build` (app) — exit 0; static export present
3. Repo language rule — no Turkish UI strings in `app/`, contracts identifiers English (grep checks)
4. Four templates present: Fade, Pod, Trigger, Envoy (grep in contracts + app)
5. Docs set present: README.md (root, English), pitch deck file, LIMITATIONS, archify diagram HTML
6. Cloudflare Pages live URL returns HTTP 200
7. Skill citations listed in README (handbook requirement)
Runs logged under verifier/runs/ (timestamped, command + exit code + key values).
