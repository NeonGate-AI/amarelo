---
name: web-quality-audit
description: Run an evidence-led web quality audit covering performance, accessibility, SEO, best practices, and agentic browsing. Use when asked to "audit my site", "review web quality", "run lighthouse audit", "check page quality", or "optimize my website".
license: MIT
metadata:
  author: web-quality-skills
  version: "2.0"
---

# Web quality audit

Comprehensive quality review that combines live browser evidence with source inspection. Covers Performance, Accessibility, SEO, Best Practices, and Agentic Browsing without treating an aggregate score as proof of quality.

## Amarelo repository policy

The repository currently allows static source review and manual inspection only. Do not run Lighthouse, axe automation, browser traces, the bundled analyzer script, browser automation, synthetic performance suites, or automated tests. WCAG 2.2 Level AA is the normative accessibility target; WCAG 2.5.8 defines a 24 by 24 CSS-pixel minimum with exceptions, while Amarelo targets at least 44 by 44 CSS pixels for practical interactive controls. Keep source-backed findings separate from manually observed runtime facts and unverified runtime hypotheses. Do not invent audit scores, Core Web Vitals values, WCAG conformance, or performance improvements.

> **Future measurement reference.** If the owner later re-enables Lighthouse, version 13+ uses shared **Performance Insights** across Lighthouse and the DevTools Performance panel ([announcement](https://developer.chrome.com/blog/moving-lighthouse-to-insights)). This note does not authorize running Lighthouse in the current phase.

## How it works

1. Establish the audit target: representative routes, important states and journeys, public versus authenticated access, viewport, theme, and device scope.
2. Read the smallest applicable rules, specification, skill, configuration, and source surface.
3. Inspect semantics, accessibility, assets, loading, interaction, layout stability, metadata, security-sensitive patterns, and PWA behavior statically.
4. Inspect an already available rendered page manually when useful, without starting Lighthouse, a trace, a script, or browser automation.
5. Categorize by user impact and confidence, clearly separating observed source facts, manually observed runtime facts, existing owner-provided field evidence, and hypotheses.
6. After a change, repeat the same static review and permitted manual flows. Report automated, quantitative, field, and real-device validation as deferred.

## Tool routing

Use the current repository-approved route; do not install or start optional audit tooling.

| Need | Current route | Deferred evidence |
|------|---------------|-------------------|
| Performance and Core Web Vitals | Static resource, rendering, interaction, and layout-risk inspection; optional manual visual observation | Traces, Lighthouse, PageSpeed, synthetic metrics, and new field collection |
| Real-user performance | Existing owner-provided field evidence with explicit route, period, percentile, and device scope | New CrUX, Search Console, or RUM collection |
| Accessibility | Static name/role/value, order, focus, contrast, reflow, target, motion, and live-region review; optional human keyboard/screen-reader inspection | Lighthouse, axe, automated accessibility suites, and browser automation |
| SEO and best practices | Static metadata, crawl directive, dependency/configuration, and source review | Lighthouse scores and automated site crawls |
| Rendered semantics and interaction | Human manual inspection of an already available page | Accessibility-tree automation and scripted browser flows |

## Audit categories

### Performance

**Core Web Vitals** — Must pass for good page experience:
* **LCP (Largest Contentful Paint) < 2.5s.** The largest visible element must render quickly. Optimize images, fonts, and server response time.
* **INP (Interaction to Next Paint) < 200ms.** User interactions must feel instant. Reduce JavaScript execution time and break up long tasks.
* **CLS (Cumulative Layout Shift) < 0.1.** Content must not jump around. Set explicit dimensions on images, embeds, and ads.

**Resource Optimization:**
* **Compress images.** Use WebP/AVIF with fallbacks. Serve correctly sized images via `srcset`.
* **Minimize JavaScript.** Remove unused code. Use code splitting. Defer non-critical scripts.
* **Optimize CSS.** Extract critical CSS. Remove unused styles. Avoid `@import`.
* **Efficient fonts.** Use `font-display: swap`. Preload critical fonts. Subset to needed characters.

**Loading Strategy:**
* **Preconnect to origins.** Add `<link rel="preconnect">` for third-party domains.
* **Preload critical assets.** LCP images, fonts, and above-fold CSS.
* **Lazy load below-fold content.** Images, iframes, and heavy components.
* **Cache effectively.** Long cache TTLs for static assets. Immutable caching for hashed files.

### Accessibility

**Perceivable:**
* **Text alternatives.** Every `<img>` has meaningful `alt` text. Decorative images use `alt=""`.
* **Color contrast.** Minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA).
* **Don't rely on color alone.** Use icons, patterns, or text alongside color indicators.
* **Captions and transcripts.** Video has captions. Audio has transcripts.

**Operable:**
* **Keyboard accessible.** All functionality available via keyboard. No keyboard traps.
* **Focus visible.** Clear focus indicators on all interactive elements.
* **Skip links.** Provide "Skip to main content" for keyboard users.
* **Sufficient time.** Users can extend time limits. No auto-advancing content without controls.

**Understandable:**
* **Page language.** Set `lang` attribute on `<html>`.
* **Consistent navigation.** Same navigation structure across pages.
* **Error identification.** Form errors clearly described and associated with fields.
* **Labels and instructions.** All form inputs have associated labels.

**Robust:**
* **Valid HTML.** No duplicate IDs. Properly nested elements.
* **ARIA used correctly.** Prefer native elements. ARIA roles match behavior.
* **Name, role, value.** Interactive elements have accessible names and correct roles.

### SEO

**Crawlability:**
* **Valid robots.txt.** Doesn't block important resources.
* **XML sitemap.** Lists all important pages. Submitted to Search Console.
* **Canonical URLs.** Prevent duplicate content issues.
* **No noindex on important pages.** Check meta robots and headers.

**On-Page SEO:**
* **Unique title tags.** Make each title descriptive and concise; display truncation varies by device and result type.
* **Meta descriptions.** Write useful, page-specific summaries; search engines may choose a different snippet.
* **Heading hierarchy.** The primary heading is descriptive and the structure is logical; do not fail valid HTML solely for using more than one `<h1>`.
* **Descriptive link text.** Not "click here" or "read more".

**Technical SEO:**
* **Mobile-friendly.** Responsive design. Apply the 24×24 CSS-pixel WCAG 2.5.8 minimum with its defined exceptions and Amarelo's 44×44 practical target.
* **HTTPS.** Secure connection required.
* **Page experience signals.** Use field Core Web Vitals as evidence, without promising a ranking change.
* **Structured data.** JSON-LD for rich snippets (Article, Product, FAQ, etc.).

### Best practices

**Security:**
* **HTTPS everywhere.** No mixed content. HSTS enabled.
* **No vulnerable libraries.** Keep dependencies updated.
* **CSP headers.** Content Security Policy to prevent XSS.
* **No exposed source maps.** In production builds.

**Modern Standards:**
* **No deprecated APIs.** Replace `document.write`, synchronous XHR, etc.
* **Valid doctype.** Use `<!DOCTYPE html>`.
* **Charset declared.** `<meta charset="UTF-8">` as first element in `<head>`.
* **No browser errors.** Clean console. No CORS issues.

**UX Patterns:**
* **No intrusive interstitials.** Especially on mobile.
* **Clear permission requests.** Only ask when needed, with context.
* **No misleading buttons.** Buttons do what they say.

### Agentic browsing

In the current phase, inspect semantic HTML, labels, names, roles, states, and deterministic interaction contracts statically and manually as signals for how well assistants can understand and interact with the rendered page. If the owner later re-enables Lighthouse Agentic Browsing, keep its results separate as automated technical evidence rather than treating them as authority.

* **Accessible interaction surface.** Semantic HTML, labels, names, roles, and states must expose meaningful controls in the accessibility tree.
* **WebMCP integrations are valid when present.** Review registered tools, schemas, and form coverage; do not add WebMCP solely to raise an audit score.
* **`llms.txt` is optional.** A valid file may help compatible tools discover curated content, but a Lighthouse pass does not prove that search or AI products will ingest, rank, or cite it.
* **Keep this category separate from SEO claims.** Agentic browsability is not evidence of search ranking or AI visibility.

## Severity levels

| Level | Description | Action |
|-------|-------------|--------|
| **Critical** | Security vulnerabilities, complete failures | Fix immediately |
| **High** | Core Web Vitals failures, major a11y barriers | Fix before launch |
| **Medium** | Performance opportunities, SEO improvements | Fix within sprint |
| **Low** | Minor optimizations, code quality | Fix when convenient |

## Audit output format

When performing an audit, structure findings as:

```markdown
## Audit results

### Evidence
| Signal | Scope/conditions | Result | Source |
|--------|------------------|--------|--------|
| LCP | URL, phone, p75/28 days | 3.1s (needs improvement) | CrUX |
| Accessibility | Mobile source and manual keyboard flow | Label-in-name failure on dismiss control | Source plus manual observation |

### Critical issues (X found)
- **[Category]** Issue description. File: `path/to/file.js:123`
  - **Impact:** Why this matters
  - **Evidence:** Measured failure, runtime observation, or source hypothesis
  - **Fix:** Specific code change or recommendation

### High priority (X found)
...

### Summary
- Performance: measured status and X findings
- Accessibility: source/manual status, X findings, automated validation deferred
- SEO: X findings
- Best Practices: X findings
- Agentic Browsing: X findings or not available

### Recommended priority
1. First fix this because...
2. Then address...
3. Finally optimize...

### Verification
- Repeat the same static review and permitted manual flow
- Manual checks completed
- Automated, quantitative, field, and real-device validation still pending where applicable
```

## Quick checklist

### Before every deploy
- [ ] No unresolved source-backed Core Web Vitals risks; quantitative status is not claimed without field evidence
- [ ] Static accessibility review completed against WCAG 2.2 AA; automated conformance is not claimed
- [ ] No console errors
- [ ] HTTPS working
- [ ] Meta tags present

### Weekly review
- [ ] Check Search Console for issues
- [ ] Review Core Web Vitals trends
- [ ] Update dependencies
- [ ] Test with screen reader

### Monthly deep dive
- [ ] Review whether the owner has re-enabled automated web-quality measurement
- [ ] Revisit deferred performance and accessibility evidence
- [ ] Accessibility audit with real users
- [ ] SEO keyword review

## References

For detailed guidelines on specific areas:
- [Performance Optimization](../performance/SKILL.md)
- [Core Web Vitals](../core-web-vitals/SKILL.md)
- [Accessibility](../accessibility/SKILL.md)
- [SEO](../seo/SKILL.md)
- [Best Practices](../best-practices/SKILL.md)
