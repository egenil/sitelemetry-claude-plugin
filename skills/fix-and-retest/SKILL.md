---
name: fix-and-retest
description: Turn Sitelemetry audit findings into concrete fixes for the user's stack (nginx, Apache, Cloudflare, Vercel or Next.js, Netlify, WordPress), apply them with the user's approval or hand them over ready to use, then re-run the same audit on the same target and report honestly what is resolved, still open or not measured. Use after an audit when the user asks how to fix the findings, wants the changes made, or wants to confirm that a fix worked.
---

# Fix and re-test

## Ground rules

- Reply in the user's language. For the audit tools, set `lang` as described in the `website-audit` skill.
- Only change and re-test sites the user owns or is authorized to test.
- Base every fix on a returned finding: its evidence, impact and `remediation`. If you suggest something the audit did not report, label it as an extra suggestion.
- Never say a fix worked until a re-test has measured it.

## 1. Start from real findings

Use the findings of an audit from this conversation. If there are none, run one first with the `website-audit` skill. For every finding, note its `findingKey`, severity, title and `location`, and note the exact tool, `target` and options of that run. The re-test must repeat them.

## 2. Identify the stack

Ask the user, or infer it from the project when you can read its files.

| Signal | Stack |
|---|---|
| `nginx.conf`, `sites-available/`, `conf.d/` | nginx |
| `.htaccess`, `httpd.conf`, `apache2.conf` | Apache |
| Site proxied through Cloudflare, rules in the Cloudflare dashboard | Cloudflare |
| `vercel.json`, `next.config.js`, `next.config.mjs`, `next.config.ts` | Vercel or Next.js |
| `netlify.toml`, `_headers`, `_redirects` | Netlify |
| `wp-config.php`, `wp-content/` | WordPress |

When a CDN or proxy sits in front of the origin, it can add, replace or cache headers. Decide which layer owns each header and set it in one place.

## 3. Write the fixes

Work from critical to info. For each finding give:

- what changes and where (file path or dashboard location);
- the change for the user's stack, adapted to the site;
- the risk and how to roll it back;
- how to check it before re-testing, for example `curl -sI https://example.com/` for response headers.

Starting points for common findings (security headers, HTTPS redirect, HSTS, server version disclosure, caching, compression and email DNS records) are in [stack snippets](references/stack-snippets.md). Adapt them to the site; do not paste them blindly.

Safety rules:

- **Content-Security-Policy**: start with `Content-Security-Policy-Report-Only`, check the browser console for violations, then enforce. A strict policy copied without testing breaks sites.
- **HSTS**: start with a short `max-age`. Add `includeSubDomains` only when every subdomain serves HTTPS, and `preload` only when the owner decides to submit the domain to browser preload lists.
- **DNS and email records** (SPF, DKIM, DMARC, CAA): the user changes these at their DNS provider. Start DMARC at `p=none` with reports before moving to `quarantine` or `reject`.
- Never ask for or handle passwords, API tokens or hosting and DNS credentials.

## 4. Apply or hand over

- With access to the project files (for example in Claude Code): show the diff and apply it only after the user agrees. Do not deploy, restart services or change production settings on your own.
- Without file access: give complete, copy-ready changes and the order to apply them in.
- Ask the user to tell you when the changes are live. If the site uses a CDN or page cache, ask them to purge it so the re-test sees the new responses.

## 5. Re-test the same way

- Tell the user that the re-test is a new audit run and uses the account's audit allowance.
- Call the same tool with the same `target` spelling and the same options as the first run (`profile`, `modules`, `maxPages`, `strategy` and so on). A different scope makes the comparison invalid.
- Handle `running`, `action_required` and errors as in the `website-audit` skill: poll with `pollArguments` unchanged and never start a duplicate audit.

## 6. Report before and after

Match findings across the two runs by `findingKey`.

| Result | Rule |
|---|---|
| Resolved | In the first run, absent from the re-test, and the check was measured in the re-test |
| Still open | Present in both runs |
| New | Present only in the re-test |
| Not measured | The check was unmeasured, unavailable or partial in the re-test (see `coverageStatus`, `auditDetails` and `failedPillars`). Do not count it as resolved. |

Show a table with the finding, severity, before, after and result. Report a score change only when both runs have a non-null score, and mention that scores can move for other reasons too, such as lab variance in performance measurements. If `findingsTruncated` was true in either run, say that the comparison covers only the returned findings.

End with what is still open and the next step for each item.
