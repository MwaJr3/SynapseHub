import {
  PBar,
  PCard,
  PChip,
  PDonut,
  PLine,
  PRowLines,
  PSeries,
  PText,
  PreviewFrame,
} from './primitives';

const PREVIEW_LABEL = 'Representative preview';

/* ------------------------------------------------------------ CyberAware --- */

export function CyberAwarePreview({ title }: { title: string }) {
  return (
    <PreviewFrame accent="green" title={title} label={PREVIEW_LABEL}>
      {/* Progress header */}
      <PCard x={16} y={50} w={768} h={70} />
      <PText x={32} y={74} size={12} weight={600} fill="var(--tw-fg)">
        Foundations of safe online practice
      </PText>
      <PChip x={288} y={62} w={96} label="6 of 8 modules" tone="accent" />
      <PBar x={32} y={92} w={420} h={8} value={0.75} color="var(--prj)" />
      <PText x={466} y={100} size={9} mono fill="var(--tw-fg-subtle)">
        75% completed · 2 quizzes passed
      </PText>
      <PDonut
        cx={700}
        cy={85}
        r={22}
        centerLabel="78%"
        segments={[
          { value: 78, color: 'var(--prj)' },
          { value: 22, color: 'var(--tw-line)' },
        ]}
      />
      <PText x={740} y={112} size={8} mono fill="var(--tw-fg-subtle)">
        avg accuracy
      </PText>

      {/* Simulated scenario */}
      <PCard x={16} y={130} w={470} h={354} />
      <rect x={16} y={130} width={470} height={30} rx={8} fill="var(--tw-warning-soft)" />
      <rect x={16} y={152} width={470} height={8} fill="var(--tw-surface)" />
      <PText x={32} y={150} size={9} weight={700} fill="var(--tw-warning)">
        FICTIONAL TRAINING SCENARIO — invented organisation, no real sender
      </PText>

      <PText x={32} y={186} size={11} weight={600} fill="var(--tw-fg)">
        Module 3 · Recognising a payment redirect
      </PText>

      <rect x={32} y={198} width={438} height={118} rx="7" fill="var(--tw-sunken)" stroke="var(--tw-line)" />
      <PText x={46} y={220} size={9} mono fill="var(--tw-fg-subtle)">
        From: accounts@northwind-billing.example
      </PText>
      <PText x={46} y={238} size={9} mono fill="var(--tw-fg-subtle)">
        Reply-To: payments@quickmail-drop.example
      </PText>
      <PText x={46} y={256} size={9.5} weight={600} fill="var(--tw-fg)">
        Urgent: invoice #4417 will be suspended today
      </PText>
      <PText x={46} y={276} size={9} fill="var(--tw-fg-muted)">
        Click below within 2 hours to verify your account and
      </PText>
      <PText x={46} y={290} size={9} fill="var(--tw-fg-muted)">
        avoid interruption to your service.
      </PText>
      <rect x={46} y={298} width={110} height={14} rx={4} fill="var(--prj-soft)" stroke="var(--prj-line)" />
      <PText x={101} y={308} size={8.5} fill="var(--prj)" anchor="middle">
        Verify account
      </PText>

      <PText x={32} y={340} size={10} weight={600} fill="var(--tw-fg)">
        Which warning signs are present? (select all)
      </PText>
      {[
        { option: 'Reply-To does not match the sender domain', correct: true },
        { option: 'Urgency with a short deadline', correct: true },
        { option: 'The message uses a generic greeting', correct: true },
        { option: 'The sender domain is a well-known bank', correct: false },
      ].map((item, index) => (
        <g key={item.option}>
          <rect
            x={32}
            y={352 + index * 26}
            width={14}
            height={14}
            rx={4}
            fill={item.correct ? 'var(--tw-success)' : 'var(--tw-surface)'}
            stroke={item.correct ? 'var(--tw-success)' : 'var(--tw-line-strong)'}
          />
          <PText x={54} y={363 + index * 26} size={9.5} fill="var(--tw-fg)">
            {item.option}
          </PText>
        </g>
      ))}

      <rect x={32} y={458} width={438} height={18} rx={5} fill="var(--tw-success-soft)" />
      <PText x={42} y={471} size={8.8} fill="var(--tw-success)">
        Correct — 3 of 3 signals identified. Feedback explains each one after grading.
      </PText>

      {/* Right column: feedback + progress */}
      <PCard x={498} y={130} w={286} h={176} />
      <PText x={514} y={154} size={11} weight={600} fill="var(--tw-fg)">
        Why this matters
      </PText>
      <PRowLines x={514} y={166} widths={[238, 226, 208, 190]} gap={12} />
      <rect x={514} y={226} width={254} height={64} rx="6" fill="var(--tw-sunken)" />
      <PText x={526} y={246} size={9} weight={600} fill="var(--tw-fg)">
        Transferable check
      </PText>
      <PText x={526} y={264} size={8.8} fill="var(--tw-fg-muted)">
        Compare the visible sender with Reply-To and with
      </PText>
      <PText x={526} y={278} size={8.8} fill="var(--tw-fg-muted)">
        the link target — three different claims.
      </PText>

      <PCard x={498} y={316} w={286} h={168} />
      <PText x={514} y={340} size={11} weight={600} fill="var(--tw-fg)">
        Revision queue
      </PText>
      <PText x={768} y={340} size={8.5} mono fill="var(--tw-fg-subtle)" anchor="end">
        from accuracy, not completion
      </PText>
      {[
        { topic: 'Password reuse', accuracy: 0.42 },
        { topic: 'MFA fatigue', accuracy: 0.58 },
        { topic: 'Account recovery', accuracy: 0.66 },
        { topic: 'Safe browsing', accuracy: 0.88 },
      ].map((topic, index) => (
        <g key={topic.topic}>
          <PText x={514} y={366 + index * 26} size={9.5} fill="var(--tw-fg)">
            {topic.topic}
          </PText>
          <PBar
            x={628}
            y={359 + index * 26}
            w={100}
            h={6}
            value={topic.accuracy}
            color={topic.accuracy < 0.6 ? 'var(--tw-danger)' : topic.accuracy < 0.75 ? 'var(--tw-warning)' : 'var(--tw-success)'}
          />
          <PText x={768} y={366 + index * 26} size={8.5} mono fill="var(--tw-fg-subtle)" anchor="end">
            {Math.round(topic.accuracy * 100)}%
          </PText>
        </g>
      ))}
      <PText x={514} y={470} size={8.5} fill="var(--tw-fg-subtle)">
        Progress reports activity — completion is not a mastery claim.
      </PText>
    </PreviewFrame>
  );
}

/* ------------------------------------------------------------ TranscriptWise */

export function TranscriptWisePreview({ title }: { title: string }) {
  const stages = ['Preparing', 'Segmenting', 'Analysing', 'Merging', 'Guide', 'Revision'];

  return (
    <PreviewFrame accent="sky" title={title} label={PREVIEW_LABEL}>
      {/* Source panel */}
      <PCard x={16} y={50} w={286} h={434} />
      <PText x={32} y={74} size={11} weight={600} fill="var(--tw-fg)">
        Source
      </PText>
      <PChip x={204} y={62} w={82} label=".vtt parsed" tone="accent" />

      <rect x={32} y={88} width={254} height={52} rx="6" fill="var(--tw-sunken)" />
      <PText x={44} y={106} size={9} weight={600} fill="var(--tw-fg)">
        Intro to Distributed Consensus
      </PText>
      <PText x={44} y={122} size={8.5} mono fill="var(--tw-fg-subtle)">
        48:12 · en · 214 segments · 41,208 chars
      </PText>
      <PText x={44} y={134} size={8.5} mono fill="var(--tw-fg-subtle)">
        retrieved: unavailable → uploaded by user
      </PText>

      {[
        { time: '00:14', text: 'so the first thing to understand about' },
        { time: '00:19', text: 'consensus is that it is a agreement problem' },
        { time: '01:02', text: 'and the reason we care is partial failure' },
        { time: '02:31', text: 'a quorum is just a majority of the voters' },
        { time: '04:07', text: 'now leader election is where it gets subtle' },
      ].map((segment, index) => (
        <g key={segment.time}>
          <rect
            x={32}
            y={152 + index * 34}
            width={254}
            height={28}
            rx="6"
            fill={index === 3 ? 'var(--prj-soft)' : 'var(--tw-surface)'}
            stroke={index === 3 ? 'var(--prj-line)' : 'var(--tw-line)'}
          />
          <PText x={42} y={170 + index * 34} size={8.5} mono fill={index === 3 ? 'var(--prj)' : 'var(--tw-fg-subtle)'}>
            {segment.time}
          </PText>
          <PText x={86} y={170 + index * 34} size={8.8} fill="var(--tw-fg-muted)">
            {segment.text}
          </PText>
        </g>
      ))}

      <PText x={32} y={340} size={9.5} weight={600} fill="var(--tw-fg)">
        Review before analysis
      </PText>
      <PChip x={32} y={350} w={72} label="edit text" tone="neutral" />
      <PChip x={110} y={350} w={82} label="clean format" tone="neutral" />
      <PChip x={198} y={350} w={88} label="keep original" tone="accent" />
      <PText x={32} y={386} size={8.5} fill="var(--tw-fg-subtle)">
        The original transcript is preserved and never
      </PText>
      <PText x={32} y={398} size={8.5} fill="var(--tw-fg-subtle)">
        overwritten by cleanup.
      </PText>

      <rect x={32} y={412} width={254} height={62} rx="6" fill="var(--tw-surface)" stroke="var(--tw-line)" />
      <PText x={44} y={432} size={9} weight={600} fill="var(--tw-fg)">
        Configuration
      </PText>
      <PText x={44} y={448} size={8.5} mono fill="var(--tw-fg-muted)">
        objective: academic study
      </PText>
      <PText x={44} y={462} size={8.5} mono fill="var(--tw-fg-muted)">
        level: intermediate · depth: comprehensive
      </PText>

      {/* Pipeline + guide */}
      <PCard x={312} y={50} w={472} h={434} />

      <PText x={328} y={74} size={11} weight={600} fill="var(--tw-fg)">
        Analysis pipeline
      </PText>
      {stages.map((stage, index) => {
        const x = 328 + index * 74;
        const done = index < 4;
        const active = index === 4;
        return (
          <g key={stage}>
            <rect
              x={x}
              y={84}
              width={66}
              height={24}
              rx={6}
              fill={active ? 'var(--prj-soft)' : done ? 'var(--tw-surface)' : 'var(--tw-sunken)'}
              stroke={active ? 'var(--prj-line)' : 'var(--tw-line)'}
            />
            <PText
              x={x + 33}
              y={99}
              size={8.5}
              anchor="middle"
              fill={active ? 'var(--prj)' : done ? 'var(--tw-fg-muted)' : 'var(--tw-fg-subtle)'}
            >
              {stage}
            </PText>
            {done ? <circle cx={x + 8} cy={92} r="2.5" fill="var(--tw-success)" /> : null}
            {index < stages.length - 1 ? (
              <line x1={x + 66} y1={96} x2={x + 74} y2={96} stroke="var(--tw-line-strong)" />
            ) : null}
          </g>
        );
      })}
      <PText x={328} y={124} size={8.5} mono fill="var(--tw-fg-subtle)">
        6 segments · 5 analysed · 1 pending · progress reflects real pipeline state
      </PText>

      {/* Guide section */}
      <rect x={328} y={136} width={440} height={1} fill="var(--tw-line)" />
      <PText x={328} y={160} size={12} weight={700} fill="var(--tw-fg)">
        Learning guide · Concepts explained
      </PText>
      <PChip x={328} y={170} w={92} label="3 of 14 sections" tone="neutral" />

      <rect x={328} y={196} width={440} height={120} rx="7" fill="var(--tw-surface)" stroke="var(--tw-line)" />
      <PText x={344} y={218} size={10.5} weight={650} fill="var(--tw-fg)">
        Quorum
      </PText>
      <PChip x={700} y={206} w={54} label="02:31" tone="accent" />
      <PText x={344} y={238} size={9} weight={600} fill="var(--tw-fg-muted)">
        Simple definition
      </PText>
      <PLine x={344} y={246} w={380} h={4} opacity={0.55} />
      <PLine x={344} y={256} w={316} h={4} opacity={0.4} />
      <PText x={344} y={278} size={9} weight={600} fill="var(--tw-fg-muted)">
        Why it matters
      </PText>
      <PLine x={344} y={286} w={398} h={4} opacity={0.55} />
      <PLine x={344} y={296} w={254} h={4} opacity={0.4} />
      <rect x={344} y={304} width={112} height={4} rx={2} fill="var(--prj)" opacity={0.5} />

      {/* Attribution legend */}
      <PText x={328} y={340} size={9.5} weight={600} fill="var(--tw-fg)">
        Attribution
      </PText>
      {[
        { label: 'source claim', tone: 'neutral' as const },
        { label: 'direct quote', tone: 'info' as const },
        { label: 'AI explanation', tone: 'accent' as const },
        { label: 'illustrative example', tone: 'warning' as const },
      ].map((item, index) => (
        <PChip key={item.label} x={328 + index * 112} y={350} w={106} label={item.label} tone={item.tone} />
      ))}

      {/* Revision material */}
      <PCard x={328} y={382} w={212} h={92} />
      <PText x={342} y={404} size={10} weight={600} fill="var(--tw-fg)">
        Revision questions
      </PText>
      <PText x={526} y={404} size={8.5} mono fill="var(--tw-fg-subtle)" anchor="end">
        8
      </PText>
      {['recall', 'conceptual', 'application', 'critical'].map((kind, index) => (
        <PText key={kind} x={342} y={422 + index * 13} size={8.5} fill="var(--tw-fg-muted)">
          · {kind}
        </PText>
      ))}

      <PCard x={556} y={382} w={212} h={92} />
      <PText x={570} y={404} size={10} weight={600} fill="var(--tw-fg)">
        Flashcards
      </PText>
      <PText x={754} y={404} size={8.5} mono fill="var(--tw-fg-subtle)" anchor="end">
        12 due
      </PText>
      <PSeries x={570} y={414} w={184} h={40} values={[2, 4, 3, 6, 5, 8, 7, 9, 6, 4]} color="var(--prj)" />
      <PText x={570} y={468} size={8} mono fill="var(--tw-fg-subtle)">
        reviews over the last 10 sessions
      </PText>
    </PreviewFrame>
  );
}
