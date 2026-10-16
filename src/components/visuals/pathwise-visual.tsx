import { Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#e0a352';

function PrimaryView() {
  const nodes = [
    {
      x: 96,
      y: 122,
      label: 'Place value',
      state: 'Mastered',
      tone: 'signal' as const,
    },
    {
      x: 268,
      y: 96,
      label: 'Fractions',
      state: 'Developing',
      tone: 'caution' as const,
    },
    {
      x: 268,
      y: 208,
      label: 'Ratio',
      state: 'Not assessed',
      tone: 'neutral' as const,
    },
    {
      x: 460,
      y: 152,
      label: 'Proportion',
      state: 'Blocked',
      tone: 'neutral' as const,
    },
  ];

  const links: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [1, 3],
    [2, 3],
  ];

  return (
    <>
      <Label
        x={28}
        y={34}
        text="Skill map · Algebra foundations"
        size={15}
        strong
      />
      <Chip x={470} y={20} text="Evidence-based" tone="accent" width={142} />

      {links.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={nodes[from]!.x + 60}
          y1={nodes[from]!.y + 20}
          x2={nodes[to]!.x}
          y2={nodes[to]!.y + 20}
          className="stroke-line-strong"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      ))}

      {nodes.map((node) => (
        <g key={node.label}>
          <rect
            x={node.x}
            y={node.y}
            width={150}
            height={58}
            rx={10}
            className="fill-panel stroke-line-strong"
            strokeWidth={1}
          />
          <StatusDot
            x={node.x + 16}
            y={node.y + 20}
            hue={node.tone === 'neutral' ? undefined : HUE}
            className={node.tone === 'neutral' ? 'fill-line-strong' : undefined}
          />
          <Label
            x={node.x + 28}
            y={node.y + 24}
            text={node.label}
            size={12}
            strong
          />
          <Chip
            x={node.x + 14}
            y={node.y + 32}
            text={node.state}
            tone={node.tone}
            width={node.tone === 'neutral' ? 104 : 96}
            fontSize={10}
          />
        </g>
      ))}

      <Row x={28} y={284} width={584} height={70}>
        <Label x={44} y={310} text="How states are decided" size={12} strong />
        <Label
          x={44}
          y={330}
          text="Mastered: ≥5 evidence · Developing: 2–4 · Not assessed: fewer than 2"
          size={11}
          tone="subtle"
        />
        <Chip
          x={486}
          y={310}
          text="No hidden score"
          width={110}
          fontSize={10}
        />
      </Row>
    </>
  );
}

function DetailView() {
  return (
    <>
      <Label x={28} y={34} text="Recommended next step" size={15} strong />
      <Chip x={480} y={20} text="Rule trace" tone="accent" width={132} />

      <Row x={28} y={52} width={584} height={154} emphasis>
        <Label
          x={44}
          y={80}
          text="Practise equivalent fractions (Set B)"
          size={14}
          strong
        />
        <Label x={44} y={104} text="Rationale" size={10} tone="subtle" mono />
        <Label
          x={44}
          y={124}
          text="Prerequisite gap: fractions below threshold while"
          size={12}
          tone="muted"
        />
        <Label
          x={44}
          y={144}
          text="proportion questions depend on it."
          size={12}
          tone="muted"
        />
        <Chip
          x={44}
          y={156}
          text="4 responses · last 2 days"
          width={186}
          fontSize={10}
        />
        <Chip
          x={240}
          y={156}
          text="Recency-weighted"
          tone="signal"
          width={140}
          fontSize={10}
        />
      </Row>

      <Row x={28} y={222} width={584} height={64}>
        <Label x={44} y={248} text="Teacher override" size={12} strong />
        <Label
          x={44}
          y={268}
          text="Assign a different set, with the reason recorded next to the suggestion."
          size={11}
          tone="subtle"
        />
        <Chip
          x={474}
          y={244}
          text="Reason required"
          tone="caution"
          width={122}
          fontSize={10}
        />
      </Row>

      <Row x={28} y={300} width={584} height={54}>
        <Label x={44} y={326} text="Review scheduled" size={12} strong />
        <Label
          x={160}
          y={326}
          text="Fractions → review in 4 days if evidence holds"
          size={11}
          tone="subtle"
        />
        <Chip x={486} y={310} text="Not a grade" width={110} fontSize={10} />
      </Row>
    </>
  );
}

export function PathWiseVisual({
  view,
  compact = false,
}: {
  view: string;
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="PathWise · mastery and next steps"
      viewLabel={view === 'primary' ? 'Skill map' : 'Recommendation'}
      description={
        view === 'primary'
          ? 'A skill map with prerequisite links where each topic shows mastered, developing or not-yet-assessed state and the evidence rule behind it.'
          : 'A recommended next step panel showing the rule trace, the evidence count, the teacher override control and a spaced review note.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
