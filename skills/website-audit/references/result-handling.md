# Result handling

Every Sitelemetry audit tool returns one of four shapes, keyed on `status`, or an error.

## completed and partial

The audit finished. `partial` means some requested measurements were unavailable, for example a failed area, an unavailable metric, areas outside the connected account's access, or security checks that still need ownership verification.

- Single-area tools return `score` (0-100 or null), `grade` (or null), `counts` by severity, `total`, `returnedFindings`, `findingsTruncated`, `passingChecks`, `findings`, `passingFindings`, `auditDetails`, `executionComplete` and `coverageStatus` (`measured`, `partial`, `unavailable` or `not_applicable`).
- `audit_full` returns `blended` (a weighted score across the measured areas, or null) and `pillars` (score and finding count per area) instead of `score` and `grade`, plus `complete` and `failedPillars` (`pillar` and `error`).
- Each finding has `findingKey` (stable across runs), `severity`, `title`, `evidence`, `impact`, `remediation` and `category`, and may have `location`. On `audit_full` it also has `pillar`.
- `auditDetails` describes scope, check states and evidence. Unmeasured checks there are not passes.

Present what was measured and name what was not. Do not fill gaps with estimates.

## running

The audit is in progress. The result has `jobId`, `nextAction: "poll_same_tool"`, `pollArguments` (`target` and `jobId`) and `retryAfterMs`.

- Wait about `retryAfterMs`, then call the same tool with `pollArguments` exactly as returned. Do not add, remove or change fields.
- Each poll may wait on the server for a short while before it answers. Keep polling until the status is final.
- Polling never starts a second audit and never uses more allowance.
- An audit that does not finish within 30 minutes fails and its reserved allowance is released. A finished result stays available to poll for about an hour.
- If the result says the audit is queued, capacity is in use; keep polling.

## action_required: prerequisites

No audit ran and no allowance was used (`auditExecuted: false`, `usageConsumed: false`). Explain the reason, give the user `nextAction.url` exactly as returned, and do not retry until the prerequisite has changed.

| `reason` | `nextAction.type` | Meaning and next step |
|---|---|---|
| `entitlement_required` | `review_workspace_access` | The requested audit, security profile or module is not included in the connected account. `entitlement` names the current access and the access it needs. State this neutrally. If the user wants, run an audit, profile or module that is included instead. |
| `target_verification_required` | `verify_target` | The exact target has no ownership proof in the workspace. Use the `domain-verification` skill. |
| `target_reverification_required` | `renew_verification` | The ownership proof has expired. Use the `domain-verification` skill. |
| `verified_target_required` | `review_verified_target` | The target spelling differs from the verified one. `registeredTarget` shows the verified spelling. Show both and ask the user which one to audit before using it. |
| `verification_scope_required` | `verify_host` | A URL-prefix proof cannot authorize host-wide security checks. Use the `domain-verification` skill. |
| `usage_limit_reached` | `wait_for_usage_reset` | The current audit allowance is used up. Retry after it resets. |
| `authorization_consent_required` | `review_authorization` | The account must accept the current audit authorization terms before audits can run. |

The result text may name the access level an item needs and link to the account's access and usage page. Relay that as a fact. Do not add sales wording or prices.

On an account with security-only access, the result for a non-security audit may describe a security-only alternative for the same target. It runs the public security checks and does not complete the requested audit. Offer it only as an option.

## action_required: audit job

These have no `nextAction`. No audit ran and no allowance was used.

| `reason` | Next step |
|---|---|
| `audit_job_busy` | Audit capacity is in use, or the audit could not start within the queue window. Suggest trying again later. |
| `audit_job_unavailable` | The audit was not found or its result expired. Start a new audit only if the user wants one; it is a new run. |
| `audit_job_argument_mismatch` | The poll did not match the original audit. Poll again with `pollArguments` exactly as returned. |
| `audit_job_invalid_arguments` | The arguments were not accepted. Correct them before calling again. |

## Errors

Errors come back with `isError` and text starting `Error:`.

| Message (in short) | What to do |
|---|---|
| Exact verified HTTPS target spelling required, or a public HTTPS target required | Ask for the exact `https://` URL verified in the workspace. |
| A parameter is not supported by the tool, or an invalid `lang`, `maxPages` or `strategy` | Drop or correct that argument. |
| The result is too large for the transport | Request a narrower scope: a single area, fewer pages or fewer modules. |
| The audit could not be completed, with a reference | Share the reference. Suggest trying again later or contacting https://sitelemetry.com/support. |
| The audit was interrupted, timed out or failed | The reserved allowance was released. Start a new audit only if the user wants one. |
| The verified target has no project and the workspace has reached its project limit | Relay it; the user can manage projects in the workspace. |
| Remote MCP is unavailable for this account | Relay it and point to https://sitelemetry.com/support. |

If the connection itself is refused as unauthorized, the user needs to connect or reconnect the Sitelemetry connector and sign in. If requests are rate limited, slow down and try again shortly.

## Security checks on accounts with security-only access

Without current ownership proof, a default `audit_security` call (no `profile` or `modules`) on such an account, or a default `audit_full`, which on such an account runs security only, runs seven public checks: DNS, email DNS, RDAP, TLS, HTTP headers, MITM posture and technology fingerprint. It returns `partial` and names the three further checks that verification adds: HTTP methods, exposed files and paths, and API exposure. Present the measured results and the verification step. Do not claim the other checks ran. An explicit `modules` list runs without verification only if every module is one of those seven public checks (`dns`, `dns-email`, `rdap`, `tls`, `http-headers`, `mitm-posture`, `tech-fingerprint`). Any other module needs current verification, and host-wide modules need host proof. On other accounts, every audit needs current verification, including the public checks.
