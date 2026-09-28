---
name: website-audit
description: Run a Sitelemetry audit on a website the user owns or is authorized to test, wait correctly for long-running audits, and present the findings ranked by severity with the top fixes. Use when the user asks to audit, scan, check or score their own site for security, technical SEO, AI visibility, analytics and tracking, accessibility (WCAG) or performance (Core Web Vitals), or asks for an overall site health check.
---

# Website audit

Use the Sitelemetry audit tools to measure a website and explain what to fix first.

## Ground rules

- Reply in the user's language. Set `lang` to the user's language when it is one of `en`, `tr`, `es`, `de`, `fr`, `pt`, `it`, `ja` or `zh`; otherwise leave `lang` out and translate your summary yourself. `lang` changes the wording of the result, not what is measured.
- Only audit sites the user owns or is authorized to test. If that is not clear, ask before calling any tool. Do not audit competitors or other third-party sites.
- The audits run from Sitelemetry's servers and do not change the site. Starting an audit uses the connected account's audit allowance (it is released again if the audit fails). Polling a running audit and `action_required` results use none.
- Security and full audits send test requests to the site. Depending on the account, these can include active, non-destructive probes such as port and injection checks, which may show up in the site's server logs or firewall alerts. Mention this when the user has not audited the site before.
- Never invent scores, grades, findings, measurements or report links.

## 1. Get the exact target

If the user started this skill with arguments, the first one is the target URL and an optional second word names the area: `security` (`audit_security`), `seo` (`audit_seo`), `ai` (`audit_ai_visibility`), `integrations` (`audit_integrations`), `accessibility` (`audit_accessibility`), `performance` (`audit_performance`) or `full` (`audit_full`). Confirm ownership or authorization as usual before calling. If only a URL was given and the conversation does not say which area, ask, or use `audit_full` if the user wants everything.

`target` must be an absolute `https://` URL spelled exactly as it is verified in the user's Sitelemetry workspace.

- Scheme, `www` or no `www`, port, path, path casing and query all count. Only hostname case, an explicit `:443` and a trailing slash are ignored.
- Only public hosts are accepted: no localhost, private addresses, credentials in the URL or `#fragment`.
- If the user gives a bare domain such as `example.com`, confirm the exact URL (for example `https://example.com/` or `https://www.example.com/`) before calling.
- Keep the same spelling on every retry and every poll.

## 2. Pick the narrowest tool

| The user asks about | Tool | Options worth knowing |
|---|---|---|
| Security headers, TLS, DNS, email authentication, exposed files, ports | `audit_security` | `profile`, `modules`, `ports`, only when the user asks |
| Crawlability, indexation, metadata, structured data, internal links | `audit_seo` | `maxPages` (1-30), `includeSearchConsole`, `searchConsoleDays` (7, 28 or 90) |
| AI visibility, GEO, AEO, AI crawler policy | `audit_ai_visibility` | `brand`, `prompts`, `competitors`, `maxPages`, `promptLimit` |
| Analytics, tags, marketing pixels, consent, site verification tags | `audit_integrations` | none |
| Accessibility, WCAG | `audit_accessibility` | none |
| Speed, PageSpeed, Core Web Vitals | `audit_performance` | `strategy`: `mobile` (default) or `desktop` |
| Everything, overall health, one combined score | `audit_full` | any of the above |

- Leave options out unless the user asked for them; defaults follow the connected account's access. Unknown options are rejected, so send only options the chosen tool lists.
- `profile` and `modules` exist only on `audit_security` and `audit_full`. Leaving both out requests every security module included in the connected account.
- `includeSearchConsole` uses the Google connection already set up in the workspace; missing access does not stop the audit. When it is left out, `audit_seo` and `audit_full` (when it includes SEO) still add Search Console data if the workspace has that connection. Search Console data is metered separately from the audit allowance. Set `includeSearchConsole` to `false` if the user does not want it.
- `audit_accessibility` is a static WCAG 2.2 check, not a full manual accessibility review. Say so when it matters.
- Run one audit at a time. Do not start another audit while one is running.

## 3. Handle the result status

Read `status` first. Every reason and error is described in [result handling](references/result-handling.md).

- `completed` or `partial`: present the result (section 4). `partial` means some requested measurements were unavailable.
- `running`: the audit is still in progress. Tell the user in one line, wait about `retryAfterMs`, then call the **same tool** with `pollArguments` exactly as returned. Do not add scan options. Repeat until the status is final. Polling resumes the same audit; it does not start a new one or use more allowance. Full and security audits can take several minutes. Never present `running` as a result and never start a replacement audit.
- `action_required`: no audit ran and no allowance was used. Explain the `reason` and pass on `nextAction.url` exactly as returned. Do not retry until the prerequisite has changed. For verification reasons, follow the `domain-verification` skill.
- Error (`isError` with text starting `Error:`): relay the message plainly and suggest the correction it points to, such as the exact verified target spelling or a narrower scope.

## 4. Present the findings

1. **Summary line**: target, audit type, status, and `score` and `grade` (or `blended` for `audit_full`) only when they are not null. A null score means the area was not measured; it is not zero.
2. **Coverage**: what was not measured and why, from `coverageStatus`, `executionComplete`, `auditDetails` and, for `audit_full`, `failedPillars` and areas outside the connected account's access. A completed run does not prove every check was measured, and unmeasured checks are not passes.
3. **Findings by severity**: critical, high, medium, low, then info. For each give the title, `location` if present, the evidence, the impact and the fix (`remediation`). For `audit_full`, also name the `pillar`. If `findingsTruncated` is true, say that `returnedFindings` of `total` findings were returned.
4. **Top fixes**: the three to five changes that remove the most severe risk first, in order, each tied to the findings it resolves.
5. **Passing checks**: one line with `passingChecks` or the main passing items.

Keep each finding's `findingKey`, the tool and the exact arguments you used, so a later re-test can be compared like for like. Offer the `fix-and-retest` skill as the next step.

Results normally come without a report link. If the result text includes one, you may pass it on; it opens in the user's signed-in Sitelemetry workspace.

## Access and limit messages

When a result says that an audit, profile or module is not included in the connected account, or that the audit allowance is used up, repeat that fact neutrally together with the link the tool returned. Do not add sales wording, plan recommendations or prices. If the result offers a security-only alternative for the same target, you may mention it, and say that it does not complete the audit that was requested.
