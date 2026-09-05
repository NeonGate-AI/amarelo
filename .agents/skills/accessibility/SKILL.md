---
name: accessibility
description: Review or improve Amarelo keyboard, screen-reader, contrast, reflow and accessible authentication behavior against its WCAG 2.2 AA target.
license: MIT
metadata:
  author: web-quality-skills
  version: "2.0-amarelo"
---

# Accessibility

WCAG 2.2 Level AA is Amarelo's target. Use semantic controls, visible focus and PT-BR accessible names. The practical product target is 44×44 CSS pixels for interactive controls; WCAG 2.5.8's 24×24 minimum has exceptions. Neither source review nor an automated score establishes conformance.

## Workflow

1. Identify the spec's affected page, state, viewport, theme and interaction.
2. Inspect names/roles/values, landmarks, heading order, labels, error announcements, keyboard operation, focus transitions, contrast, reflow, orientation and reduced motion.
3. Run existing focused automated tests at the declared public seams. Browser/a11y checks are allowed when available and relevant; follow `.agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md` rather than introducing another runner.
4. Verify the rendered flow with keyboard and a screen reader when available. Record missing device/assistive-technology coverage explicitly.
5. Fix the affected behavior and repeat the same checks. Distinguish source facts, executed automated assertions, manual observations and remaining hypotheses.

## Amarelo-specific checks

- Keep captions and complete ordered transcript accessible when decorative fades truncate the visual presentation.
- Describe Orb status in accessible text; color, animation and sound cannot be the only state signal.
- Maintain useful focus during asynchronous pending/error/session-expired transitions and reject stale-response announcements.
- Authentication permits paste/autofill or a non-cognitive alternative; never block password managers.
- Support keyboard operation and portrait/landscape reflow. Focus must not disappear behind fixed controls.
- Honor reduced motion. Use a polite status region for routine updates and urgent announcements only for genuinely urgent feedback.
- Keep normal text contrast at least 4.5:1 and large text at least 3:1. Large text means at least 18pt (24 CSS px), or 14pt bold (about 18.67 CSS px); do not confuse points and pixels.

## Focused references

For a criterion lookup, read `references/WCAG.md`. For modal focus, form errors, live regions, tabs or screen-reader commands, read the matching section in `references/A11Y-PATTERNS.md`. References explain patterns; the active spec and repository rules own required behavior.
