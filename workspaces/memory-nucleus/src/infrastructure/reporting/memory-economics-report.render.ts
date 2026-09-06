import type { MemoryEconomicsReport } from '@application/reporting'

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
const money = (value: number | null): string =>
  value === null
    ? 'Not measured'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 4
      }).format(value)
const number = (value: number | null): string =>
  value === null
    ? 'Unknown'
    : new Intl.NumberFormat('en', { maximumFractionDigits: 4 }).format(value)
const label = (value: string): string =>
  value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('-', ' ')

/** Standalone, script-free HTML. Only the redacted report projection is rendered. */
export function renderMemoryEconomicsReportHtml(
  report: MemoryEconomicsReport
): string {
  const cards = [
    [
      'Monthly cost per active family',
      money(report.monthly.costPerActiveFamilyBrl)
    ],
    ['Average monthly workload', '260 minutes'],
    [
      'Memory ROI',
      report.memory.memoryRoi === null
        ? 'Unknown'
        : `${number(report.memory.memoryRoi)}×`
    ],
    [
      'AI COGS / authorized scenario revenue',
      report.monthly.aiCogsRatio === null
        ? 'Undefined'
        : `${number(report.monthly.aiCogsRatio * 100)}%`
    ]
  ]
  const costs = report.components
    .map(
      (
        group
      ) => `<section><h2>${escapeHtml(label(group.costClass))} costs · source window</h2>
    <table><thead><tr><th>Component</th><th>Coverage</th><th>Cost</th><th>Known subtotal</th><th>Unknown allocations</th></tr></thead><tbody>
    ${group.components
      .map(
        (
          component
        ) => `<tr><td>${escapeHtml(label(component.component))}</td><td>${escapeHtml(component.coverage)}</td>
      <td>${escapeHtml(money(component.costBrl))}</td><td>${escapeHtml(money(component.knownSubtotalBrl))}</td><td>${component.unknownAllocations}</td></tr>`
      )
      .join('')}
    </tbody></table></section>`
    )
    .join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'">
<title>Memory economics · ${escapeHtml(report.reportId)}</title>
<style>
:root{color-scheme:light;font:16px/1.5 system-ui,sans-serif;background:#f5f5ef;color:#202723}*{box-sizing:border-box}body{margin:0}
main{max-width:1180px;margin:auto;padding:40px 24px 64px}header{display:flex;align-items:center;justify-content:space-between;gap:20px}
h1{font-size:clamp(2rem,5vw,3.3rem);letter-spacing:-.055em;line-height:1.1;margin:12px 0}h2{font-size:1.15rem;margin:0 0 16px}
p{max-width:850px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.75rem}.muted{color:#5f6a63}.badge{padding:8px 16px;border-radius:99px;background:#f8df8a;font-weight:700;text-transform:uppercase}
.scale{background:#c4eacb}.rollback{background:#f1c3bc}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:30px 0}
.card,section{background:white;border:1px solid #dbe0d8;border-radius:12px;padding:22px}.card small{display:block;color:#5f6a63;min-height:46px}.card strong{display:block;font-size:1.65rem;letter-spacing:-.04em}
section{margin-top:18px;overflow-x:auto}.notice{border-left:5px solid #e7bb45;padding:12px 20px;background:#fff9e4}
table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;padding:11px 12px;border-bottom:1px solid #e4e7e2;vertical-align:top}th{color:#5f6a63;font-weight:600}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.75rem;background:#f5f5ef;padding:16px;border-radius:8px}
li{margin:5px 0}footer{margin-top:28px;font-size:.8rem;color:#5f6a63}@media(max-width:800px){.cards,.grid{grid-template-columns:1fr 1fr}header{align-items:flex-start}}@media(max-width:500px){.cards,.grid{grid-template-columns:1fr}main{padding:24px 14px}header{display:block}}
</style></head><body><main>
<header><div><div class="eyebrow">Amarelo · operational report</div><h1>Memory economics</h1><p class="muted">${escapeHtml(report.cohortId)} · ${escapeHtml(report.window.from)} to ${escapeHtml(report.window.to)}</p></div>
<span class="badge ${escapeHtml(report.decision.status)}">${escapeHtml(report.decision.status)}</span></header>
<p class="notice"><strong>${escapeHtml(report.monthly.evidenceMode)} · ${escapeHtml(report.monthly.coverage)}</strong>. Workload: 60 minutes/week × 52/12 = 260 minutes/month, on the <strong>${escapeHtml(report.monthly.durationBasis ?? 'undeclared')}</strong> basis.
${report.measuredVoiceCoverage ? 'Voice cost evidence is present.' : 'Total voice affordability is not measured; known subtotals are partial evidence.'}
${report.monthly.evidenceMode === 'normalized' ? 'Normalized costs are projections from the stated source window, not an observed month.' : ''}</p>
<div class="cards">${cards.map(([title, value]) => `<div class="card"><small>${escapeHtml(title)}</small><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>
<p>Scenario: <strong>${escapeHtml(label(report.scenario.kind))}</strong> · ${report.activeFamilies} active families · scenario price ${escapeHtml(money(report.monthly.revenueScenarioBrl))}.
Prices remain scenario inputs. Free revenue ratios are undefined. Known monthly subtotal: ${escapeHtml(money(report.monthly.knownSubtotalPerActiveFamilyBrl))}.</p>
${costs}
<div class="grid"><section><h2>Memory comparison</h2><table><tbody>
<tr><td>Comparable measured usage</td><td>${report.memory.comparableMeasuredUsage ? 'Present' : 'Missing'}</td></tr>
<tr><td>Avoided serving cost</td><td>${escapeHtml(money(report.memory.avoidedServingCostBrl))}</td></tr>
<tr><td>Memory processing cost</td><td>${escapeHtml(money(report.memory.processingCostBrl))}</td></tr>
<tr><td>Net Memory Cost · processing − avoided</td><td>${escapeHtml(money(report.memory.netMemoryCostBrl))}</td></tr>
<tr><td>Deterministic integrity mitigation</td><td>${escapeHtml(money(report.memory.deterministicMitigationCostBrl))}</td></tr>
<tr><td>Model-assisted integrity mitigation</td><td>${escapeHtml(money(report.memory.modelMitigationCostBrl))}</td></tr>
</tbody></table></section><section><h2>Scale decision · ${escapeHtml(report.decision.scope)}</h2>
${report.decision.reasons.length ? `<ul>${report.decision.reasons.map((reason) => `<li>${escapeHtml(label(reason))}</li>`).join('')}</ul>` : '<p>Supplied evidence satisfies the configured gates.</p>'}
<p class="muted">This report does not run upstream assurance or authorize a product plan. Voice experience: ${escapeHtml(report.voiceExperience)}.</p></section></div>
<section><h2>Quality, privacy, integrity and queue health</h2><table><thead><tr><th>Metric</th><th>Supplied measurement</th></tr></thead><tbody>
${Object.entries(report.metrics)
  .map(
    ([key, value]) =>
      `<tr><td>${escapeHtml(label(key))}</td><td>${escapeHtml(number(value))}</td></tr>`
  )
  .join('')}
</tbody></table></section>
<section><h2>Evidence and allocation</h2><details><summary>Versioned provenance, thresholds, usage, distribution and uncertainty</summary><pre>${escapeHtml(
    JSON.stringify(
      {
        schemaVersion: report.schemaVersion,
        reportId: report.reportId,
        evaluatedHead: report.evaluatedHead,
        allocationVersion: report.memory.allocationVersion,
        workload: report.workload,
        durationTotals: report.durationTotals,
        usage: report.usage,
        gates: report.gates,
        thresholds: report.thresholds,
        uncertainty: report.uncertainty,
        provenance: report.provenance,
        exclusions: report.scenario.exclusions
      },
      null,
      2
    )
  )}</pre></details></section>
<footer>Generated ${escapeHtml(report.generatedAt)} · no raw conversation, prompt, response or Memory content · historical ledger prices remain unchanged</footer>
</main></body></html>`
}
