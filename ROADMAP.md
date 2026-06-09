# Roadmap — Relief Network

Living list of upcoming work. Newest/most-relevant at the top of each section.

## In progress

- **Fider feedback board** — self-hosted public board for feature requests /
  feedback (vote, comment, triage). App side is wired: a build-time `FEEDBACK_URL`
  surfaces a "Feedback & ideas" link in the header (hidden until set). Remaining:
  infra deploys Fider + a `requests.thecoll.org` subdomain and sets `FEEDBACK_URL`.
  See **docs/FEEDBACK-FIDER-HANDOFF.md**.

## Infra / cutover (in progress)

- Promote `develop` → `main` once testing sign-off is complete (prod = `rn.thecoll.org`).
- Decommission the old `lbresponse-api` + `lbresponse-web` hosting after cutover,
  and rotate the committed `collreliefnetwork` Firebase service-account key.

## Notes

- Branch model: `main` = production (`rn.thecoll.org`), `develop` = testing
  (`testing-rn.thecoll.org`). See `infra-handoff.md`.
