# Product Reset Plan

Status: proposed product and architecture direction. This document describes the target system, not current production behavior.

## 1. Product Decision

The pilot should feel like an active open source build with a real goal, real people, available work, visible decisions, and a shared reward. It should not feel like a governance dashboard, a launch checklist, or documentation about how collaboration might work.

The product is a standalone workspace for the 6529 AMM hook. Its internal model should remain project-aware so the same infrastructure can support other public builds later, but there should be no project marketplace or generic platform UI in this pilot.

The core promise is:

> Build one immutable AMM hook together. Claim useful work, make decisions in public, ship reviewed pull requests, and earn a transparent share of the contributor fee.

The first screen must answer five questions within a few seconds:

1. What are we building?
2. What needs help now?
3. What decision is open?
4. Who is already contributing?
5. How is the contributor reward divided?

## 2. Product Principles

1. The work is the interface. Current tasks, decisions, pull requests, and people lead the page.
2. Discussion is natural. Builders write normal messages. `daemon` extracts structure without asking people to classify posts.
3. Rewards follow accepted evidence, not activity volume, popularity, or an opaque AI score.
4. AI recommends. Versioned rules and human decisions authorize.
5. Every consequential state change is reproducible from public evidence.
6. The hook remains immutable by default. Limited parameters can change only inside explicit onchain bounds.
7. The public product and maintainer operations are separate surfaces.
8. One successful pilot comes before reusable platform features.

## 3. Target Experience

### Desktop workspace

```text
+--------------------------------------------------------------------------------------+
| DECENTRALIZED CODING: BETA       6529 AMM HOOK       GitHub      Connect wallet     |
+--------------------------------------------------------------------------------------+
| 50 builders. One immutable hook. Fees shared by accepted contribution.               |
| Phase: Core design       22 / 50 seats       3 open PRs       Contributor share: TBD |
+--------------------------------------------------------------------------------------+
| VOTE NOW: Fee cap and bounds             18h left       View proposal   Vote          |
+------------------------------------------------------+-------------------------------+
| BUILD                                                | LIVE DISCUSSION               |
| Milestone 2 of 5: Safe fee accounting               | All  Design  Reviews          |
|                                                      |                               |
| Available  In progress  Review  Done                 | daemon summary                |
|                                                      | The group agrees on...        |
| #18 Add fee bound invariants       25 credits        |                               |
| Tests open  Medium risk  2 builders                  | builder messages              |
|                                                      |                               |
| #21 Review hook permission flags   15 credits        |                               |
| Security review open  High risk                       | Message the group...          |
+------------------------------------------------------+-------------------------------+
| ACTIVE PULL REQUESTS                                                                 |
| #42 Fee bound tests       Review passed       3 contributors       Open on GitHub     |
+--------------------------------------------------------------------------------------+
| CONTRIBUTORS                                                                         |
| Profiles, accepted work, current credits, vote record, and linked evidence           |
+--------------------------------------------------------------------------------------+
| Latest proof root       Rules v1.0       Reward formula v1.0       Verify             |
+--------------------------------------------------------------------------------------+
```

This is an application screen, not a homepage. There is no separate marketing hero and no long explanation before the work.

### Mobile workspace

Mobile uses a stable `Work | Chat | People` segmented control. An open vote stays directly below the project header. Task cards show title, status, credits, and role openings without compressing desktop columns into unreadable blocks.

### Visual direction

- Dark mode only.
- Near-black base, warm white text, and restrained signal colors.
- Lime indicates accepted contribution and rewards.
- Amber indicates decisions and time-sensitive review.
- Cyan identifies `daemon` and machine-generated summaries.
- Red is reserved for blocked or security-critical states.
- Solid surfaces, thin borders, 4 to 6 pixel radii, and no nested cards.
- Large, readable body text. Dense metadata uses a monospaced face.
- Motion is limited to live state changes, progress, and new discussion activity.
- The product becomes engaging through visible momentum, code, people, and rewards, not decoration.

### Navigation

The pilot needs four public destinations:

| Route | Purpose |
| --- | --- |
| `/` | The active build workspace |
| `/work/[id]` | Scope, discussion, contributors, decision, PR, review, and credits for one work item |
| `/contributors/[handle]` | Builder identity, skills, accepted work, reviews, votes, credits, and evidence |
| `/proof` | Rules, membership snapshot, audit roots, contribution ledger, and reward manifest |

Maintainer setup moves to a protected `/admin` surface. Launch checks, API keys, repo setup, sync controls, and raw audit tools do not appear in the public workspace.

## 4. Core Collaboration Loop

```text
Discussion
    |
    v
daemon extracts a candidate work item
    |
    v
Builders confirm scope and reward credits
    |
    v
Vote if the risk policy requires one
    |
    v
Builders claim implementation, test, spec, or review roles
    |
    v
Pull request links the approved work manifest
    |
    v
CI and reviewer agent verify scope, rules, tests, and hook safety
    |
    v
Human maintainer merges
    |
    v
Contribution allocation enters a challenge window
    |
    v
Credits finalize and the public reward share updates
```

Important behavior:

- A chat message never becomes authorized work by itself.
- `daemon` creates a structured draft and links the source discussion.
- Builders can also submit a pull request directly. The system attaches it to existing work or asks the group to approve its scope before it can earn credits.
- A merged pull request does not automatically make its proposed credit split final.
- Corrections append new records. Existing evidence is never silently edited.

## 5. Participation Model

### Seats

- Public reading is unlimited.
- The pilot has a maximum of 50 active builder seats.
- A seat grants chat posting, task claiming, and voting rights.
- Merely holding a seat earns no credits and no fee share.
- People without seats can follow the build and join the public waitlist.
- Seats are reviewed at fixed membership epochs. Inactive seats return to the waitlist only under rules published before the epoch begins.

The project should open with a smaller cohort and expand as useful work becomes available. A recommended launch sequence is 25 seats, then 50 after the first reviewed PR loop. The cap remains 50.

### Eligibility

The pilot should offer two objective qualification paths:

1. Meet a published REP threshold in an approved builder category.
2. Pass a public hook safety challenge and link a GitHub identity.

Every builder also signs the project rules with a wallet and links one GitHub account. The system records the credential source, snapshot time or block, policy version, and verification result.

Manual invitations should not bypass the published qualification rules. If the community wants a sponsor path later, it must be added as a new policy version before an enrollment window opens.

### Oversubscription

If more qualified people apply than seats are available:

1. Enrollment closes at a published time or block.
2. A future public block hash supplies the seed.
3. A deterministic wallet ranking selects seats.
4. The same ranking creates the waitlist.
5. Anyone can reproduce the result from the published applicant snapshot and seed.

This avoids hidden maintainer preference and a bot-friendly first-come race.

If expected rewards become material, the seed should come from a verifiable randomness service. A future finalized block hash is an acceptable pilot fallback, but it is not the strongest possible source of unbiased randomness.

### Identity and abuse controls

- One active seat per linked wallet and GitHub identity.
- Wallet ownership uses a signed session, not an address returned by the browser alone.
- GitHub linking uses OAuth and records the stable GitHub account ID.
- Eligibility checks use a fixed snapshot for each membership epoch.
- Rate limits apply per membership, wallet, account, and network boundary.
- Removing a member requires a visible reason and policy reference.

Wallet and GitHub linking reduce duplicate accounts but do not prove one human. If the community requires strict one-person admission, it must add a verified-person credential to the published eligibility policy. The product must state this limitation instead of claiming Sybil resistance it does not have.

## 6. Decision Rules

The initial cohort gets one vote per active builder. REP qualifies entry but does not multiply voting power inside the pilot. Equal voting is easier to understand, harder to dominate, and simpler to verify.

6529 remains the public discussion transport. Signed application ballots become the canonical decision evidence unless the 6529 API can expose equivalent verifiable voter receipts. Every result is posted back to the 6529 discussion so builders see one public narrative without needing to understand the integration boundary.

Recommended policy:

| Change | Approval rule |
| --- | --- |
| Clarification or low-risk task | `daemon` draft plus confirmation from 2 builders |
| Medium-risk scope or implementation | 30% quorum and more than 50% yes |
| Hook logic, fees, bounds, or security behavior | 50% quorum and at least 67% yes |
| Membership, reward formula, or governance rule | 60% quorum and at least 75% yes, effective next epoch |
| Deployment | Separate deployment approval and human multisig execution |

Additional rules:

- `daemon` and the reviewer agent cannot vote.
- A contributor cannot be the only human reviewer of their own work.
- Reward rules cannot change retroactively.
- A vote stores its eligible-member snapshot, policy version, opening time, closing time, and signed ballots.
- Emergency operators may pause integrations, but cannot rewrite votes, credits, or audit history.

## 7. Contribution Credits

The current visible-activity point system must not control payouts. It rewards chat volume, votes, and generic events, which makes it easy to game and does not measure accepted project value.

The replacement is a task credit system.

### Credit budgets

Each approved work item receives a fixed integer credit budget before work begins. Default sizes keep estimates understandable:

| Size | Credits | Typical work |
| --- | ---: | --- |
| XS | 10 | Documentation fix, small test, reproduction |
| S | 25 | Focused implementation or review |
| M | 50 | Multi-file feature with tests |
| L | 100 | Major design or security-sensitive implementation |

An L task always requires a vote. Custom budgets require the same approval as the task scope.

### Role allocation

A work item can reserve credits for explicit roles:

- Specification or research
- Implementation
- Tests or verification
- Security or code review
- Project operations when the work produces a concrete accepted artifact

The split is visible before builders claim roles. A reasonable default for code work is 10% specification, 55% implementation, 20% tests, and 15% human review. The group may approve a different split before work starts.

### Final attribution

1. `daemon` proposes an allocation from linked commits, PR authorship, reviews, tests, accepted design records, and discussion evidence.
2. The deterministic reward engine checks that the proposed allocation equals the task budget and references valid evidence.
3. Contributors confirm or challenge their allocation.
4. The reviewer verifies that the credited artifacts were accepted.
5. A 72-hour challenge window closes.
6. Credits become final through an append-only finalization event.

Chat volume, voting, membership duration, and agent praise earn zero credits by default. An idea or design earns credits only when it is an approved role on an accepted work item.

### Reward formula

Every person with at least one finalized credit is a contributor and receives a share.

```text
contributor_share = contributor_final_credits / all_final_credits
```

The formula has no hidden quality multiplier and no AI-controlled adjustment. Any rounding uses integer arithmetic and a published deterministic remainder rule.

The public UI shows:

- Finalized credits
- Pending credits
- Percentage of the contributor pool
- Evidence behind every credit
- Open challenges
- The exact reward formula version

## 8. Contributor Fee Design

There are two separate economic decisions:

1. What fee the hook charges, if any.
2. What fixed percentage of the developer fee belongs to the contributor pool.

These values must be approved before enrollment and displayed as proposed until approval is recorded. The UI must not advertise dollar estimates or guaranteed income.

The reward mechanism should stay separate from swap accounting:

```text
AMM swap
   |
   v
Immutable hook fee logic
   |
   v
Immutable fee router
   |----------------------------|
   v                            v
Contributor reward vault       Other approved recipient
```

Recommended pilot boundary:

- The hook is non-upgradeable.
- Its fee destination and maximum fee are immutable constructor values.
- The contributor percentage is fixed before deployment.
- Final contributor shares are derived from the frozen build credit ledger.
- A separate, non-upgradeable pull-payment vault holds the fixed contributor shares.
- The vault supports at most the 50 pilot contributors.
- The vault exposes or emits the approved reward manifest hash so deployed shares can be checked against the public ledger.
- Future maintenance rewards use a separately approved allocation, not a rewrite of build credits.

The hook contract should not contain membership, voting, contribution scoring, or AI logic. Fee collection itself is security-sensitive custom accounting and needs dedicated invariant tests, economic review, and an external audit.

## 9. What Provably Fair Means

The system cannot mathematically prove that every subjective judgment was wise. It can prove that published rules were applied to public evidence without hidden edits. Fairness here means deterministic mechanics, visible discretion, conflicts disclosed, and a challenge path.

The proof chain is:

```text
Membership policy hash
  -> eligible member snapshot
  -> signed vote receipt
  -> approved work manifest
  -> Git commit and PR evidence
  -> reviewer attestation
  -> finalized credit allocation
  -> reward manifest
  -> deployed vault shares
```

### Required guarantees

1. Versioned rules: membership, voting, risk, credit, and reward rules have immutable versions.
2. Signed identity: wallet sessions and ballots use typed signed messages with nonce and expiry.
3. Append-only history: every event includes the prior event hash. Corrections append.
4. Public anchoring: periodic project roots are posted to the public discussion and committed to the project repo. The final reward root is also represented onchain.
5. Reproducible projections: a public verifier rebuilds membership, votes, work state, credits, and reward shares from events.
6. Evidence binding: PR records include repo, PR number, head commit SHA, approved work hash, rules hash, and review result hash.
7. Agent transparency: agent runs record model, prompt template version, input hash, output hash, and policy decision.
8. No AI authority: agent output is a proposal until a deterministic policy or human approval accepts it.
9. Challenge window: contribution attribution and reward manifests cannot finalize immediately.
10. Conflict disclosure: self-review and self-allocation are visible and cannot be the only approval.

### Public verification bundle

`/proof` and a CLI verifier should expose:

- Current and historical rules
- Membership applications, eligibility receipts, cohort seed, seat ranking, and roster
- Work manifests and decision receipts
- PR and reviewer attestations
- Credit allocations and challenges
- Reward manifest and contributor shares
- Event chain head, periodic roots, and anchors
- Contract addresses and constructor arguments after deployment

## 10. Agent Responsibilities

### `daemon`, orchestration agent

`daemon` is a 6529 account and a visible project participant. It may:

- Read and summarize project discussion
- Extract candidate topics, decisions, work items, PR links, and contribution evidence
- Recommend risk, task size, role split, and next action
- Keep the project brief, build board, changelog, and contributor evidence current
- Post approved summaries and decision requests through its configured account

It may not:

- Grant seats
- Cast votes
- Finalize reward credits
- Approve its own proposed allocation
- Merge PRs
- Deploy contracts
- Change fee recipients
- Move funds

### Reviewer agent

The reviewer is a separate service identity and credential boundary. It runs two layers:

1. Deterministic checks for manifest binding, policy version, changed paths, tests, fee bounds, hook permissions, upgradeability, deployment actions, and contribution budget integrity.
2. An independent model review for scope drift, security concerns, missing tests, and plain-language explanation.

The reviewer posts a signed GitHub check and project attestation. It can block the required check but cannot merge.

### Human authority

Humans remain responsible for:

- Membership and rule votes
- High-risk scope approval
- Independent code review
- Merge and deployment approval
- Audit acceptance
- Fee and reward approval
- Dispute resolution

## 11. Target System Architecture

```text
                                  +-----------------------+
                                  | 6529 discussion API   |
                                  +-----------+-----------+
                                              |
+---------------+      +----------------------+------------------+
| Browser       | ---> | Next.js application and public API      |
| Wallet        |      | Server-rendered workspace, client islands|
| GitHub OAuth  |      +----------------------+------------------+
+---------------+                             |
                                                v
                                  +---------------------------+
                                  | Application services      |
                                  | Membership, work, votes,  |
                                  | review, credits, proof     |
                                  +-------------+-------------+
                                                |
                     +--------------------------+--------------------------+
                     |                          |                          |
                     v                          v                          v
             +---------------+          +---------------+          +---------------+
             | PostgreSQL    |          | Job worker    |          | GitHub App    |
             | Events and    |          | daemon and    |          | Webhooks and  |
             | projections   |          | reviewer jobs |          | required check|
             +-------+-------+          +-------+-------+          +-------+-------+
                     |                          |                          |
                     +--------------------------+--------------------------+
                                                |
                                                v
                                  +---------------------------+
                                  | Public proof artifacts    |
                                  | Hash roots and manifests  |
                                  +-------------+-------------+
                                                |
                                                v
                                  +---------------------------+
                                  | Immutable hook, router,   |
                                  | and contributor vault     |
                                  +---------------------------+
```

### Application boundaries

- Next.js route handlers provide the browser-facing API and webhook entry points.
- Long-running sync, agent, GitHub, and proof jobs run in a separate worker process, never inside a page request.
- PostgreSQL is the production source of truth.
- The event log is append-only. Read-optimized projections drive the UI.
- An outbox table guarantees that committed events produce jobs and external posts without dual-write loss.
- Integration adapters contain 6529, GitHub, model provider, and chain-specific behavior.
- Domain services do not import UI or vendor API types.

### Next.js shape

The current 4,434-line client component should be replaced with server-rendered route shells and small client islands:

- Wallet and GitHub connection
- Vote controls
- Task claim controls
- Live discussion panel
- Contribution challenge controls

Project, work, member, PR, and proof reads should render on the server. Mutations require server-side authentication and authorization even when initiated from a client component.

## 12. Data Model

The current single `CommandWave` aggregate is not sufficient for 50 members, multiple work items, identity proofs, disputes, or reward finalization.

Target records:

| Area | Records |
| --- | --- |
| Project | `projects`, `project_integrations`, `project_milestones` |
| Rules | `policy_versions`, `policy_approvals` |
| Identity | `users`, `wallet_links`, `github_links`, `sessions` |
| Membership | `membership_epochs`, `applications`, `eligibility_receipts`, `memberships` |
| Discussion | `discussion_messages`, `discussion_threads`, `sync_cursors` |
| Work | `work_items`, `work_roles`, `work_claims`, `work_manifests` |
| Decisions | `decisions`, `eligible_voter_snapshots`, `ballots`, `decision_receipts` |
| GitHub | `pull_requests`, `pull_request_revisions`, `github_events` |
| Review | `review_runs`, `review_checks`, `review_attestations` |
| Contribution | `contribution_claims`, `credit_allocations`, `credit_challenges`, `credit_finalizations` |
| Rewards | `reward_policies`, `reward_manifests`, `reward_entries`, `payout_receipts` |
| Agents | `agent_runs`, `agent_outputs`, `agent_approvals` |
| Audit | `project_events`, `event_roots`, `external_anchors`, `outbox_jobs` |

All consequential tables reference `project_id`, `policy_version`, and public evidence where applicable. External records retain source IDs and immutable payload hashes for deduplication.

## 13. Current Work: Keep, Refactor, Retire

### Keep as foundations

- 6529 client, normalization, context pagination, redaction, and chat posting adapter
- GitHub repo parsing, bounded API adapter, PR evidence binding, and required-check foundation
- Hook contract, diff, parameter, and tool safety policies
- Hashing, run manifest, Guardian attestation, and proof replay concepts
- Request validation, response limits, timeouts, and rate limiting
- Postgres production direction
- `daemon` as the orchestration identity
- Immutable hook default and bounded-parameter rule

### Refactor behind new domain services

- Proposals become work items with role and credit budgets
- Polls become signed decisions with eligible-member snapshots
- Executions become versioned agent and GitHub runs
- Reviews become independent attestations bound to exact commit SHAs
- Contribution reports become evidence projections, not scores
- The ledger becomes a real append-only event chain
- Project summaries become projections of accepted events
- The Postgres repository becomes event storage plus projections, not one mutable aggregate

### Remove from the public product

- Launch checklist and readiness controls
- Maintainer setup, API key inputs, and raw environment guidance
- Copyable Codex, launch, decision, review, and fee-plan packets
- Advanced proposal fields such as command kinds and budget inputs
- Repeated workflow status blocks and duplicate summary copy
- Generic project chooser and active-project inventory
- Public use of `wave`, `gate`, `command`, `orchestration`, and `ledger` terminology
- Raw activity points, chat post counts, and votes as payout signals
- Demo identities, redaction test messages, and fake project activity

### Park for later

- Multi-project marketplace UI
- Arbitrary external agent endpoints
- Automatic deployment
- Automatic merge
- Mutable or upgradeable hook logic
- Retroactive reward formula changes

## 14. Delivery Plan

### Phase 0: Freeze the product contract

Decide and publish:

- Hook purpose and immutable behavior
- Active seat cap and eligibility paths
- Voting thresholds
- Contributor pool percentage
- Credit policy and challenge window
- Selected GitHub repo
- Human maintainer and dispute roles

Exit condition: one signed pilot rules document with no placeholder authority claims.

### Phase 1: Replace the public experience

Current progress: the server-rendered workspace and initial `/work/[id]` detail route are implemented. Work claims,
assigned contributors, live credits, and contributor profile routes remain unavailable until identity and admission are real.

- Build the new workspace from a small typed `ProjectWorkspaceView`
- Move admin and launch controls to `/admin`
- Add work, chat, open vote, PR, contributor, reward, and proof sections
- Add work detail and contributor profile routes
- Purge public demo noise
- Verify desktop and mobile with realistic fixture states

Exit condition: a new developer can explain the project, find available work, understand the reward, and reach chat in under 30 seconds.

### Phase 2: Identity and fair admission

- Signed wallet sessions
- GitHub OAuth linking
- REP and challenge eligibility adapters
- Membership epochs, deterministic seat selection, and waitlist
- Rule acceptance and abuse controls

Exit condition: every active builder has a reproducible eligibility receipt and one seat.

### Phase 3: Discussion and `daemon`

- Durable discussion sync with cursors and deduplication
- Topic and task extraction into drafts
- Builder confirmation flow
- Summary and changelog projections
- Approved posting through the `daemon` account

Exit condition: normal group discussion reliably produces a traceable candidate work item without hidden state changes.

### Phase 4: Work, decisions, and GitHub

- Work roles and task claims
- Signed decisions with fixed voter snapshots
- GitHub App installation and webhooks
- PR manifest binding to work, rules, and decision
- Reviewer agent as a required check
- Human merge boundary

Exit condition: one real task moves from discussion to a reviewed, merged PR with complete public evidence.

### Phase 5: Contribution fairness

- Task credit budgets and role allocations
- Evidence-based attribution proposals
- Contributor confirmation and challenge flow
- Final credit ledger and deterministic reward shares
- Public proof page and verifier CLI

Exit condition: every reward share can be recomputed from accepted work and public evidence.

### Phase 6: Fee contracts and launch

- Finalize hook fee economics
- Implement and audit hook fee accounting
- Implement and audit the immutable fee router and contributor vault
- Verify constructor values against the reward manifest
- Run fork, invariant, fuzz, and end-to-end tests
- Complete external audit and deployment rehearsal

Exit condition: the deployed contracts, project proof, and contributor shares match the approved manifests exactly.

## 15. Success Measures

- A new builder understands the project and reward in less than 30 seconds.
- A qualified builder reaches an available task or chat in less than 3 minutes.
- Every task has scope, risk, credit budget, and evidence before finalization.
- Every merged PR is bound to approved work, a commit SHA, and reviewer proof.
- Every contributor fee share is reproducible with no AI-only input.
- Project summaries update within 2 minutes of accepted discussion or GitHub events.
- Public state contains no admin controls, launch diagnostics, fake users, or test messages.
- No agent can vote, merge, deploy, change rules, finalize credits, or move funds.

## 16. Decisions Needed Before Development Resumes

Recommended defaults are included so implementation can proceed after a short review:

| Decision | Recommended starting point |
| --- | --- |
| Seat cap | 50 active seats, opened as 25 then expanded to 50 |
| Entry | REP threshold or public hook safety challenge, plus linked GitHub and signed wallet |
| Oversubscription | Deterministic lottery using a published future block hash |
| Voting | One active builder, one vote |
| High-risk approval | 50% quorum and 67% yes |
| Rule or reward changes | 60% quorum and 75% yes, effective next epoch |
| Credits | Fixed task budgets, role split published before work |
| Challenge window | 72 hours |
| Contributor pool | Fixed percentage of the developer fee, approved before enrollment |
| Payout structure | Immutable fee router and fixed-share contributor vault deployed after credits freeze |
| Hook upgrades | None |
| Parameter changes | Named parameters only, with immutable bounds and explicit governance |

The contributor pool percentage, hook fee amount, eligibility REP category and threshold, selected repo, and human dispute authority require explicit pilot decisions. Everything else can begin with the recommended defaults.

## 17. Critical Risks Before Public Claims

- The selected hook behavior and smart contract repo are still placeholders.
- The live REP category, snapshot API, and eligibility receipt format are not verified.
- The current wallet control does not authenticate ownership or create a server session.
- The current contribution score is informational and must never be presented as payout authority.
- The current reviewer identity is a placeholder and the required GitHub App boundary is not implemented.
- The current Postgres model persists a mutable aggregate and is not yet a tamper-evident event store.
- Hook fee accounting, fee routing, and the contributor vault require their own threat model, tests, and external audit.
- Perpetual fee sharing may create legal, tax, and disclosure obligations. Counsel must review the terms before the site promises compensation.
- Public chat and agent inputs are adversarial. Agent parsing must be isolated from authorization and secrets.

## 18. Technical Basis

- Uniswap v4 hook fees are custom accounting implemented by the hook and are separate from pool and protocol fees: <https://developers.uniswap.org/docs/protocols/v4/guides/custom-accounting>
- Hook permissions are encoded in the deployed address and therefore must be verified in build and deployment evidence: <https://github.com/Uniswap/v4-core/blob/main/src/libraries/Hooks.sol>
- Uniswap's hook security framework treats custom accounting, fee changes, autonomous parameters, upgradeability, and token custody as explicit risk triggers: <https://developers.uniswap.org/docs/protocols/v4/security>
- OpenZeppelin Contracts 5 provides EIP-712, signature checking, and Merkle proof primitives, but removed the old `PaymentSplitter` contract. The reward vault must use a current, reviewed design rather than copying an outdated helper: <https://docs.openzeppelin.com/contracts/5.x/api/utils/cryptography>
