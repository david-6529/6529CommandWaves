# GitHub Reviewer Gate

The reviewer should become a merge gate, not just a comment.

For code work, the safe path is:

```text
Wave command -> rules check -> vote if needed -> agent PR -> reviewer gate -> human merge -> downstream deploy
```

## MVP Gate

The first version runs as a required GitHub Action named `Command Waves Guardian`.

Current CI check:

```text
npm run guardian:check
```

That command runs the deterministic guardian/proof tests. It proves the verifier code is stable and rerunnable before the
repo can merge changes that modify the verifier.

Next adapter:

```text
pull_request event -> changed paths -> PR manifest -> 6529 vote proof -> same verifier -> pass/fail check
```

The important constraint is that the adapter must call the same deterministic verifier. It should gather evidence, not make
subjective decisions.

The PR manifest is embedded in the PR body between stable markers:

````text
<!-- command-waves:manifest:start -->
```json
{ ... }
```
<!-- command-waves:manifest:end -->
````

The parser and PR evidence adapter live in `src/lib/github/pr-reviewer-gate.ts`:

- `formatCommandPrManifestForPullRequest`
- `extractCommandPrManifestFromPullRequestBody`
- `createGuardianPullRequestAttestation`

This means the CI/GitHub App layer only has to gather:

- PR body
- changed file paths
- current wave state
- 6529 vote/proposal evidence

Then it calls the deterministic verifier.

The opt-in GitHub PR adapter opens draft PRs with this manifest in the body after a controlled harness has prepared the
branch.

The workflow also has a PR evidence check:

```text
npm run guardian:pr-check
```

It runs on every pull request. The script reads `GITHUB_EVENT_PATH`, fetches changed file paths,
loads wave state from `COMMAND_WAVE_STATE_PATH` or `COMMAND_WAVE_STATE_URL`, creates the guardian attestation, writes
`guardian-attestation.json`, writes the exact `guardian-wave-state.json` snapshot it checked, writes
`guardian-pr-evidence.json`, appends a GitHub step summary, replays the proof, uploads the files as a `guardian-proof`
workflow artifact, and fails if the deterministic result is not `pass`.

The script will not silently use demo state in production. `COMMAND_WAVE_ALLOW_DEMO_STATE=true` must be set explicitly for
local demos.

The check fails if:

- the PR has no Command Waves manifest
- the manifest points to a missing proposal
- the proposal is not approved, reviewing, or complete
- the command is not an `open_pr` command
- a required wave decision receipt has not been recorded
- the manifest poll drop id does not match the recorded wave decision receipt
- the manifest rules hash does not match the approved command
- the manifest prompt/spec hashes do not match the approved command
- the PR touches high-risk files without a high-risk or critical approval
- the PR touches guardian/reviewer/proof code without a critical-risk approval
- the PR or approved command touches hook contract deployment, parameters, governance, or upgradeability patterns without the required risk level
- hook parameter work does not name an explicit numeric cap or bound-focused test evidence
- REP, TDH, or holder threshold language is claimed as live authority before live weighting is wired
- upgradeability appears without an explicit exception and critical approval
- added Solidity patch content contains upgradeability, delegatecall, deployment, governance, or parameter-write patterns without the required approval

The guardian should be deterministic. An LLM can help explain the result or suggest extra risks, but the merge-blocking
decision should come from checks that anyone can rerun.

For the first phase, local counted votes are visible sentiment only. PR build and reviewer approval require a recorded
wave decision receipt that points to a 6529 decision drop. The receipt does not claim live REP, TDH, or weighted voting.

## Hook Contract Signals

The first public project is a 6529 hook, so the reviewer has contract-specific signals in addition to generic risky-path
checks:

- contract source changes: medium risk
- deployment scripts, broadcast output, and chain config: high risk
- hook parameter, fee, bound, limit, and config changes: high risk
- governance, owner, role, timelock, Safe, threshold, quorum, and TDH control changes: critical risk
- proxy, UUPS, diamond, initializer, delegatecall, and upgradeability patterns: critical risk and blocked by default
- added Solidity patch content is scanned for upgradeability, delegatecall, deployment, governance, and parameter writes when GitHub provides file patches

The first phase defaults to immutable contracts. Upgradeability requires the approved command text to include an explicit
upgradeability exception and the manifest must carry critical risk.

Parameter changes are narrower than general contract changes. The approved command must name a numeric cap or upper bound,
and it must ask for tests or equivalent reviewer evidence for that bound. REP, TDH, and holder thresholds can be recorded
as planned governance notes, but they are not treated as enforceable authority until live weighting is connected.

Fairness rule:

```text
Same proposal + same vote + same rules + same PR manifest + same diff = same guardian result
```

That is the core proof. The guardian output is an attestation with:

- verifier version
- wave-state hash
- proposal hash
- poll hash
- input hashes
- rules hash
- manifest hash
- changed-paths hash
- changed-file patch hash when PR patch evidence is available
- every check result
- final pass/fail
- attestation hash

The current attestation code is in `src/lib/github/pr-reviewer-gate.ts`.

The app's review record stores the same compact proof material:

- verifier name and version
- deterministic mode
- input hashes
- result hash
- attestation hash

So a review is not only a human-readable summary. It carries the proof needed to rerun and audit the reviewer.

The GitHub artifact should include these files:

- `guardian-attestation.json`: the verifier, hashes, check results, and final pass/fail.
- `guardian-wave-state.json`: the exact wave snapshot used by the guardian. Its hash must match
  `inputs.waveStateHash` in the attestation.
- `guardian-pr-evidence.json`: the exact PR body and changed paths used by the guardian.
  When available, it also includes changed-file patches used for Solidity content checks.

Replay the artifact with:

```text
GUARDIAN_ATTESTATION_PATH=guardian-attestation.json \
GUARDIAN_WAVE_STATE_SNAPSHOT_PATH=guardian-wave-state.json \
GUARDIAN_PR_EVIDENCE_PATH=guardian-pr-evidence.json \
npm run guardian:verify-proof
```

## Manifest

Every agent PR should include a manifest. It can start in the PR body and later move to a committed artifact.

Required fields:

- `waveId`
- `waveUrl`
- `proposalId`
- `pollDropId`
- `commandKind`
- `risk`
- `rulesVersion`
- `rulesHash`
- `promptHash`
- `specHash`
- `allowedPermissions`
- `runManifestHash`
- `approval`

The current TypeScript foundation is in `src/lib/github/pr-reviewer-gate.ts`.

## Production Gate

The stronger version should be a GitHub App.

Why:

- GitHub can require the check before `main` changes.
- The required check can be tied to the app/source that produced it.
- The reviewer logic can live outside the target repo, so a PR cannot weaken the gate by editing workflow code.
- The app can post check-run details with exact failures and links back to the wave command.

The app needs scoped permissions:

- metadata read
- contents read
- pull requests read
- checks write
- administration write only during setup if it creates rulesets

The current setup proof declares the MVP mode explicitly:

```text
guardian.enforcementMode = repo_local_github_action
guardian.productionStrength = mvp
```

That means the check is useful and replayable, but it is still running from the governed repo. Guardian code and workflow
changes are critical-risk diffs, so normal command approvals cannot silently weaken the gate. For the strongest production
trust boundary, move the reviewer into an external GitHub App and update the proof to:

```text
guardian.enforcementMode = external_github_app
guardian.productionStrength = strong
```

## Deployment

Vercel should stay downstream from GitHub:

1. Vercel previews every PR.
2. GitHub blocks merge until the reviewer gate passes.
3. Vercel deploys production from `main`.

This keeps the production safety boundary in GitHub. Vercel does not need to understand wave governance; it only deploys code that GitHub allowed onto `main`.

## Third-Party Verification

The setup must be externally verifiable. A user should not have to trust the Command Waves UI.

The app exposes a public setup proof at:

```text
GET /api/command-wave/setup/proof
```

The proof includes:

- wave id and wave URL
- GitHub repo
- protected branch
- required reviewer check name
- Vercel production branch expectation
- guardian enforcement mode
- guardian proof artifact and replay command
- command-wave storage mode and durability
- rules version and rules hash
- PR manifest schema hash
- reviewer gate version and hash
- GitHub API URLs a third party can query to inspect rulesets and branch rules
- stable `setupHash`
- timestamped `attestationHash`

The first implementation is a deterministic hash-based attestation. Later we can add:

- Ed25519 signatures from a Command Waves setup key
- GitHub App identity binding
- 6529 drop anchoring
- onchain anchoring of setup hashes
- independent watcher agents that periodically verify the proof against GitHub, Vercel, and 6529 state

Anyone can verify the current setup proof with:

```text
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof npm run setup:verify
```

The verifier checks the proof hashes and confirms the proof's required GitHub check appears in GitHub required status-check
payloads. For offline verification, provide `SETUP_PROOF_PATH` and `SETUP_GITHUB_PAYLOADS_PATH`.

To fail unless the setup uses an external guardian:

```text
SETUP_REQUIRE_EXTERNAL_GUARDIAN=true \
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof \
npm run setup:verify
```

To fail unless the setup uses production-durable storage:

```text
SETUP_REQUIRE_PRODUCTION_STORAGE=true \
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof \
npm run setup:verify
```
