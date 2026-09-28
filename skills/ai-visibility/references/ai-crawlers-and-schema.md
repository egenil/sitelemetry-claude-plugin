# AI crawlers, JSON-LD and llms.txt

Use these only where an audit finding supports them, and adapt every value to the real site. Crawler names and behaviour change over time, so ask the user to confirm against each operator's current documentation before publishing robots.txt changes.

## Common AI-related user agents

| User agent | Operator | Purpose |
|---|---|---|
| `GPTBot` | OpenAI | Collects content that may be used for model training |
| `OAI-SearchBot` | OpenAI | Indexes pages for search results in ChatGPT |
| `ChatGPT-User` | OpenAI | Fetches a page when a user asks for it |
| `ClaudeBot` | Anthropic | Collects content that may be used for model training |
| `Claude-SearchBot` | Anthropic | Indexes pages to improve search results |
| `Claude-User` | Anthropic | Fetches a page when a user asks for it |
| `PerplexityBot` | Perplexity | Indexes pages for Perplexity search results |
| `Perplexity-User` | Perplexity | Fetches a page when a user asks for it |
| `Google-Extended` | Google | A robots.txt token that controls use of content for Gemini models; it does not affect Google Search |
| `Applebot-Extended` | Apple | A robots.txt token that controls use of content for Apple's AI model training |
| `CCBot` | Common Crawl | Builds an open web archive that many models are trained on |
| `Googlebot`, `Bingbot` | Google, Microsoft | General search crawlers; search features built on them depend on these, so do not block them by accident |

User-request fetchers may treat robots.txt differently from crawlers; their operators document this.

## robots.txt patterns

A crawler follows only the most specific `User-agent` group that matches it, so repeat any rule it must also obey inside its own group.

Allow AI search and user-requested fetches, opt out of training collection:

```text
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://example.com/sitemap.xml
```

Allow every crawler (the default when no group blocks it) while keeping private areas closed:

```text
User-agent: *
Disallow: /admin/

Sitemap: https://example.com/sitemap.xml
```

robots.txt is a public request, not access control. Protect private content with authentication.

## JSON-LD

Place one `<script type="application/ld+json">` block in the page `<head>` or body. Use only facts that are true and visible on the site; replace every placeholder.

Organization and website (home page):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      "name": "Example Ltd",
      "url": "https://example.com/",
      "logo": "https://example.com/logo.png",
      "description": "One factual sentence about what the organization does.",
      "sameAs": ["https://social.example.org/example"]
    },
    {
      "@type": "WebSite",
      "@id": "https://example.com/#website",
      "url": "https://example.com/",
      "name": "Example",
      "publisher": { "@id": "https://example.com/#organization" }
    }
  ]
}
</script>
```

Article (blog posts and guides):

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "The visible title of the article",
  "datePublished": "2026-01-15",
  "dateModified": "2026-02-01",
  "author": { "@type": "Person", "name": "Author Name" },
  "publisher": { "@id": "https://example.com/#organization" },
  "mainEntityOfPage": "https://example.com/guide/topic"
}
```

FAQPage, only when the same questions and answers are visible on the page:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "A question visitors really ask",
      "acceptedAnswer": { "@type": "Answer", "text": "The answer as it appears on the page." }
    }
  ]
}
```

Other types to consider when they match the page: `BreadcrumbList`, `LocalBusiness` (only with a real address), `Product` (only with real product data), `SoftwareApplication`, `Event`. Search engines decide which rich results to show; valid markup does not guarantee one.

## llms.txt

A plain Markdown file served at `https://example.com/llms.txt`. It is an emerging convention, and not every AI provider reads it.

```markdown
# Example

> One or two factual sentences: what Example is, who it serves and where.

Example makes <product or service> for <audience>. <One more factual sentence if useful.>

## Main pages

- [Product overview](https://example.com/product): what it does and for whom
- [Documentation](https://example.com/docs): setup and usage guides
- [About](https://example.com/about): company background and contact details

## Optional

- [Blog](https://example.com/blog): articles and announcements
```

Keep it short, link only to public pages that exist, and update it when those pages change.
