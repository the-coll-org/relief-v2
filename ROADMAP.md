# Roadmap — Relief Network

Living list of upcoming work. Newest/most-relevant at the top of each section.

## Planned

- **Installing Fider to manage features** — stand up a [Fider](https://fider.io)
  instance to collect, vote on, and triage feature requests / feedback for the
  Relief Network product.

## Infra / cutover (in progress)

- Promote `develop` → `main` once testing sign-off is complete (prod = `rn.thecoll.org`).
- Decommission the old `lbresponse-api` + `lbresponse-web` hosting after cutover,
  and rotate the committed `collreliefnetwork` Firebase service-account key.

## Notes

- Branch model: `main` = production (`rn.thecoll.org`), `develop` = testing
  (`testing-rn.thecoll.org`). See `infra-handoff.md`.
