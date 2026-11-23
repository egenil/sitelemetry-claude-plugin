# Sitelemetry plugin for Claude

Audit websites you own or are authorized to test, directly from Claude. The plugin connects Claude to the Sitelemetry audit server and adds skills that run the right audit, wait correctly for long-running audits, explain the findings by severity, turn them into fixes for your stack and re-test the result.

Audits cover security, technical SEO, AI visibility (GEO/AEO), analytics and tracking, accessibility (static WCAG 2.2 checks) and performance (PageSpeed and Core Web Vitals). Which audits and options are available depends on the access assigned to your Sitelemetry account.

This repository contains only the plugin: its manifest, the MCP server reference, skill text and a small validation script. It does not contain the Sitelemetry service source code.

## Install

**Claude Code**

Add this repository as a marketplace and install the plugin from it:

```text
/plugin marketplace add egenil/sitelemetry-claude-plugin
/plugin install sitelemetry@sitelemetry
```

To try a local copy for one session without installing, start Claude Code with `claude --plugin-dir <path-to-this-folder>`.

Then run `/mcp`, choose the Sitelemetry server (listed as `plugin:sitelemetry:sitelemetry`) and sign in with your Sitelemetry account.

**Claude apps**

Install Sitelemetry from the Claude directory when it is listed there, then sign in on the plugin's Connectors tab. If you have already connected the Sitelemetry connector, the plugin uses the same server, so you get one set of tools.

To try a local copy, build a zip of the committed files with `git archive --format=zip -o sitelemetry-plugin.zip HEAD` and upload it under Customize, Plugins, Add, Upload plugin.

## Tools

The plugin connects to one remote MCP server, `https://claude-mcp.sitelemetry.com/mcp`, which provides seven tools:

- `audit_security`: security modules such as DNS, email DNS, TLS, HTTP headers and exposure checks and, depending on the account, active probes such as port and injection checks.
- `audit_seo`: crawlability, indexation, metadata, structured data and internal links.
- `audit_ai_visibility`: entity clarity, answerability, source signals and AI-crawler policy.
- `audit_integrations`: analytics, tags, marketing pixels, verification tags and consent signals.
- `audit_accessibility`: static WCAG 2.2 checks.
- `audit_performance`: PageSpeed Insights and Core Web Vitals, mobile or desktop.
- `audit_full`: every audit area included in your account, with one blended score.

## Skills

| Skill | What it does |
|---|---|
| `/sitelemetry:website-audit` | Picks the narrowest audit, polls long-running audits, and presents findings by severity with the top fixes. Accepts a URL and an optional area, for example `/sitelemetry:website-audit https://example.com/ security`. |
| `/sitelemetry:fix-and-retest` | Turns findings into changes for nginx, Apache, Cloudflare, Vercel or Next.js, Netlify or WordPress, then re-runs the same audit and reports before and after. |
| `/sitelemetry:pre-launch-check` | Runs security, performance and accessibility (and SEO when relevant) before a release and separates blockers from warnings. |
| `/sitelemetry:ai-visibility` | Uses the AI visibility and SEO audits to propose robots.txt rules, JSON-LD, llms.txt and content edits backed by findings. |
| `/sitelemetry:domain-verification` | Explains the DNS TXT, HTTP file and Google Search Console verification methods when an audit asks for them, then retries. |

Claude also uses the skills automatically when a request matches them.

## Example prompts

- "Run a security audit on https://example.com/, it's my site, and tell me what to fix first."
- "We launch https://staging.example.com/ on Friday. Do a pre-launch check and list the blockers."
- "Fix the security header findings in this nginx config and re-test the site."
- "How visible is https://example.com/ to AI assistants? Suggest structured data and robots.txt changes."
- "The audit says my domain must be verified. How do I do that with a DNS record?"

## Authorization

Only audit websites you own or are explicitly authorized to test. The skills ask for confirmation when this is unclear and do not audit third-party sites. Without ownership verification of the exact target in your workspace, Sitelemetry runs only public checks: the SEO, AI visibility, analytics and tracking, accessibility and performance audits included in your account and the public security checks. The remaining security checks run after verification.

Depending on the account, security and full audits can send active, non-destructive test requests to the site, for example port and injection probes. Run them only on sites you are authorized to test, and expect them to show up in server logs or firewall alerts.

## How audits run

- Long audits return `running` with a job ID. The skills poll the same tool until the result is final; polling does not start another audit or use more allowance.
- When a prerequisite is missing (verification, access, allowance or authorization terms), or the target's domain does not resolve in DNS, the tool returns `action_required` before any audit runs, and nothing is used. The skills explain the next step and give the link the tool returns.
- Results that could not measure everything are marked `partial`, and the skills report what was not measured instead of estimating it.

## Data and privacy

- When you run an audit, Claude sends the target URL, the audit options and the report language to `https://claude-mcp.sitelemetry.com/mcp`, authenticated with OAuth through your Claude client. Free-text options you supply, such as the brand name, questions and competitor names for the AI visibility audit, are sent as well.
- Sitelemetry audits the target from its own servers and returns findings to Claude. Audit usage is recorded in your Sitelemetry account.
- Performance audits measure the target with Google PageSpeed Insights, so the target URL is sent to Google as part of the audit.
- When your Sitelemetry workspace has a Google connection, SEO and full audits can add Search Console data for the target from that connection unless you ask Claude to leave it out.
- The plugin itself stores nothing locally and downloads or installs no software. Skills may propose edits to your project's configuration files and suggest check commands such as `curl`, `dig`, `nslookup` or `nginx -t`. Claude applies or runs them only with your approval, and they contact only your own site and DNS.
- Privacy policy: https://sitelemetry.com/privacy
- Terms: https://sitelemetry.com/terms

## Support and documentation

- Documentation: https://sitelemetry.com/mcp-guide
- Support: https://sitelemetry.com/support
- Website: https://sitelemetry.com

## License

MIT. See [LICENSE](LICENSE). The license covers the contents of this repository only (the plugin manifest, MCP server reference, skill text and validation script). It grants no rights to the Sitelemetry service or its source code.
