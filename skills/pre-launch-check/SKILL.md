---
name: pre-launch-check
description: Run a pre-release check of a website the user owns with Sitelemetry security, performance and accessibility audits, plus technical SEO when the site is meant to be indexed, then summarise launch blockers versus warnings using only measured results. Use when the user is about to launch, deploy, go live, migrate or redesign a site and wants to know what must be fixed first.
---

# Pre-launch check

## Ground rules

- Reply in the user's language. For the audit tools, set `lang` as described in the `website-audit` skill.
- Only check sites the user owns or is authorized to test. If that is not clear, ask first.
- The security audit sends test requests to the site. Depending on the account, these can include active, non-destructive probes such as port and injection checks, which may show up in server logs or firewall alerts. Tell the user before running it on a site that has not been audited before.
- Use only the scores, severities and findings the tools return. Never invent a score, a pass or a measurement.

## 1. Confirm the scope

- **Target**: the exact public `https://` URL, spelled as verified in the user's Sitelemetry workspace. A staging site must be reachable over public HTTPS; localhost, private addresses and hosts behind a VPN cannot be audited. A staging hostname is a separate target and needs its own verification for the checks that require it.
- **Indexing**: ask whether the site should be indexed by search engines at launch. Include `audit_seo` only if it should. On a staging site that is deliberately `noindex`, indexation findings are expected; say so rather than listing them as blockers.
- **Runs**: tell the user which audits you will run and that each one is a separate audit that uses the account's audit allowance. If they prefer a single run, `audit_full` covers every audit area included in the connected account in one call.

## 2. Run the audits one at a time

Default order:

1. `audit_security`
2. `audit_performance` with `strategy: "mobile"` (add a `desktop` run only if the user asks)
3. `audit_accessibility`
4. `audit_seo`, if indexing is in scope

For each audit:

- Wait for the final status before starting the next. On `running`, wait about `retryAfterMs` and call the same tool with `pollArguments` exactly as returned. Never start a duplicate audit.
- Keep the same `target` spelling on every call.
- On `action_required`, no audit ran and no allowance was used.
  - Access or allowance reasons: note it, relay the next step neutrally with the returned link, and continue with the other audits.
  - `target_verification_required` whose text says that the domain was not found or does not resolve in DNS: stop and ask the user to check the spelling of the target, because no audit can run on a hostname that does not exist.
  - Other `target_verification_required`, `target_reverification_required` or `verified_target_required` results: record that audit as not measured, continue with the other audits, and follow the `domain-verification` skill afterwards.
  - `verification_scope_required`: only the host-wide security checks need broader proof. Record security as not measured, continue with the other audits, and point to the `domain-verification` skill for domain, hostname or root URL proof.
- A `partial` security result that lists checks needing ownership verification still counts as run: report the public checks it measured, list the remaining checks as not measured, and point to the `domain-verification` skill.
- On an error, note it and continue with the next audit.

## 3. Classify the results

Keep the severities the tools assign; do not re-grade them.

- **Blockers**: critical and high findings.
- **Warnings**: medium findings.
- **Notes**: low and info findings.
- **Not measured**: checks, areas or metrics that the results mark as unavailable, partial, failed, outside the connected account's access or needing ownership verification, and any audit that did not run. These are unknowns, not passes.

When the same issue appears in two audits, list it once and name both.

## 4. Report

Use this structure:

```text
Pre-launch check for https://example.com/ (date)
Audits: security completed, performance (mobile) partial, accessibility completed, SEO not run (site not indexed yet)

Blockers (2)
1. [security, high] <title> at <location>: <fix>
2. [accessibility, high] <title> at <location>: <fix>

Warnings (3)
...

Notes (4): one line each, or a count if there are many

Not measured
- performance: <what was unavailable, from the result>

Scores returned: security <score> (<grade>), accessibility <score>
```

Only list scores that the tools returned as numbers. A null score means the area was not measured.

Verdict:

- With blockers: "Not ready yet: fix these N blockers first", followed by the blockers in order of severity.
- Without blockers: "No blockers were found in the measured checks", followed by the Not measured list. Never state that the site is secure, fully accessible or compliant; the audits cover specific automated checks.

Offer the `fix-and-retest` skill for the blockers and, after fixes, a re-run of the same audits with the same arguments.
