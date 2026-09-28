---
name: ai-visibility
description: Use the Sitelemetry AI visibility (GEO/AEO) and technical SEO audits on a site the user owns to propose evidence-backed changes such as robots.txt rules for AI crawlers, schema.org JSON-LD structured data, an llms.txt file and content edits, each only where the findings support it. Use when the user asks how AI assistants and AI search can crawl, understand or cite their site, or wants to improve GEO, AEO or structured data.
---

# AI visibility

## Ground rules

- Reply in the user's language. For the audit tools, set `lang` as described in the `website-audit` skill. `lang` changes the report wording, not the measurement criteria.
- Only audit sites the user owns or is authorized to test. If that is not clear, ask first.
- Be precise about what is measured. `audit_ai_visibility` checks entity clarity, answerability, source signals and AI-crawler policy on the site's own pages. The `prompts` option runs content-readiness checks against the site; it does not query any AI provider. `competitors` are names used to assess comparison content; competitor sites are not audited. Nothing here measures or guarantees whether an AI assistant mentions or cites the site. Say this when you present results.

## 1. Run the audits

1. `audit_ai_visibility` on the target.
   - `brand`: pass it if the user gives one or the site name is ambiguous; otherwise it is inferred from the site.
   - `prompts`: real questions the site's audience asks, supplied by the user (up to 24, each up to 500 characters). Only as many prompts as the connected account's prompt limit are checked, and any beyond it are left out. If the result shows fewer prompts than were supplied, say so.
   - `competitors`: names only, if the user supplies them (up to 8).
   - `maxPages` and `promptLimit`: leave them out unless the user asks; defaults follow the connected account.
2. `audit_seo` on the same target when structured data, crawlability, indexation or metadata matter to the request. Start it only after the first audit has a final status.

Handle `running`, `action_required` and errors as in the `website-audit` skill: poll with `pollArguments` exactly as returned, never start a duplicate audit, and relay access or limit messages neutrally.

## 2. Map findings to changes

Propose a change only when a returned finding, or its evidence, supports it. Cite the finding next to each proposal.

| Finding area | Change to propose |
|---|---|
| AI-crawler policy: crawlers blocked, rules unclear or inconsistent | robots.txt rules per crawler |
| Structured data missing, invalid or not describing the main entity | schema.org JSON-LD for the real organization, site and page types |
| Entity clarity | clear statements of who the organization is, what it offers and where, on the home and about pages |
| Answerability | answer-first sections and FAQs based on real customer questions |
| Source signals | author and date information, about and contact pages, references, consistent names |
| No machine-readable site summary, when reported or when the user asks | an llms.txt file |

Crawler names, robots.txt patterns and JSON-LD and llms.txt templates: [AI crawlers, JSON-LD and llms.txt](references/ai-crawlers-and-schema.md).

## 3. Rules for each change

- **robots.txt**: the site owner decides which crawlers may access the site. Explain the difference between crawlers that collect training data and those that fetch pages for search or for a user's request. Keep the existing rules and the `Sitemap` line, and never block general search crawlers such as `Googlebot` or `Bingbot` by accident.
- **JSON-LD**: describe only facts that are true and visible on the page. Ask the user for facts you do not have (legal name, logo URL, official profiles). Never invent ratings, reviews, prices, addresses, opening hours or FAQs. Use one stable `@id` per entity across pages, and check the markup with a structured-data validator before publishing.
- **llms.txt**: present it as an optional, low-effort convention that not every AI provider reads. Link only to real, public pages.
- **Content**: write edits in the site's voice and mark them as drafts for the user to review. Do not add claims the user has not confirmed.

## 4. Present and re-test

Group the proposals by effort: configuration first (robots.txt, llms.txt), then markup (JSON-LD), then content. For each, name the finding it addresses, the change and where it goes.

```text
AI visibility for https://example.com/ (score <score> if returned)
What this measures: content-readiness signals on your pages, not live AI answers.

1. Configuration
   - Finding: <title> (<severity>). Change: <robots.txt rule>. Where: /robots.txt
2. Markup
   - Finding: <title> (<severity>). Change: Organization JSON-LD. Where: home page head
3. Content
   - Finding: <title> (<severity>). Change: <draft edit>. Where: <page>

Not measured: <anything the result marks as unavailable or partial>
```

After the user publishes the changes, offer to re-run the same audits with the same arguments and compare the results by `findingKey`, as in the `fix-and-retest` skill. Report what changed and what is still open or not measured.
