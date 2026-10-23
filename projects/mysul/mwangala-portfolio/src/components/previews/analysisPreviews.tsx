import {
  PBar,
  PCard,
  PChip,
  PColumns,
  PLine,
  PRowLines,
  PSeries,
  PStack,
  PTable,
  PText,
  PreviewFrame,
} from './primitives';

const PREVIEW_LABEL = 'Representative preview';

/* --------------------------------------------------------------- PhishLens */

export function PhishLensPreview({ title }: { title: string }) {
  const findings = [
    { label: 'Reply-To differs from From domain', severity: 'High', weight: 0.92, tone: 'danger' as const },
    { label: 'Display text hides a different href', severity: 'Med', weight: 0.68, tone: 'warning' as const },
    { label: 'Urgency + payment request language', severity: 'Med', weight: 0.54, tone: 'warning' as const },
    { label: 'Look-alike brand token in hostname', severity: 'High', weight: 0.86, tone: 'danger' as const },
    { label: 'No DMARC result present', severity: 'Info', weight: 0.22, tone: 'info' as const },
  ];

  return (
    <PreviewFrame accent="cyan" title={title} label={PREVIEW_LABEL}>
      {/* Left: submission + header evidence */}
      <PCard x={16} y={50} w={300} h={434} />
      <PText x={32} y={76} size={12} weight={600} fill="var(--tw-fg)">
        Submitted message
      </PText>
      <PChip x={228} y={64} w={72} label=".eml parsed" tone="accent" />

      <rect x={32} y={92} width={268} height={128} rx="6" fill="var(--tw-sunken)" />
      <PText x={44} y={112} size={9} mono fill="var(--tw-fg-subtle)">
        From: billing@accounts-secure-pay.top
      </PText>
      <PText x={44} y={130} size={9} mono fill="var(--tw-fg-subtle)">
        Reply-To: invoices@maildrop.cc
      </PText>
      <PText x={44} y={148} size={9} mono fill="var(--tw-fg-subtle)">
        Subject: Final notice — action required
      </PText>
      <PText x={44} y={166} size={9} mono fill="var(--tw-fg-subtle)">
        Auth-Results: spf=none dkim=none
      </PText>
      <line x1={44} y1={180} x2={288} y2={180} stroke="var(--tw-line)" />
      <PText x={44} y={198} size={9} mono fill="var(--prj)">
        href: http://secure.pay-verify.top/login
      </PText>
      <PText x={44} y={212} size={8.5} mono fill="var(--tw-fg-subtle)">
        text: https://bank.example.com
      </PText>

      <PText x={32} y={246} size={10} weight={600} fill="var(--tw-fg)">
        Authentication evidence
      </PText>
      {[
        { name: 'SPF', state: 'not present', tone: 'neutral' as const },
        { name: 'DKIM', state: 'not present', tone: 'neutral' as const },
        { name: 'DMARC', state: 'fail', tone: 'danger' as const },
      ].map((row, index) => (
        <g key={row.name}>
          <rect x={32} y={258 + index * 30} width={268} height={24} rx="6" fill="var(--tw-surface)" stroke="var(--tw-line)" />
          <PText x={44} y={274 + index * 30} size={9.5} mono fill="var(--tw-fg)">
            {row.name}
          </PText>
          <PChip x={216} y={262 + index * 30} w={72} label={row.state} tone={row.tone} />
        </g>
      ))}
      <PText x={32} y={368} size={8.5} fill="var(--tw-fg-subtle)">
        Missing evidence is reported separately from failed evidence.
      </PText>

      <rect x={32} y={384} width={268} height={84} rx="6" fill="var(--tw-surface)" stroke="var(--tw-line)" />
      <PText x={44} y={406} size={10} weight={600} fill="var(--tw-fg)">
        Recommended actions
      </PText>
      <PRowLines x={44} y={420} widths={[230, 208, 176]} gap={12} />

      {/* Right: classification + findings */}
      <PCard x={332} y={50} w={452} h={434} />
      <rect x={332} y={50} width={452} height={70} rx={8} fill="var(--tw-danger-soft)" />
      <rect x={332} y={112} width={452} height={8} fill="var(--tw-surface)" />
      <PText x={352} y={78} size={11} mono fill="var(--tw-danger)" letterSpacing={0.8}>
        RISK CLASSIFICATION
      </PText>
      <PText x={352} y={104} size={20} weight={700} fill="var(--tw-danger)">
        High — 4 indicators, 2 high severity
      </PText>
      <PChip x={686} y={70} w={80} label="needs review" tone="warning" />

      <PText x={352} y={146} size={10} weight={600} fill="var(--tw-fg)">
        Indicators supporting this classification
      </PText>

      {findings.map((finding, index) => {
        const y = 158 + index * 62;
        return (
          <g key={finding.label}>
            <rect x={352} y={y} width={412} height={54} rx="7" fill="var(--tw-surface)" stroke="var(--tw-line)" />
            <rect x={352} y={y} width={3} height={54} rx={1.5} fill={finding.tone === 'danger' ? 'var(--tw-danger)' : finding.tone === 'warning' ? 'var(--tw-warning)' : 'var(--tw-info)'} />
            <PText x={368} y={y + 19} size={10} weight={600} fill="var(--tw-fg)">
              {finding.label}
            </PText>
            <PLine x={368} y={y + 28} w={252} h={4} opacity={0.5} />
            <PLine x={368} y={y + 37} w={196} h={4} opacity={0.35} />
            <PText x={700} y={y + 19} size={8.5} mono fill="var(--tw-fg-subtle)" anchor="end">
              {finding.severity}
            </PText>
            <PBar x={640} y={y + 32} w={92} h={6} value={finding.weight} color={finding.tone === 'danger' ? 'var(--tw-danger)' : 'var(--tw-warning)'} />
          </g>
        );
      })}
    </PreviewFrame>
  );
}

/* ----------------------------------------------------------------- NetScope */

export function NetScopePreview({ title }: { title: string }) {
  const volume = [12, 18, 15, 26, 34, 29, 48, 62, 44, 38, 30, 24, 28, 22, 17, 14];
  const protocols = [
    { name: 'TCP', share: 0.58, packets: '118,402' },
    { name: 'UDP', share: 0.21, packets: '42,771' },
    { name: 'DNS', share: 0.12, packets: '24,388' },
    { name: 'ICMP', share: 0.06, packets: '12,204' },
    { name: 'Other', share: 0.03, packets: '6,110' },
  ];

  return (
    <PreviewFrame accent="blue" title={title} label={PREVIEW_LABEL}>
      {/* Top stat strip */}
      {[
        { label: 'PACKETS', value: '203,875' },
        { label: 'DURATION', value: '00:14:22' },
        { label: 'ENDPOINTS', value: '1,482' },
        { label: 'CONVERSATIONS', value: '3,906' },
      ].map((stat, index) => (
        <g key={stat.label}>
          <PCard x={16 + index * 194} y={50} w={182} h={54} />
          <PText x={30 + index * 194} y={70} size={8.5} mono fill="var(--tw-fg-subtle)" letterSpacing={0.8}>
            {stat.label}
          </PText>
          <PText x={30 + index * 194} y={92} size={16} weight={700} fill="var(--tw-fg)">
            {stat.value}
          </PText>
        </g>
      ))}

      {/* Volume chart */}
      <PCard x={16} y={114} w={470} h={164} />
      <PText x={32} y={138} size={11} weight={600} fill="var(--tw-fg)">
        Traffic volume over time
      </PText>
      <PChip x={386} y={126} w={84} label="bytes / sec" tone="neutral" />
      <PSeries x={36} y={152} w={430} h={100} values={volume} color="var(--prj)" />
      <PText x={36} y={268} size={8.5} mono fill="var(--tw-fg-subtle)">
        00:00
      </PText>
      <PText x={466} y={268} size={8.5} mono fill="var(--tw-fg-subtle)" anchor="end">
        14:22
      </PText>

      {/* Protocol distribution */}
      <PCard x={498} y={114} w={286} h={164} />
      <PText x={514} y={138} size={11} weight={600} fill="var(--tw-fg)">
        Protocol distribution
      </PText>
      {protocols.map((protocol, index) => (
        <g key={protocol.name}>
          <PText x={514} y={160 + index * 22} size={9.5} mono fill="var(--tw-fg)">
            {protocol.name}
          </PText>
          <PBar x={558} y={153 + index * 22} w={140} h={7} value={protocol.share} color="var(--prj)" />
          <PText x={770} y={160 + index * 22} size={8.5} mono fill="var(--tw-fg-subtle)" anchor="end">
            {protocol.packets}
          </PText>
        </g>
      ))}

      {/* Filters */}
      <PCard x={16} y={288} w={768} h={40} />
      {['protocol: tcp', 'dst port: 443', 'addr: 10.0.0.0/8', 'flags: SYN', 'size > 1400'].map((filter, index) => (
        <PChip key={filter} x={30 + index * 116} y={300} w={108} label={filter} tone={index < 2 ? 'accent' : 'neutral'} />
      ))}
      <PText x={770} y={312} size={9} mono fill="var(--prj)" anchor="end">
        4,182 matches
      </PText>

      {/* Packet table */}
      <PCard x={16} y={338} w={470} h={146} />
      <PTable
        x={30}
        y={352}
        w={442}
        rowHeight={26}
        columns={[
          { label: 'TIME', width: 0.18 },
          { label: 'SOURCE', width: 0.28 },
          { label: 'DEST', width: 0.28 },
          { label: 'PROTO', width: 0.26 },
        ]}
        rows={[
          [
            { kind: 'text', value: '0.4182', mono: true },
            { kind: 'text', value: '10.20.4.11', mono: true },
            { kind: 'text', value: '93.184.216.34', mono: true },
            { kind: 'chip', label: 'TCP 443', tone: 'accent' },
          ],
          [
            { kind: 'text', value: '0.4196', mono: true },
            { kind: 'text', value: '10.20.4.11', mono: true },
            { kind: 'text', value: '10.20.4.2', mono: true },
            { kind: 'chip', label: 'UDP 53', tone: 'neutral' },
          ],
          [
            { kind: 'text', value: '1.2044', mono: true },
            { kind: 'text', value: '172.16.9.40', mono: true },
            { kind: 'text', value: '10.20.4.11', mono: true },
            { kind: 'chip', label: 'ICMP', tone: 'warning' },
          ],
          [
            { kind: 'text', value: '2.8810', mono: true },
            { kind: 'text', value: '10.20.4.11', mono: true },
            { kind: 'text', value: '185.220.101.7', mono: true },
            { kind: 'chip', label: 'TCP 21', tone: 'danger' },
          ],
        ]}
      />

      {/* Indicators */}
      <PCard x={498} y={338} w={286} h={146} />
      <PText x={514} y={360} size={11} weight={600} fill="var(--tw-fg)">
        Potential indicators
      </PText>
      <PChip x={712} y={348} w={58} label="3 rules" tone="warning" />
      {[
        { rule: 'port fan-out', detail: '1 host → 42 ports', tone: 'warning' as const },
        { rule: 'cleartext creds', detail: 'FTP USER observed', tone: 'danger' as const },
        { rule: 'icmp volume', detail: '12k packets / 14 min', tone: 'info' as const },
      ].map((indicator, index) => (
        <g key={indicator.rule}>
          <rect x={514} y={372 + index * 34} width={254} height={28} rx="6" fill="var(--tw-surface)" stroke="var(--tw-line)" />
          <circle cx={526} cy={386 + index * 34} r="3" fill={indicator.tone === 'danger' ? 'var(--tw-danger)' : indicator.tone === 'warning' ? 'var(--tw-warning)' : 'var(--tw-info)'} />
          <PText x={536} y={383 + index * 34} size={9.5} weight={600} fill="var(--tw-fg)">
            {indicator.rule}
          </PText>
          <PText x={536} y={394 + index * 34} size={8.5} mono fill="var(--tw-fg-subtle)">
            {indicator.detail}
          </PText>
        </g>
      ))}
    </PreviewFrame>
  );
}

/* --------------------------------------------------------- SecureCode WB --- */

export function SecureCodePreview({ title }: { title: string }) {
  return (
    <PreviewFrame accent="rose" title={title} label={PREVIEW_LABEL}>
      {/* Header summary */}
      <PCard x={16} y={50} w={768} h={76} />
      <PText x={32} y={74} size={12} weight={600} fill="var(--tw-fg)">
        payments-api · scan #14
      </PText>
      <PChip x={204} y={62} w={92} label="python · bandit" tone="accent" />
      <PChip x={304} y={62} w={96} label="secrets scan" tone="accent" />
      <PText x={32} y={94} size={9} fill="var(--tw-fg-subtle)">
        Findings are pattern matches for review — not verified vulnerabilities.
      </PText>
      <PStack
        x={32}
        y={104}
        w={400}
        h={9}
        segments={[
          { value: 6, color: 'var(--tw-danger)' },
          { value: 14, color: 'var(--tw-warning)' },
          { value: 31, color: 'var(--tw-info)' },
          { value: 12, color: 'var(--tw-line-strong)' },
        ]}
      />
      <PText x={446} y={112} size={9} mono fill="var(--tw-fg-muted)">
        6 high · 14 med · 31 low · 12 resolved
      </PText>
      <PColumns x={666} y={64} w={102} h={44} values={[3, 6, 4, 9, 7, 12, 8]} color="var(--prj)" />

      {/* Findings table */}
      <PCard x={16} y={136} w={470} h={354} />
      <PText x={32} y={160} size={11} weight={600} fill="var(--tw-fg)">
        Findings
      </PText>
      <PChip x={392} y={148} w={78} label="severity ↓" tone="neutral" />
      <PTable
        x={32}
        y={172}
        w={438}
        rowHeight={34}
        columns={[
          { label: 'RULE', width: 0.3 },
          { label: 'LOCATION', width: 0.44 },
          { label: 'STATUS', width: 0.26 },
        ]}
        rows={[
          [
            { kind: 'text', value: 'B105', mono: true },
            { kind: 'text', value: 'services/db.py:41', mono: true },
            { kind: 'chip', label: 'open', tone: 'danger' },
          ],
          [
            { kind: 'text', value: 'B602', mono: true },
            { kind: 'text', value: 'tasks/import.py:88', mono: true },
            { kind: 'chip', label: 'in review', tone: 'warning' },
          ],
          [
            { kind: 'text', value: 'B506', mono: true },
            { kind: 'text', value: 'api/loader.py:23', mono: true },
            { kind: 'chip', label: 'open', tone: 'danger' },
          ],
          [
            { kind: 'text', value: 'B108', mono: true },
            { kind: 'text', value: 'utils/tmp.py:12', mono: true },
            { kind: 'chip', label: 'fixed', tone: 'success' },
          ],
          [
            { kind: 'text', value: 'B310', mono: true },
            { kind: 'text', value: 'clients/fetch.py:57', mono: true },
            { kind: 'chip', label: 'false pos.', tone: 'neutral' },
          ],
          [
            { kind: 'text', value: 'B501', mono: true },
            { kind: 'text', value: 'config/tls.py:9', mono: true },
            { kind: 'chip', label: 'accepted', tone: 'info' },
          ],
          [
            { kind: 'text', value: 'B201', mono: true },
            { kind: 'text', value: 'app/debug.py:4', mono: true },
            { kind: 'chip', label: 'fixed', tone: 'success' },
          ],
          [
            { kind: 'text', value: 'secret', mono: true },
            { kind: 'text', value: 'settings/prod.py:66', mono: true },
            { kind: 'chip', label: 'open', tone: 'danger' },
          ],
        ]}
      />

      {/* Code detail */}
      <PCard x={498} y={136} w={286} h={348} />
      <PText x={514} y={160} size={11} weight={600} fill="var(--tw-fg)">
        B105 · hardcoded_password
      </PText>
      <PChip x={514} y={170} w={70} label="high conf." tone="danger" />
      <rect x={514} y={196} width={254} height={108} rx="6" fill="var(--tw-sunken)" />
      <PText x={526} y={216} size={9} mono fill="var(--tw-fg-subtle)">
        services/db.py:41
      </PText>
      <PText x={526} y={236} size={9} mono fill="var(--tw-fg)">
        DB_PASS = &quot;••••••••••••&quot;
      </PText>
      <PText x={526} y={254} size={8.5} mono fill="var(--tw-fg-subtle)">
        # evidence masked at parse time
      </PText>
      <PText x={526} y={276} size={9} mono fill="var(--tw-success)">
        + DB_PASS = os.environ[...]
      </PText>
      <PText x={526} y={294} size={9} mono fill="var(--tw-danger)">
        - hardcoded literal
      </PText>

      <PText x={514} y={330} size={10} weight={600} fill="var(--tw-fg)">
        Remediation
      </PText>
      <PRowLines x={514} y={342} widths={[238, 214, 186]} gap={11} />

      <PText x={514} y={400} size={10} weight={600} fill="var(--tw-fg)">
        Review
      </PText>
      {['Open', 'In review', 'Fixed', 'Accepted risk', 'False positive'].map((state, index) => (
        <PChip
          key={state}
          x={514 + (index % 3) * 86}
          y={412 + Math.floor(index / 3) * 24}
          w={80}
          label={state}
          tone={index === 0 ? 'accent' : 'neutral'}
        />
      ))}
      <PText x={514} y={474} size={8.5} fill="var(--tw-fg-subtle)">
        Fingerprinted across scans — history and status persist.
      </PText>
    </PreviewFrame>
  );
}
