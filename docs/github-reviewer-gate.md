# GitHub Reviewer Gate

The reviewer should become a merge gate, not just a comment.

For code work, the safe path is:

```text
Wave command -> rules check -> vote if needed -> AI worker PR -> reviewer gate -> merge -> deploy
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

The workflow also has a PR evidence check:

```text
npm run guardian:pr-check
```

It runs on pull requests that contain the manifest markers. The script reads `GITHUB_EVENT_PATH`, fetches changed file paths,
loads wave state from `COMMAND_WAVE_STATE_PATH` or `COMMAND_WAVE_STATE_URL`, creates the guardian attestation, writes
`guardian-attestation.json`, and fails if the deterministic result is not `pass`.

The script will not silently use demo state in production. `COMMAND_WAVE_ALLOW_DEMO_STATE=true` must be set explicitly for
local demos.

The check fails if:

- the PR has no Command Waves manifest
- the manifest points to a missing proposal
- the proposal is not approved, reviewing, or complete
- the command is not an `open_pr` command
- a required poll has not passed
- the manifest rules hash does not match the approved command
- the manifest prompt/spec hashes do not match the approved command
- the PR touches high-risk files without a high-risk or critical approval

The guardian should be deterministic. An LLM can help explain the result or suggest extra risks, but the merge-blocking
decision should come from checks that anyone can rerun.

Fairness rule:

```text
Same proposal + same vote + same rules + same PR manifest + same diff = same guardian result
```

That is the core proof. The guardian output is an attestation with:

- verifier version
- input hashes
- rules hash
- manifest hash
- changed-paths hash
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

## Manifest

Every AI worker PR should include a manifest. It can start in the PR body and later move to a committed artifact.

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
