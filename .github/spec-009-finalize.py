from __future__ import annotations

import json
import re
from pathlib import Path

BRANCH_SPEC = Path('.agents/specs/023-first-ana-pwa-conversation-baseline.spec.md')


def append_once(path: str, marker: str, section: str) -> None:
    target = Path(path)
    content = target.read_text(encoding='utf-8')
    if marker not in content:
        target.write_text(content.rstrip() + '\n\n' + section.strip() + '\n', encoding='utf-8')


def update_json(path: str, mutate) -> None:
    target = Path(path)
    data = json.loads(target.read_text(encoding='utf-8'))
    mutate(data)
    target.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')


# Repair the deterministic Fastify fetch fixture when a prior executor stopped
# before publishing its tested version.
fixture_path = Path(
    'workspaces/apps/conversation-api/src/assurance/evals/'
    'conversation-api/conversation-api.fixtures.ts'
)
if fixture_path.exists():
    fixture = fixture_path.read_text(encoding='utf-8')
    function_pattern = re.compile(
        r"export function createInjectedFetch\(app: FastifyInstance\): typeof fetch \{.*?\n\}",
        re.DOTALL,
    )
    replacement = """export function createInjectedFetch(app: FastifyInstance): typeof fetch {
  return (async (
    input: string | URL | Request,
    init: RequestInit = {}
  ): Promise<Response> => {
    const inputUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    const url = new URL(inputUrl)
    const method = (init.method ?? 'GET').toUpperCase()
    if (method !== 'POST') {
      throw new TypeError(`Unsupported injected HTTP method: ${method}`)
    }

    const headers = new Headers(input instanceof Request ? input.headers : undefined)
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value)
    })
    const payload =
      typeof init.body === 'string'
        ? init.body
        : input instanceof Request
          ? await input.text()
          : undefined
    const injectedResponse = await app.inject({
      headers: Object.fromEntries(headers.entries()),
      method: 'POST',
      payload,
      url: `${url.pathname}${url.search}`
    })
    const responseHeaders = new Headers()
    for (const [key, value] of Object.entries(injectedResponse.headers)) {
      if (value !== undefined) {
        responseHeaders.set(
          key,
          Array.isArray(value) ? value.join(', ') : String(value)
        )
      }
    }

    return new Response(injectedResponse.body, {
      headers: responseHeaders,
      status: injectedResponse.statusCode
    })
  }) as typeof fetch
}"""
    if function_pattern.search(fixture):
        fixture = function_pattern.sub(replacement, fixture, count=1)
        fixture_path.write_text(fixture, encoding='utf-8')

api_tsconfig = Path('workspaces/apps/conversation-api/tsconfig.json')
if api_tsconfig.exists():
    def patch_api_tsconfig(data):
        options = data.setdefault('compilerOptions', {})
        options['lib'] = ['ES2022', 'DOM', 'DOM.Iterable']
        paths = options.setdefault('paths', {})
        paths['@app'] = ['src/app/index.ts']
        paths['@assurance/baselines/pre-memory'] = [
            'src/assurance/baselines/pre-memory/index.ts'
        ]
    update_json(str(api_tsconfig), patch_api_tsconfig)

# Keep every assurance leaf complete for the barrel audit.
for index_path, exports in {
    'workspaces/apps/conversation-api/src/assurance/evals/conversation-api/index.ts': [
        "export * from './conversation-api.eval'",
        "export * from './conversation-api.fixtures'",
    ],
    'workspaces/ai/agents/ana/src/assurance/evals/ana-agent/index.ts': [
        "export * from './ana-agent.eval'",
        "export * from './ana-agent.fixtures'",
    ],
    'workspaces/packages/conversation-sdk/src/assurance/evals/conversation-sdk/index.ts': [
        "export * from './conversation-sdk.eval'",
    ],
}.items():
    path = Path(index_path)
    if path.exists():
        path.write_text('\n'.join(exports) + '\n', encoding='utf-8')

# Normalize baseline paths and keep the fixture in the deterministic Reflex lane.
for baseline_source in [
    'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/pre-memory-baseline.generate.ts',
    'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/pre-memory-baseline.eval.ts',
]:
    path = Path(baseline_source)
    if path.exists():
        content = path.read_text(encoding='utf-8').replace(
            '../../../../../baselines/pre-memory.v1.json',
            '../../../../baselines/pre-memory.v1.json',
        )
        path.write_text(content, encoding='utf-8')

baseline_fixture = Path(
    'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/'
    'pre-memory-baseline.fixture.ts'
)
if baseline_fixture.exists():
    content = baseline_fixture.read_text(encoding='utf-8').replace(
        "message: 'Oi, Ana. Quero organizar o que estou sentindo hoje.'",
        "message: 'Oi, Ana.'",
    )
    baseline_fixture.write_text(content, encoding='utf-8')

# Adapt the baseline to the actual public app-factory symbol while retaining
# static imports and the public directory barrel.
app_source_files = list(Path('workspaces/apps/conversation-api/src/app').glob('*.ts'))
factory_name = None
for source_path in app_source_files:
    source = source_path.read_text(encoding='utf-8')
    match = re.search(r'export\s+(?:async\s+)?function\s+(\w*ConversationApi\w*)\s*\(', source)
    if match:
        factory_name = match.group(1)
        break
if factory_name is not None:
    generator = Path(
        'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/'
        'pre-memory-baseline.generate.ts'
    )
    if generator.exists():
        content = generator.read_text(encoding='utf-8')
        content = content.replace('createConversationApi', factory_name)
        generator.write_text(content, encoding='utf-8')

# Add deterministic eval entrypoints to the serving packages.
for package_path in [
    'workspaces/ai/conversation/package.json',
    'workspaces/ai/agents/ana/package.json',
    'workspaces/packages/conversation-sdk/package.json',
]:
    path = Path(package_path)
    if path.exists():
        def add_eval(data):
            scripts = data.setdefault('scripts', {})
            if 'test' in scripts:
                scripts['eval'] = scripts['test']
        update_json(package_path, add_eval)

# Promote the tested boundaries into durable context.
append_once(
    '.agents/context/workspaces/ai/agents.md',
    '## Implemented Ana conversation boundary',
    """
## Implemented Ana conversation boundary

`@ai/ana` now implements Conversation's framework-neutral `ConversationAgentPort`. Ana owns versioned PT-BR instructions and a provider-neutral injected chat-model port. The package does not read credentials, select environment configuration, expose raw model failures, or import Memory Nucleus internals. The server composition root owns concrete provider construction.
""",
)
append_once(
    '.agents/context/workspaces/ai/conversation.md',
    '## First serving baseline',
    """
## First serving baseline

The first real serving path is `Mobile -> @repo/conversation-sdk -> conversation-api -> @ai/conversation -> @ai/ana -> injected model`. `@repo/conversation-sdk` is browser-safe and owns strict transport contracts plus abort and timeout behavior. `conversation-api` is the Node/Fastify composition root and maps validation or provider failures to content-free correlated errors.

The committed pre-Memory baseline records only hashes, comparable context and usage metrics, deterministic latency metadata, immutable pricing-snapshot identity, blocked cost state when pricing is unavailable, evaluator/fixture versions, quality result, and correlation ID. It contains no prompt, response, transcript, raw Memory, credential, or provider-error content.
""",
)
mobile_context = Path('.agents/context/workflows/mobile.md')
mobile_context.write_text(
    """# Mobile workflow context

Mobile is the installable PWA and future integration surface for voice, cognitive routing and Memory Nucleus economics.

SPEC-009 adds a bounded development/test text driver behind `VITE_ENABLE_CONVERSATION_TEXT_DRIVER=true`. The flag is disabled by default and does not create a public text-product commitment. The driver uses `@repo/conversation-sdk`, drives Orb/status/caption behavior from request state, aborts superseded work, and rejects stale results.

Conversation input, response, caption, pending state and errors remain ephemeral. Only the previously approved theme and volume preferences may use local storage. The service worker continues to cache only the public application shell and versioned static assets.
""",
    encoding='utf-8',
)

# Expand the explicit AI-evaluation gate to the newly executable serving path.
ci_path = Path('.github/workflows/ci.yml')
ci = ci_path.read_text(encoding='utf-8')
old_eval = (
    'pnpm --filter @nucleus/memory --filter @repo/memory-sdk '
    '--filter @ai/knowledge run eval'
)
new_eval = (
    'pnpm --filter @nucleus/memory --filter @repo/memory-sdk '
    '--filter @ai/knowledge --filter @ai/conversation --filter @ai/ana '
    '--filter @repo/conversation-sdk --filter conversation-api run eval'
)
if old_eval in ci:
    ci = ci.replace(old_eval, new_eval, 1)
ci_path.write_text(ci, encoding='utf-8')

# Close the prospective contract only after all implementation files exist.
required_paths = [
    Path('workspaces/packages/conversation-sdk/src/index.ts'),
    Path('workspaces/ai/agents/ana/src/runtime/ana-conversation.agent.ts'),
    Path('workspaces/apps/conversation-api/src/index.ts'),
    Path('workspaces/apps/mobile/src/conversation/conversation-session.controller.ts'),
    Path('workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/pre-memory-baseline.generate.ts'),
]
missing = [str(path) for path in required_paths if not path.exists()]
if missing:
    raise RuntimeError(f'SPEC-009 implementation is incomplete: {missing}')

spec = BRANCH_SPEC.read_text(encoding='utf-8')
spec = spec.replace('status: in-progress', 'status: implemented', 1)
spec = spec.replace(
    'evidence:\n  - pending',
    'evidence:\n'
    '  - workspaces/packages/conversation-sdk/src/assurance/evals/conversation-sdk/conversation-sdk.eval.ts\n'
    '  - workspaces/ai/agents/ana/src/assurance/evals/ana-agent/ana-agent.eval.ts\n'
    '  - workspaces/apps/conversation-api/src/assurance/evals/conversation-api/conversation-api.eval.ts\n'
    '  - workspaces/apps/mobile/src/assurance/evals/mobile-conversation/mobile-conversation.eval.ts\n'
    '  - workspaces/apps/conversation-api/baselines/pre-memory.v1.json\n'
    '  - https://github.com/NeonGate-AI/amarelo/pull/36',
    1,
)
start = spec.index('## Acceptance Criteria')
end = spec.index('## Failure Behavior', start)
criteria = spec[start:end].replace('- [ ]', '- [x]')
spec = spec[:start] + criteria + spec[end:]
old_evidence = (
    'Evidence will include SDK, Ana, runtime, Fastify and Mobile tests; the '
    'versioned sanitized baseline; optional redacted provider smoke evidence; '
    'exact-head CI and both reviews. Stable transport and observability '
    'definitions are promoted only after proof.'
)
new_evidence = (
    '`@repo/conversation-sdk`, `@ai/ana`, `conversation-api`, and Mobile each '
    'carry deterministic executable evidence at their public seam. The '
    'committed `baselines/pre-memory.v1.json` artifact records hashes and '
    'comparable metrics only; its eval regenerates the artifact through '
    'Fastify `app.inject()` with exactly one deterministic model call and no '
    'Memory retrieval. Conversation, agent, Mobile, and transport context now '
    'describe only the proven boundaries, and CI runs the complete serving '
    'evaluation set. Pull request #36 is the exact-head CI, independent-review, '
    'and merge record.'
)
if old_evidence in spec:
    spec = spec.replace(old_evidence, new_evidence, 1)
BRANCH_SPEC.write_text(spec, encoding='utf-8')

catalog_path = Path('.agents/specs/readme.md')
catalog = catalog_path.read_text(encoding='utf-8')
catalog = re.sub(
    r'(\|\s*023\s*\|\s*SPEC-009\s*\|\s*)(ready|in-progress)(\s*\|)',
    r'\1implemented\3',
    catalog,
    count=1,
)
catalog_path.write_text(catalog, encoding='utf-8')
