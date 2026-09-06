import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createMemoryEconomicsReport } from '@application/reporting'
import { renderMemoryEconomicsReportHtml } from './memory-economics-report.render'

/** Explicit files only; no provider calls, database access, environment secrets or experiment execution. */
export async function writeMemoryEconomicsReportFiles(options: {
  readonly inputPath: string
  readonly jsonPath: string
  readonly htmlPath: string
}): Promise<void> {
  const inputPath = resolve(options.inputPath)
  const jsonPath = resolve(options.jsonPath)
  const htmlPath = resolve(options.htmlPath)
  if (new Set([inputPath, jsonPath, htmlPath]).size !== 3)
    throw new Error('Input and output report files must be distinct')
  const inputFile = await stat(inputPath)
  if (!inputFile.isFile() || inputFile.size > 64 * 1024 * 1024)
    throw new Error(
      'Economics input must be a redacted JSON file within 64 MiB'
    )
  const report = createMemoryEconomicsReport(
    JSON.parse(await readFile(inputPath, 'utf8'))
  )
  const html = renderMemoryEconomicsReportHtml(report)
  await mkdir(dirname(jsonPath), { recursive: true })
  await mkdir(dirname(htmlPath), { recursive: true })
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(htmlPath, html, 'utf8')
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [inputPath, jsonPath, htmlPath, ...extra] = process.argv.slice(2)
  if (!inputPath || !jsonPath || !htmlPath || extra.length !== 0) {
    process.stderr.write(
      'Usage: memory-economics-report <redacted-input.json> <report.json> <report.html>\n'
    )
    process.exitCode = 1
  } else {
    writeMemoryEconomicsReportFiles({ inputPath, jsonPath, htmlPath }).catch(
      () => {
        process.stderr.write(
          'Economics report generation failed; check versioned redacted inputs and output access.\n'
        )
        process.exitCode = 1
      }
    )
  }
}
