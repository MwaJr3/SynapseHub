import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('netscope');

export const netScope: Project = {
  id: 'prj-netscope',
  slug: 'netscope',
  name: 'NetScope',
  tagline: 'Turn raw network traffic into understandable evidence.',
  summary:
    'A network-traffic analysis workbench that parses authorized packet captures and turns them into navigable protocol, endpoint and connection summaries.',
  description: [
    'NetScope helps users inspect authorized .pcap and .pcapng capture files and understand the protocols, endpoints, connections and traffic patterns inside them. A capture with two hundred thousand packets is not readable; a protocol breakdown, a conversation table and a filtered packet list are.',
    'The application is an offline analysis workbench. It processes files a user already has permission to examine. It does not sniff live interfaces, inject packets, intercept traffic, or interact with any external system.',
    'Unusual patterns are surfaced through transparent, configurable rules and are labelled as potential indicators. NetScope deliberately stops short of declaring an attack, because a burst of ICMP or an unfamiliar destination port is evidence to investigate, not a verdict.',
  ],
  categories: ['Network Analysis', 'Data Processing', 'Full-Stack Engineering'],
  filters: ['cybersecurity', 'network-analysis', 'full-stack', 'ai-data'],
  tech: [
    'Python',
    'FastAPI',
    'Scapy',
    'Pandas',
    'Pydantic',
    'SQLAlchemy',
    'Alembic',
    'PostgreSQL',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Recharts-style SVG charts',
    'pytest',
  ],
  keyTech: ['Python', 'FastAPI', 'Scapy', 'Pandas', 'React', 'PostgreSQL'],
  featured: true,
  order: 2,
  status: 'Built — offline capture analysis complete and tested as a dependency-free Python CLI in apps/netscope (stdlib pcap parsing), and delivered as the full-stack application described in this case study at projects/netscope (FastAPI + PostgreSQL-ready backend with Alembic migrations, React frontend, backend and frontend tests)',
  year: '2025',
  role: 'Design, parsing pipeline, analysis rules, frontend visualisation',
  accent: 'blue',
  capabilities: [
    'Streaming capture parsing with hard memory and packet-count limits',
    'Protocol, endpoint and conversation aggregation over large captures',
  ],
  features: [
    {
      title: 'Capture ingestion with real validation',
      body: 'Accepts .pcap and .pcapng uploads, checks the magic bytes rather than trusting the file extension, enforces a size limit, and rejects truncated or corrupt captures with a specific message. Parsing runs as a background job so the request does not block.',
    },
    {
      title: 'Packet metadata extraction',
      body: 'For each packet: timestamp, length, Ethernet type, IP version, source and destination address, transport protocol, ports, flags and the payload byte count. Payload content is not retained by default — NetScope stores metadata, not conversations.',
    },
    {
      title: 'Protocol and volume analysis',
      body: 'Protocol distribution by packet count and byte volume, traffic volume bucketed over time, and packet-size statistics that make bulk transfer visually distinct from chatty control traffic.',
    },
    {
      title: 'Endpoints and conversations',
      body: 'Top talkers by bytes and packets, plus a conversation table (A ⇄ B, protocol, ports, packet count, duration, byte volume) that answers "who actually talked to whom" without reading individual packets.',
    },
    {
      title: 'Searchable, filterable packet table',
      body: 'Filter by protocol, address, port, direction, time range, size bounds and TCP flags; combine filters; page through results server-side so a large capture stays responsive.',
    },
    {
      title: 'Packet inspection with plain-language explanation',
      body: 'Open a single packet to see its header fields and a short explanation of what each relevant field means — sequence and acknowledgement numbers, flag combinations, TTL, fragmentation offset — aimed at someone learning the protocol.',
    },
    {
      title: 'Transparent anomaly indicators',
      body: 'Configurable rules flag patterns such as port-scan-like fan-out, unexpected cleartext protocol usage, very high ICMP volume, repeated failed connection attempts and unusual outbound ports. Each indicator shows the rule that fired and the packets behind it.',
    },
    {
      title: 'Comparison, notes and reporting',
      body: 'Compare two captures to see what appeared or disappeared, attach investigation notes to a project, and export a report with statistics, applied filters and the indicators that fired.',
    },
  ],
  demonstrates: [
    'Network protocol understanding at the packet level',
    'Packet-capture processing in Python',
    'Efficient aggregation and filtering over large datasets',
    'Interactive data visualisation',
    'Background processing with progress and recoverable failure',
    'Untrusted file handling with hard resource limits',
  ],
  caseStudyFocus:
    'How raw packet records become structured information — the processing pipeline, the filtering approach, and the safeguards against treating unusual traffic as confirmed malicious activity.',
  visualDirection:
    'Technical analysis workspace: traffic charts, protocol summaries, filter controls, packet tables, inspection panels. Dense data in a clear hierarchy, no glowing terminal effects.',
  preview: {
    visual: 'netscope',
    alt: 'Representative NetScope workspace preview: a traffic-volume chart, protocol distribution bars and a filtered packet table.',
    screenshotNote:
      'Hand-drawn representative preview built from the implemented feature set, not a capture of a deployed instance. Set preview.screenshot to replace it.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'challenges — confirm the wording matches your own implementation history',
    'architecture — confirm the parsing library you settled on (Scapy vs PyShark/tshark) if it differs',
  ],
  caseStudy: {
    problem: [
      'A packet capture is the closest thing network investigation has to primary evidence, and it is almost unusable in raw form. Opening a large .pcap in a desktop tool gives you a scrollable list of a hundred thousand rows and no answer to the question you actually asked.',
      'The common questions are aggregate ones: which protocols dominate, which hosts talked the most, which conversations are new since last week, where did the volume spike. Answering them by scrolling is not feasible.',
      'There is also a learning problem. Students studying protocols see field names in a table but rarely get an explanation of why a particular flag combination matters in context.',
    ],
    whoBenefits: [
      'Cybersecurity students learning to read captures rather than memorise protocol diagrams',
      'Network administrators investigating a reported anomaly',
      'Defensive analysts triaging a capture collected by someone else',
      'Anyone who needs a reproducible, exportable summary of a capture',
    ],
    objectives: [
      'Make aggregate questions answerable in seconds: protocol mix, top talkers, conversations, volume over time.',
      'Keep large captures usable — bounded memory, background processing, server-side paging and filtering.',
      'Treat the capture as untrusted input and fail safely on malformed data.',
      'Present anomalies as indicators with visible reasoning, never as confirmed attacks.',
      'Analyse offline only. No live capture, no injection, no interaction with external hosts.',
    ],
    solution: [
      'NetScope is built as a pipeline with four distinct stages: validate, parse, aggregate, present. Each stage has one job and its own tests.',
      'Validation checks the container magic bytes, file size and structural sanity before any parsing library touches the file. Parsing then streams packets rather than loading the capture into memory, emitting a normalised `PacketRecord` per packet and stopping at a configured packet ceiling. Records that cannot be decoded are counted and skipped, not fatal.',
      'Aggregation happens twice. Cheap in-pass accumulators (protocol counters, byte totals, per-endpoint maps) run during parsing so a single stream produces the summaries. Heavier views — conversations, time bucketing, indicator evaluation — run over the persisted packet metadata, which is queryable with the same filters the UI exposes.',
      'Presentation is a React workspace: summary charts at the top, filter controls that map one-to-one onto query parameters, a paged packet table, and an inspection drawer. Filters live in the URL so an analysis state can be shared or reproduced.',
    ],
    workflow: {
      title: 'Capture processing pipeline',
      steps: [
        { label: 'Upload', detail: 'Extension, size and magic-byte validation' },
        { label: 'Queue', detail: 'Background job created, status = queued' },
        { label: 'Stream', detail: 'Packets decoded one at a time, bounded memory' },
        { label: 'Normalise', detail: 'PacketRecord per packet, undecodable rows counted' },
        { label: 'Aggregate', detail: 'Protocols, endpoints, conversations, time buckets' },
        { label: 'Indicate', detail: 'Configurable rules produce potential indicators' },
        { label: 'Explore', detail: 'Filter, page, inspect, compare, annotate, export' },
      ],
      caption:
        'Progress is reported from real job state — queued, parsing, aggregating, ready, failed — with the packet count processed so far.',
    },
    architecture: {
      summary:
        'FastAPI backend with a streaming parser and an aggregation layer over PostgreSQL; React frontend rendering charts and a server-paged packet table.',
      layers: [
        {
          layer: 'Ingestion',
          items: [
            'Upload endpoint with size limit and content sniffing',
            'Temporary storage outside the web root with guaranteed cleanup',
            'Job record created before parsing starts, so status is always queryable',
          ],
        },
        {
          layer: 'Parsing (Scapy)',
          items: [
            'Generator-based decode, one packet at a time',
            'Per-packet timeout and global packet ceiling',
            'Layer-aware extraction: Ethernet, IP/IPv6, TCP/UDP/ICMP',
            'Explicit handling of truncated, malformed and unsupported link types',
          ],
        },
        {
          layer: 'Analysis',
          items: [
            'In-pass accumulators for protocol and byte totals',
            'Conversation reconstruction from the five-tuple',
            'Time-bucketed volume series',
            'Rule-based indicators with per-rule configuration and evidence links',
          ],
        },
        {
          layer: 'Storage & API (SQLAlchemy, PostgreSQL)',
          items: [
            'Projects, captures, packet metadata, indicators, notes',
            'Composite indexes supporting the filter combinations the UI offers',
            'Server-side paging and filtering for the packet table',
          ],
        },
        {
          layer: 'Frontend (React, TypeScript)',
          items: [
            'Summary charts drawn as SVG from aggregated series',
            'Filter state synced to the URL',
            'Virtualised/paged packet table and inspection drawer',
            'Project history, comparison view and report export',
          ],
        },
      ],
      security: [
        'Captures are untrusted: parsing is resource-bounded and runs with no network access.',
        'Payload bytes are not persisted by default, which limits exposure of private content.',
        'Exported reports offer optional address anonymisation.',
        'Authorisation is enforced per project on every read, update and delete.',
      ],
    },
    decisions: [
      {
        title: 'Stream packets instead of loading the capture',
        context:
          'The obvious implementation reads a capture into a list and analyses it in memory. It works on the sample files and falls over on anything real.',
        decision:
          'Parsing is a generator that yields one normalised record at a time, with a configurable packet ceiling and a per-packet guard. Aggregates are accumulated during the stream; only packet metadata is persisted.',
        tradeoff:
          'Two passes are needed for views that require random access (packet inspection, arbitrary filters), which is why metadata goes to the database. In exchange, memory stays flat regardless of capture size and a pathological file cannot exhaust the worker.',
      },
      {
        title: 'Store metadata, not payloads',
        context:
          'Retaining payload bytes would allow deeper inspection — and would turn the tool into a store of other people\'s private traffic.',
        decision:
          'NetScope persists header metadata and payload length only. Packet inspection shows header fields; payload content is not written to the database.',
        tradeoff:
          'Content-level analysis (for example detecting a specific string in a request) is out of scope. The privacy and storage win is substantial, and it keeps the tool clearly on the defensive-analysis side of the line.',
      },
      {
        title: 'Indicators, not detections',
        context:
          'Rules that flag unusual traffic are easy to write and easy to over-trust. A "threat detected" banner on a port-scan-like pattern invites the wrong conclusion.',
        decision:
          'Every rule emits an indicator object containing the rule id, its description, its configuration, and the packet ids that triggered it. The UI labels the section "Potential indicators" and links through to the underlying packets.',
        tradeoff:
          'Less dramatic, and it puts the burden of judgement back on the analyst. It also makes each rule independently testable and falsifiable, which is the only way to keep false positives from quietly accumulating.',
      },
    ],
    testing: {
      summary:
        'Tests focus on parsing correctness, aggregation arithmetic, filter semantics and failure handling — the places where a silent bug would mislead an investigation. Verified current suite: 11 backend tests (pytest) and 2 frontend tests (vitest) pass.',
      items: [
        {
          title: 'Parser tests with fixture captures',
          body: 'Small synthetic captures covering TCP handshakes, UDP, ICMP, IPv6, VLAN tagging, fragmented packets, a truncated file and a non-capture file renamed to .pcap.',
        },
        {
          title: 'Aggregation tests',
          body: 'Protocol totals, byte-vs-packet ordering, conversation reconstruction (including asymmetric flows) and time-bucket boundaries are asserted against hand-computed expected values.',
        },
        {
          title: 'Filter tests',
          body: 'Each filter parameter individually and in combination, including negations, ranges and the empty-result case.',
        },
        {
          title: 'Resource-limit tests',
          body: 'The packet ceiling, per-packet guard and size limit are exercised so a bounded failure is asserted rather than assumed.',
        },
        {
          title: 'Job-lifecycle tests',
          body: 'Queued → parsing → ready, and the failed path including cleanup of temporary files and a user-visible error reason.',
        },
      ],
    },
    challenges: [
      {
        problem:
          'Capture files are hostile input. Truncated writes, unsupported link-layer types, packets whose declared length exceeds the bytes present, and tunnels inside tunnels all appear in real files.',
        approach:
          'The parser wraps each packet in a guarded decode step, counts failures by category, and continues. The project summary reports "N packets, M skipped (reason)" rather than hiding the gap.',
        reasoning:
          'A partial analysis that discloses its scope is useful; a crash is not; and a silently truncated result is actively dangerous in an investigation.',
        lesson:
          'Disclose the denominator. Every aggregate in the UI is accompanied by the number of records it was computed from.',
      },
      {
        problem:
          'Aggregating a large capture and then letting a user filter it arbitrarily are in tension: pre-computed summaries cannot answer every filtered question.',
        approach:
          'Persist packet metadata and let the database answer filtered queries, while keeping the unfiltered summaries pre-computed during the parse pass. Filters map directly onto indexed query parameters.',
        reasoning:
          'It puts each kind of work where it is cheapest — a single streaming pass for global aggregates, an indexed query for arbitrary slices — instead of forcing one mechanism to do both.',
        lesson:
          'Choose the storage layout from the questions users will ask, not from the shape of the input data.',
      },
      {
        problem:
          'Charts can mislead as easily as they clarify. A protocol pie chart hides a 40-packet anomaly inside a 200,000-packet capture.',
        approach:
          'Every visualisation is paired with the absolute counts and with a table view of the same data, and the volume chart supports both packet-count and byte-volume series so neither can hide behind the other.',
        reasoning:
          'Proportional visuals are good for orientation and bad for detection. Showing both keeps the orientation benefit without the blindness.',
        lesson:
          'A visualisation should always have an adjacent, less attractive, exact number.',
      },
    ],
    demonstration: {
      summary:
        'The workflow runs entirely offline against a capture file. A synthetic demonstration capture is generated by the tooling so no real traffic is required.',
      steps: [
        {
          title: 'Create a project and upload a capture',
          body: 'Upload a .pcap or .pcapng file. Validation runs immediately and the parse job is queued with visible status.',
        },
        {
          title: 'Read the summary',
          body: 'Protocol distribution, volume over time, top endpoints, conversations and packet-size statistics, each with absolute counts.',
        },
        {
          title: 'Filter and inspect',
          body: 'Narrow the packet table by protocol, address, port, flags or time range, then open a packet to see its fields explained.',
        },
        {
          title: 'Review indicators and export',
          body: 'Check which rules fired and the packets behind them, add investigation notes, optionally compare against a second capture, then export the report.',
        },
      ],
      accessNote:
        'Sample captures shipped with the project are synthetic and clearly labelled as demonstration data. NetScope never analyses traffic from a live interface.',
    },
    limitations: [
      'Offline file analysis only. There is no live capture, no packet injection and no interaction with external hosts, by design.',
      'Encrypted payloads (TLS and similar) are visible only as metadata; NetScope performs no decryption and holds no keys.',
      'Payload content is not stored, so content-level search is unavailable.',
      'Very large captures are bounded by a configurable packet ceiling; beyond it the project reports the truncated scope rather than silently continuing.',
      'Indicator rules are heuristics tuned for common patterns. Absence of indicators is not evidence that a capture is benign.',
      'Application-layer protocol dissection covers common protocols; exotic or proprietary encapsulations appear as unclassified traffic.',
    ],
  },
};
