---
name: domain-verification
description: Explain and help complete Sitelemetry ownership verification when an audit returns action_required because the target is not verified, the proof has expired, the target spelling differs from the verified one, or the proof does not cover host-wide checks. Covers the DNS TXT record, HTTP file and Google Search Console methods, then retries the same audit. Use when an audit asks for verification or the user asks how to verify their site.
---

# Domain verification

## Ground rules

- Reply in the user's language.
- Verification shows that the user controls the site. Help only with sites the user owns or administers, and never suggest ways around verification.
- Verification is completed in the user's Sitelemetry web workspace, not through the audit tools. Give the user the `nextAction.url` the tool returned; do not guess other account URLs.
- When a tool asks for verification, no audit ran and no audit allowance was used.
- Never ask for passwords, API tokens or DNS, hosting or Google account credentials. The user makes the change, or you edit project files with their approval.

## 1. Read the reason

| `reason` | `nextAction.type` | Meaning | What to do |
|---|---|---|---|
| `target_verification_required` | `verify_target` | No current proof for this exact target | Choose a method (section 2) |
| `target_reverification_required` | `renew_verification` | The proof expired: it was last checked more than 30 days ago | Keep the DNS record or file in place and run the check again in the workspace, or sync Google Search Console again |
| `verified_target_required` | `review_verified_target` | The target spelling differs from the verified one; `registeredTarget` shows the verified spelling | Show both spellings and ask the user which one to audit. Use `registeredTarget` only after they confirm, or verify the other spelling |
| `verification_scope_required` | `verify_host` | A URL-prefix proof cannot authorize host-wide security checks | Verify the domain, the hostname or the root URL, or run only checks that the verified prefix covers |

When a `target_verification_required` result says that the domain was not found or does not resolve in DNS, verification cannot help yet because the hostname does not exist. Check the spelling of the target with the user. If the domain is new, wait until its DNS records are published, then retry with the exact target.

Targets are matched exactly. `https://example.com/` and `https://www.example.com/` are different targets, and so are different ports and paths. Verify the spelling the user wants to audit.

## 2. Verification methods

The workspace issues a token that starts with `sitelemetry-` and shows the exact record name and file URL for the target. Always use the values it shows.

### DNS TXT record

- Name: `_sitelemetry-challenge.<hostname>`, for example `_sitelemetry-challenge.example.com`, or `_sitelemetry-challenge.www.example.com` for the `www` host.
- Value: the token, exactly.
- Many DNS panels add the domain automatically; then enter only `_sitelemetry-challenge` (or `_sitelemetry-challenge.www`) in the name field.
- New records can take from minutes to hours to become visible, depending on TTL. Check with `nslookup -type=TXT _sitelemetry-challenge.example.com` or `dig +short TXT _sitelemetry-challenge.example.com`.

### HTTP file

- URL: `https://<host>/.well-known/sitelemetry-verification.txt`
- Content: only the token, as plain text. Surrounding whitespace is ignored. The file must be smaller than 2 KB.
- The URL must answer with a success status over HTTPS with a valid certificate. A redirect to another host, protocol or port fails the check.
- Where the file usually goes:
  - Next.js, Vercel and most static site generators: `public/.well-known/sitelemetry-verification.txt`
  - Netlify: `.well-known/sitelemetry-verification.txt` inside the publish directory
  - nginx or Apache: the `.well-known` folder in the document root. Make sure rules that hide dot-folders do not block it; in nginx, a `location ^~ /.well-known/ { }` block takes precedence over regex rules that deny dot-folders.
  - WordPress: the `.well-known` folder in the site's root directory, uploaded with the host's file manager or SFTP
- Check it with `curl -s https://example.com/.well-known/sitelemetry-verification.txt`; the output must be the token.

### Google Search Console

Available when the workspace offers a Google connection and the user is a verified owner of the property.

- A Domain property (`sc-domain:example.com`) covers the whole host, including host-wide checks.
- A URL-prefix property covers only that prefix. It authorizes host-wide checks only when it is the root URL of the hostname, such as `https://example.com/`.

## 3. What verification covers

- Without current ownership proof, an audit runs only public checks:
  - the SEO, AI visibility, analytics and tracking, accessibility and performance audits included in the account's access;
  - the public security checks included in the account's access: DNS, email DNS, RDAP, TLS, HTTP headers, MITM posture and technology fingerprint, plus transport delivery where it is included.
- A security or full audit without a `modules` list runs those public security checks on a target without proof and returns `partial`. `auditDetails.scope.verificationRequiredModules` lists the remaining included security checks that verification adds. On an account with security-only access, a full audit runs security only, and verification adds HTTP methods, exposed files and paths, and API exposure.
- An explicit `modules` list runs without verification only if every module is a public check (`dns`, `dns-email`, `rdap`, `tls`, `http-headers`, `mitm-posture`, `tech-fingerprint`, `transport-delivery`) included in the account's access. Any other module needs current verification, and host-wide modules need host proof.
- Host-wide security checks need proof for the domain, the hostname or the root URL. A proof for a path prefix such as `https://example.com/shop/` covers only checks that work within that prefix.
- Verification does not create a monitoring project. The first audit of a verified target creates one automatically when a project slot is free; audits without verification create none.
- A proof stays current for 30 days after it was last checked. Keep the DNS record or file in place so it can be checked again.

## 4. Retry

Retry only after the user confirms that the workspace shows the target as verified.

- Call the same tool with the same `target` spelling and the same arguments as the rejected call.
- If the result is again a verification reason, compare the target spelling with the verified one and check whether the proof is current. Do not retry in a loop.
- Then continue with the `website-audit` skill to present the results.
