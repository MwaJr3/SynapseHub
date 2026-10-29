import {
  PBar,
  PCard,
  PChip,
  PColumns,
  PDonut,
  PLine,
  PRowLines,
  PStack,
  PTable,
  PText,
  PreviewFrame,
} from './primitives';

const PREVIEW_LABEL = 'Representative preview';

/* ------------------------------------------------------------ ThreatIntel --- */

export function ThreatIntelPreview({ title }: { title: string }) {
  const sources = [
    { name: 'community-domains', state: 'healthy', added: '+412', tone: 'success' as const },
    { name: 'stix-bundle-a', state: 'healthy', added: '+88', tone: 'success' as const },
    { name: 'commercial-feed', state: 'rate limited', added: '+0', tone: 'warning' as const },
    { name: 'abuse-list', state: '2 failures', added: '—', tone: 'danger' as const },
  ];

  return (
    <PreviewFrame accent="violet" title={title} label={PREVIEW_LABEL}>
      {/* Source health */}
      {sources.map((source, index) => (
        <g key={source.name}>
          <PCard x={16 + index * 194} y={50} w={182} h={62} />
          <PText x={30 + index * 194} y={70} size={9.5} weight={600} fill="var(--tw-fg)">
            {source.name}
          </PText>
          <PChip x={30 + index * 194} y={80} w={80} label={source.state} tone={source.tone} />
          <PText x={184 + index * 194} y={92} size={9} mono fill="var(--tw-fg-subtle)" anchor="end">
            {source.added}
          </PText>
          <PText x={30 + index * 194} y={104} size={8} mono fill="var(--tw-fg-subtle)">
            last run 4m ago
          </PText>
        </g>
      ))}

      {/* Indicator table */}
      <PCard x={16} y={124} w={500} h={360} />
      <PText x={32} y={148} size={11} weight={600} fill="var(--tw-fg)">
        Indicators
      </PText>
      <PChip x={328} y={136} w={64} label="type: all" tone="neutral" />
      <PChip x={398} y={136} w={52} label="conf ≥" tone="accent" />
      <PChip x={456} y={136} w={46} label="sort" tone="neutral" />
      <PTable
        x={32}
        y={160}
        w={468}
        rowHeight={34}
        columns={[
          { label: 'VALUE', width: 0.4 },
          { label: 'TYPE', width: 0.18 },
          { label: 'SOURCES', width: 0.18 },
          { label: 'STATUS', width: 0.24 },
        ]}
        rows={[
          [
            { kind: 'text', value: 'auth-secure-login.top', mono: true },
            { kind: 'chip', label: 'domain' },
            { kind: 'text', value: '3', mono: true },
            { kind: 'chip', label: 'investigating', tone: 'warning' },
          ],
          [
            { kind: 'text', value: '185.220.101.7', mono: true },
            { kind: 'chip', label: 'ipv4' },
            { kind: 'text', value: '4', mono: true },
            { kind: 'chip', label: 'confirmed', tone: 'danger' },
          ],
          [
            { kind: 'text', value: 'a91f…c4d2 (sha256)', mono: true },
            { kind: 'chip', label: 'hash' },
            { kind: 'text', value: '1', mono: true },
            { kind: 'chip', label: 'new', tone: 'info' },
          ],
          [
            { kind: 'text', value: 'cdn-static-assets.com', mono: true },
            { kind: 'chip', label: 'domain' },
            { kind: 'text', value: '2', mono: true },
            { kind: 'chip', label: 'conflicting', tone: 'warning' },
          ],
          [
            { kind: 'text', value: 'hxxp://pay.verify-now.cc', mono: true },
            { kind: 'chip', label: 'url' },
            { kind: 'text', value: '2', mono: true },
            { kind: 'chip', label: 'rejected', tone: 'neutral' },
          ],
          [
            { kind: 'text', value: '10.0.0.0/8', mono: true },
            { kind: 'chip', label: 'cidr' },
            { kind: 'text', value: '1', mono: true },
            { kind: 'chip', label: 'expired', tone: 'neutral' },
          ],
          [
            { kind: 'text', value: 'billing@invoice-drop.cc', mono: true },
            { kind: 'chip', label: 'email' },
            { kind: 'text', value: '1', mono: true },
            { kind: 'chip', label: 'new', tone: 'info' },
          ],
          [
            { kind: 'text', value: '45.13.204.88', mono: true },
            { kind: 'chip', label: 'ipv4' },
            { kind: 'text', value: '5', mono: true },
            { kind: 'chip', label: 'confirmed', tone: 'danger' },
          ],
        ]}
      />
      <PText x={32} y={470} size={8.5} fill="var(--tw-fg-subtle)">
        Presence in a feed is a claim from that feed — not an established fact.
      </PText>

      {/* Profile panel */}
      <PCard x={528} y={124} w={256} h={360} />
      <PText x={544} y={148} size={11} weight={600} fill="var(--tw-fg)">
        185.220.101.7
      </PText>
      <PChip x={544} y={158} w={70} label="ipv4-addr" tone="accent" />
      <PChip x={620} y={158} w={86} label="confirmed" tone="danger" />

      <PText x={544} y={196} size={9.5} weight={600} fill="var(--tw-fg)">
        Reported by
      </PText>
      {[
        { source: 'community-domains', when: '2026-10-02', conf: 0.8 },
        { source: 'stix-bundle-a', when: '2026-09-28', conf: 0.62 },
        { source: 'commercial-feed', when: '2026-09-14', conf: 0.9 },
        { source: 'abuse-list', when: '2026-08-30', conf: 0.44 },
      ].map((observation, index) => (
        <g key={observation.source}>
          <PText x={544} y={214 + index * 26} size={9} mono fill="var(--tw-fg)">
            {observation.source}
          </PText>
          <PBar x={544} y={220 + index * 26} w={120} h={5} value={observation.conf} color="var(--prj)" />
          <PText x={768} y={214 + index * 26} size={8} mono fill="var(--tw-fg-subtle)" anchor="end">
            {observation.when}
          </PText>
        </g>
      ))}

      <PText x={544} y={330} size={9.5} weight={600} fill="var(--tw-fg)">
        Related indicators
      </PText>
      <PRowLines x={544} y={340} widths={[210, 178]} gap={12} />

      <rect x={544} y={372} width={224} height={96} rx="6" fill="var(--tw-sunken)" />
      <PText x={556} y={392} size={9} weight={600} fill="var(--tw-fg)">
        Analyst note
      </PText>
      <PText x={556} y={410} size={8.5} fill="var(--tw-fg-muted)">
        Seen in netflow on 3 hosts; two sources
      </PText>
      <PText x={556} y={424} size={8.5} fill="var(--tw-fg-muted)">
        disagree on confidence. Blocking pending
      </PText>
      <PText x={556} y={438} size={8.5} fill="var(--tw-fg-muted)">
        confirmation from the SOC lead.
      </PText>
      <PText x={556} y={458} size={8} mono fill="var(--tw-fg-subtle)">
        first seen 2026-08-30 · valid until 2027-01-14
      </PText>
    </PreviewFrame>
  );
}

/* ------------------------------------------------------------- IncidentFlow */

export function IncidentFlowPreview({ title }: { title: string }) {
  return (
    <PreviewFrame accent="amber" title={title} label={PREVIEW_LABEL}>
      {/* KPI strip */}
      {[
        { label: 'OPEN', value: '7' },
        { label: 'CRITICAL', value: '2' },
        { label: 'MEAN CONTAIN', value: '3h 12m' },
        { label: 'UNASSIGNED', value: '1' },
      ].map((stat, index) => (
        <g key={stat.label}>
          <PCard x={16 + index * 148} y={50} w={138} h={54} />
          <PText x={28 + index * 148} y={70} size={8} mono fill="var(--tw-fg-subtle)" letterSpacing={0.8}>
            {stat.label}
          </PText>
          <PText x={28 + index * 148} y={92} size={17} weight={700} fill="var(--tw-fg)">
            {stat.value}
          </PText>
        </g>
      ))}

      {/* Severity donut + volume */}
      <PCard x={612} y={50} w={172} h={54} />
      <PColumns x={628} y={62} w={140} h={30} values={[2, 5, 8, 6, 11, 7, 4]} color="var(--prj)" />

      <PCard x={16} y={114} w={286} h={170} />
      <PText x={32} y={138} size={11} weight={600} fill="var(--tw-fg)">
        Severity distribution
      </PText>
      <PDonut
        cx={92}
        cy={212}
        r={38}
        centerLabel="18"
        centerSub="incidents"
        segments={[
          { value: 2, color: 'var(--tw-danger)' },
          { value: 5, color: 'var(--tw-warning)' },
          { value: 8, color: 'var(--tw-info)' },
          { value: 3, color: 'var(--tw-line-strong)' },
        ]}
      />
      {[
        { label: 'Critical', value: 2, color: 'var(--tw-danger)' },
        { label: 'High', value: 5, color: 'var(--tw-warning)' },
        { label: 'Medium', value: 8, color: 'var(--tw-info)' },
        { label: 'Low', value: 3, color: 'var(--tw-line-strong)' },
      ].map((item, index) => (
        <g key={item.label}>
          <rect x={168} y={164 + index * 24} width={8} height={8} rx={2} fill={item.color} />
          <PText x={184} y={172 + index * 24} size={9.5} fill="var(--tw-fg-muted)">
            {item.label}
          </PText>
          <PText x={286} y={172 + index * 24} size={9.5} mono fill="var(--tw-fg)" anchor="end">
            {item.value}
          </PText>
        </g>
      ))}

      {/* Incident table */}
      <PCard x={312} y={114} w={472} h={170} />
      <PText x={328} y={138} size={11} weight={600} fill="var(--tw-fg)">
        Active incidents
      </PText>
      <PChip x={688} y={126} w={80} label="status: open" tone="accent" />
      <PTable
        x={328}
        y={150}
        w={440}
        rowHeight={26}
        columns={[
          { label: 'ID', width: 0.14 },
          { label: 'TITLE', width: 0.42 },
          { label: 'OWNER', width: 0.2 },
          { label: 'STATUS', width: 0.24 },
        ]}
        rows={[
          [
            { kind: 'text', value: 'INC-142', mono: true },
            { kind: 'lines', widths: [150] },
            { kind: 'lines', widths: [52] },
            { kind: 'chip', label: 'investigating', tone: 'warning' },
          ],
          [
            { kind: 'text', value: 'INC-141', mono: true },
            { kind: 'lines', widths: [132] },
            { kind: 'lines', widths: [46] },
            { kind: 'chip', label: 'contained', tone: 'info' },
          ],
          [
            { kind: 'text', value: 'INC-140', mono: true },
            { kind: 'lines', widths: [160] },
            { kind: 'lines', widths: [58] },
            { kind: 'chip', label: 'recovering', tone: 'accent' },
          ],
          [
            { kind: 'text', value: 'INC-139', mono: true },
            { kind: 'lines', widths: [118] },
            { kind: 'lines', widths: [40] },
            { kind: 'chip', label: 'new', tone: 'danger' },
          ],
        ]}
      />

      {/* Timeline */}
      <PCard x={16} y={294} w={472} h={190} />
      <PText x={32} y={318} size={11} weight={600} fill="var(--tw-fg)">
        INC-142 · timeline
      </PText>
      <PChip x={398} y={306} w={74} label="append-only" tone="neutral" />
      <line x1={44} y1={334} x2={44} y2={466} stroke="var(--tw-line)" strokeWidth="1.5" />
      {[
        { time: '09:12', text: 'Reported by mail gateway alert', tone: 'var(--tw-info)' },
        { time: '09:20', text: 'Status → Investigating · assigned to analyst', tone: 'var(--prj)' },
        { time: '09:41', text: 'Observation: 3 users received the same message', tone: 'var(--tw-fg-subtle)' },
        { time: '10:05', text: 'Task completed: mailbox rule audit', tone: 'var(--tw-success)' },
        { time: '10:38', text: 'Status → Contained · sender blocked at gateway', tone: 'var(--tw-warning)' },
      ].map((event, index) => (
        <g key={event.time}>
          <circle cx={44} cy={340 + index * 30} r="4.5" fill={event.tone} />
          <PText x={60} y={337 + index * 30} size={8.5} mono fill="var(--tw-fg-subtle)">
            {event.time}
          </PText>
          <PText x={104} y={337 + index * 30} size={9.5} fill="var(--tw-fg)">
            {event.text}
          </PText>
          <PLine x={104} y={344 + index * 30} w={index % 2 === 0 ? 200 : 150} h={3.5} opacity={0.28} />
        </g>
      ))}

      {/* Tasks */}
      <PCard x={498} y={294} w={286} h={190} />
      <PText x={514} y={318} size={11} weight={600} fill="var(--tw-fg)">
        Response tasks
      </PText>
      <PText x={768} y={318} size={9} mono fill="var(--tw-fg-subtle)" anchor="end">
        3 / 5 done
      </PText>
      {[
        { task: 'Preserve message headers', done: true },
        { task: 'Check for forwarding rules', done: true },
        { task: 'Reset credentials for affected users', done: true },
        { task: 'Review sign-in logs, 72h window', done: false },
        { task: 'Draft lessons-learned summary', done: false },
      ].map((task, index) => (
        <g key={task.task}>
          <rect
            x={514}
            y={332 + index * 26}
            width={12}
            height={12}
            rx={3}
            fill={task.done ? 'var(--tw-success)' : 'var(--tw-surface)'}
            stroke={task.done ? 'var(--tw-success)' : 'var(--tw-line-strong)'}
          />
          <PText
            x={534}
            y={342 + index * 26}
            size={9.5}
            fill={task.done ? 'var(--tw-fg-subtle)' : 'var(--tw-fg)'}
          >
            {task.task}
          </PText>
          {task.done ? <PLine x={534} y={338 + index * 26} w={task.task.length * 4.6} h={1.5} opacity={0.5} /> : null}
        </g>
      ))}
      <PText x={514} y={472} size={8.5} fill="var(--tw-fg-subtle)">
        Resolved requires findings and no open critical tasks.
      </PText>
    </PreviewFrame>
  );
}

/* ---------------------------------------------------------------- HashSight */

export function HashSightPreview({ title }: { title: string }) {
  return (
    <PreviewFrame accent="teal" title={title} label={PREVIEW_LABEL}>
      {/* File summary */}
      <PCard x={16} y={50} w={768} h={96} />
      <PText x={32} y={74} size={12} weight={600} fill="var(--tw-fg)">
        invoice_Q3_final.pdf.exe
      </PText>
      <PChip x={248} y={62} w={92} label="2.41 MB · PE" tone="neutral" />
      <PChip x={348} y={62} w={132} label="hashed locally" tone="accent" />
      <PText x={32} y={98} size={9} mono fill="var(--tw-fg-subtle)">
        SHA-256
      </PText>
      <PText x={32} y={116} size={10.5} mono fill="var(--tw-fg)">
        9f2c41ab77e0d5c88b3f6a1e0d4c9b27f8a31e6d5c4b7a90e2f1d8c6b4a37e10
      </PText>
      <rect x={640} y={100} width={60} height={22} rx={6} fill="var(--tw-sunken)" stroke="var(--tw-line)" />
      <PText x={670} y={115} size={9} mono fill="var(--tw-fg-muted)" anchor="middle">
        copy
      </PText>
      <rect x={708} y={100} width={60} height={22} rx={6} fill="var(--tw-sunken)" stroke="var(--tw-line)" />
      <PText x={738} y={115} size={9} mono fill="var(--tw-fg-muted)" anchor="middle">
        case
      </PText>
      <PText x={32} y={136} size={8.5} fill="var(--tw-fg-subtle)">
        SHA-1 and MD5 available for compatibility — neither is collision resistant.
      </PText>

      {/* Provider results */}
      <PCard x={16} y={158} w={500} h={214} />
      <PText x={32} y={182} size={11} weight={600} fill="var(--tw-fg)">
        Reputation lookups
      </PText>
      <PChip x={404} y={170} w={96} label="3 providers" tone="neutral" />
      {[
        { provider: 'provider-a', state: 'known malicious', detail: '41 / 72 detections · 2026-10-11 08:14', tone: 'danger' as const },
        { provider: 'provider-b', state: 'no known detection', detail: '0 / 68 detections · 2026-10-11 08:14', tone: 'warning' as const },
        { provider: 'provider-c', state: 'unknown', detail: 'never seen by this provider', tone: 'info' as const },
        { provider: 'provider-d', state: 'unavailable', detail: 'rate limited (HTTP 429) · retry in 42s', tone: 'neutral' as const },
      ].map((result, index) => (
        <g key={result.provider}>
          <rect x={32} y={194 + index * 42} width={468} height={36} rx="7" fill="var(--tw-surface)" stroke="var(--tw-line)" />
          <PText x={46} y={210 + index * 42} size={9.5} mono fill="var(--tw-fg)">
            {result.provider}
          </PText>
          <PText x={46} y={223 + index * 42} size={8.5} fill="var(--tw-fg-subtle)">
            {result.detail}
          </PText>
          <PChip x={368} y={204 + index * 42} w={120} label={result.state} tone={result.tone} />
        </g>
      ))}
      <PText x={32} y={362} size={8.5} fill="var(--tw-warning)">
        Providers disagree — status shown as Conflicting, not resolved automatically.
      </PText>

      {/* Interpretation panel */}
      <rect x={528} y={158} width={256} height={214} rx={8} fill="var(--prj-soft)" stroke="var(--prj-line)" />
      <PText x={544} y={182} size={10.5} weight={700} fill="var(--prj)">
        Overall: Conflicting results
      </PText>
      <PText x={544} y={204} size={9} fill="var(--tw-fg-muted)">
        What this does not tell you:
      </PText>
      {[
        'a hash matches one exact byte sequence',
        '"no detection" is not evidence of safety',
        'reputation is a snapshot in time',
        'coverage varies by provider',
      ].map((line, index) => (
        <g key={line}>
          <circle cx={548} cy={222 + index * 22} r="2.5" fill="var(--prj)" />
          <PText x={558} y={225 + index * 22} size={8.8} fill="var(--tw-fg-muted)">
            {line}
          </PText>
        </g>
      ))}
      <PText x={544} y={330} size={8.5} mono fill="var(--tw-fg-subtle)">
        Only the digest was sent — never the file.
      </PText>
      <PText x={544} y={348} size={8.5} mono fill="var(--tw-fg-subtle)">
        Lookup consent recorded on the case.
      </PText>

      {/* History */}
      <PCard x={16} y={382} w={768} h={102} />
      <PText x={32} y={406} size={11} weight={600} fill="var(--tw-fg)">
        Lookup history — 9f2c41ab…
      </PText>
      <PTable
        x={32}
        y={416}
        w={736}
        rowHeight={24}
        columns={[
          { label: 'WHEN', width: 0.22 },
          { label: 'PROVIDER', width: 0.2 },
          { label: 'RESULT', width: 0.3 },
          { label: 'DISPOSITION', width: 0.28 },
        ]}
        rows={[
          [
            { kind: 'text', value: '2026-10-11 08:14', mono: true },
            { kind: 'text', value: 'provider-a', mono: true },
            { kind: 'chip', label: 'known malicious', tone: 'danger' },
            { kind: 'chip', label: 'escalated', tone: 'warning' },
          ],
          [
            { kind: 'text', value: '2026-09-28 16:02', mono: true },
            { kind: 'text', value: 'provider-b', mono: true },
            { kind: 'chip', label: 'unknown', tone: 'info' },
            { kind: 'chip', label: 'monitoring', tone: 'neutral' },
          ],
        ]}
      />
    </PreviewFrame>
  );
}

/* --------------------------------------------------------------- AssetWatch */

export function AssetWatchPreview({ title }: { title: string }) {
  return (
    <PreviewFrame accent="indigo" title={title} label={PREVIEW_LABEL}>
      {/* Summary */}
      {[
        { label: 'ASSETS', value: '46' },
        { label: 'AUTHORIZED', value: '31' },
        { label: 'NEW SERVICES', value: '4' },
        { label: 'OPEN FINDINGS', value: '9' },
      ].map((stat, index) => (
        <g key={stat.label}>
          <PCard x={16 + index * 194} y={50} w={182} h={54} />
          <PText x={30 + index * 194} y={70} size={8} mono fill="var(--tw-fg-subtle)" letterSpacing={0.8}>
            {stat.label}
          </PText>
          <PText x={30 + index * 194} y={92} size={17} weight={700} fill={index === 2 ? 'var(--tw-danger)' : 'var(--tw-fg)'}>
            {stat.value}
          </PText>
        </g>
      ))}

      {/* Inventory */}
      <PCard x={16} y={114} w={470} h={230} />
      <PText x={32} y={138} size={11} weight={600} fill="var(--tw-fg)">
        Asset inventory
      </PText>
      <PChip x={32} y={146} w={112} label="env: production" tone="accent" />
      <PChip x={152} y={146} w={92} label="owner: all" tone="neutral" />
      <PTable
        x={32}
        y={172}
        w={438}
        rowHeight={30}
        columns={[
          { label: 'ASSET', width: 0.34 },
          { label: 'OWNER', width: 0.2 },
          { label: 'EXPOSURE', width: 0.22 },
          { label: 'STATUS', width: 0.24 },
        ]}
        rows={[
          [
            { kind: 'text', value: 'api-edge-01', mono: true },
            { kind: 'text', value: 'platform' },
            { kind: 'chip', label: 'internet', tone: 'danger' },
            { kind: 'chip', label: 'new service', tone: 'warning' },
          ],
          [
            { kind: 'text', value: 'db-primary', mono: true },
            { kind: 'text', value: 'data' },
            { kind: 'chip', label: 'internal', tone: 'neutral' },
            { kind: 'chip', label: 'ok', tone: 'success' },
          ],
          [
            { kind: 'text', value: 'mail-relay', mono: true },
            { kind: 'text', value: 'it-ops' },
            { kind: 'chip', label: 'internet', tone: 'danger' },
            { kind: 'chip', label: '2 findings', tone: 'warning' },
          ],
          [
            { kind: 'text', value: 'vpn-gw', mono: true },
            { kind: 'text', value: 'it-ops' },
            { kind: 'chip', label: 'internet', tone: 'danger' },
            { kind: 'chip', label: 'ok', tone: 'success' },
          ],
          [
            { kind: 'text', value: 'staging-web', mono: true },
            { kind: 'text', value: 'platform' },
            { kind: 'chip', label: 'internal', tone: 'neutral' },
            { kind: 'chip', label: 'scan failed', tone: 'info' },
          ],
        ]}
      />

      {/* Comparison */}
      <PCard x={498} y={114} w={286} h={230} />
      <PText x={514} y={138} size={11} weight={600} fill="var(--tw-fg)">
        api-edge-01 · run comparison
      </PText>
      <PChip x={514} y={148} w={128} label="2026-09-14 → 10-12" tone="neutral" />
      {[
        { port: '443/tcp', service: 'https', state: 'unchanged', tone: 'neutral' as const },
        { port: '22/tcp', service: 'ssh', state: 'unchanged', tone: 'neutral' as const },
        { port: '6379/tcp', service: 'redis', state: 'new', tone: 'danger' as const },
        { port: '9090/tcp', service: 'prometheus', state: 'new', tone: 'warning' as const },
        { port: '8080/tcp', service: 'http-alt', state: 'removed', tone: 'success' as const },
      ].map((row, index) => (
        <g key={row.port}>
          <rect x={514} y={176 + index * 30} width={254} height={24} rx="6" fill="var(--tw-surface)" stroke="var(--tw-line)" />
          <PText x={526} y={192 + index * 30} size={9} mono fill="var(--tw-fg)">
            {row.port}
          </PText>
          <PText x={596} y={192 + index * 30} size={9} fill="var(--tw-fg-muted)">
            {row.service}
          </PText>
          <PChip x={692} y={180 + index * 30} w={66} label={row.state} tone={row.tone} />
        </g>
      ))}
      <PText x={514} y={336} size={8.5} fill="var(--tw-fg-subtle)">
        Comparison refused when either run is incomplete.
      </PText>

      {/* Remediation */}
      <PCard x={16} y={354} w={470} h={130} />
      <PText x={32} y={378} size={11} weight={600} fill="var(--tw-fg)">
        Remediation
      </PText>
      <PStack
        x={32}
        y={390}
        w={438}
        h={8}
        segments={[
          { value: 4, color: 'var(--tw-danger)' },
          { value: 3, color: 'var(--tw-warning)' },
          { value: 6, color: 'var(--tw-success)' },
        ]}
      />
      <PText x={32} y={414} size={8.5} mono fill="var(--tw-fg-subtle)">
        4 open · 3 in progress · 6 closed
      </PText>
      <PTable
        x={32}
        y={424}
        w={438}
        rowHeight={24}
        columns={[
          { label: 'TASK', width: 0.5 },
          { label: 'OWNER', width: 0.22 },
          { label: 'AGE', width: 0.28 },
        ]}
        rows={[
          [
            { kind: 'text', value: 'Close redis on api-edge-01' },
            { kind: 'text', value: 'platform' },
            { kind: 'chip', label: '2 days', tone: 'danger' },
          ],
          [
            { kind: 'text', value: 'Confirm prometheus exposure' },
            { kind: 'text', value: 'observ.' },
            { kind: 'chip', label: '2 days', tone: 'warning' },
          ],
        ]}
      />

      {/* Authorization panel */}
      <PCard x={498} y={354} w={286} h={130} />
      <rect x={498} y={354} width={286} height={130} rx={8} fill="var(--tw-surface)" stroke="var(--tw-line)" />
      <PText x={514} y={378} size={11} weight={600} fill="var(--tw-fg)">
        Authorization boundary
      </PText>
      <PChip x={514} y={390} w={150} label="allowlist enforced" tone="accent" />
      {[
        '31 of 46 assets authorized',
        'port bounds per allowlist entry',
        'target revalidated before each run',
        'refusals written to the audit log',
      ].map((line, index) => (
        <g key={line}>
          <circle cx={518} cy={424 + index * 16} r="2.2" fill="var(--prj)" />
          <PText x={528} y={427 + index * 16} size={8.6} fill="var(--tw-fg-muted)">
            {line}
          </PText>
        </g>
      ))}
    </PreviewFrame>
  );
}
