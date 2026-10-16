import { Bar, Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#3fb6cf';

function PrimaryView() {
  const metrics = [
    {
      label: 'Participation',
      value: '78%',
      definition: 'lesson_started / learners enrolled',
    },
    {
      label: 'Assignment completion',
      value: '64%',
      definition: 'submitted / assigned · due dates passed',
    },
    {
      label: 'Assessment outcome',
      value: 'median 71%',
      definition: 'latest attempt per learner',
    },
  ];
  const weeks = [0.42, 0.55, 0.61, 0.58, 0.72, 0.68, 0.75, 0.8];

  return (
    <>
      <Label x={28} y={34} text="Class 8B · last 6 weeks" size={15} strong />
      <Chip x={468} y={20} text="Definitions included" width={144} />

      {metrics.map((metric, index) => {
        const x = 28 + index * 198;
        return (
          <Row key={metric.label} x={x} y={52} width={182} height={96}>
            <Label
              x={x + 16}
              y={78}
              text={metric.label}
              size={11}
              tone="subtle"
            />
            <Label x={x + 16} y={108} text={metric.value} size={20} />
            <Label
              x={x + 16}
              y={128}
              text={metric.definition}
              size={9}
              tone="subtle"
              mono
            />
          </Row>
        );
      })}

      <Row x={28} y={164} width={584} height={124}>
        <Label x={44} y={190} text="Participation trend" size={12} strong />
        <line
          x1={44}
          y1={262}
          x2={596}
          y2={262}
          className="stroke-line"
          strokeWidth={1}
        />
        {weeks.map((value, index) => (
          <Bar
            key={index}
            x={52 + index * 66}
            y={192 + (1 - value) * 62}
            width={34}
            height={70 - (1 - value) * 62}
            progress={1}
            hue={HUE}
          />
        ))}
        <Label x={44} y={278} text="W1" size={9} tone="subtle" mono />
        <Label
          x={596}
          y={278}
          text="W6 · source: lesson_started events"
          size={9}
          tone="subtle"
          anchor="end"
          mono
        />
      </Row>

      <Row x={28} y={302} width={584} height={52}>
        <StatusDot x={44} y={328} hue="#e0a352" />
        <Label
          x={56}
          y={332}
          text="Data quality: 46 quiz events arrived 2 days late; 3 records lack a course identifier."
          size={11}
          tone="muted"
        />
      </Row>
    </>
  );
}

function DetailView() {
  const evidence = [
    'Assignment 4 not submitted (due 12 Oct)',
    'Assignment 5 not submitted (due 14 Oct)',
    'Same error repeated on prerequisite skill: fractions',
  ];

  return (
    <>
      <Label
        x={28}
        y={34}
        text="Support flag · transparent rule"
        size={15}
        strong
      />
      <Chip x={480} y={20} text="Teacher decides" tone="accent" width={132} />

      <Row x={28} y={52} width={584} height={158} emphasis>
        <Label
          x={44}
          y={80}
          text="Rule triggered"
          size={10}
          tone="subtle"
          mono
        />
        <Label
          x={44}
          y={102}
          text="2+ missed assignments within 14 days"
          size={13}
          strong
        />
        <Label
          x={44}
          y={126}
          text="or repeated errors on a prerequisite skill."
          size={13}
          strong
        />
        <Label x={44} y={156} text="Evidence" size={10} tone="subtle" mono />
        {evidence.map((item, index) => (
          <Label
            key={item}
            x={44}
            y={178 + index * 18}
            text={`· ${item}`}
            size={11}
            tone="muted"
          />
        ))}
      </Row>

      <Row x={28} y={226} width={584} height={72}>
        <Label x={44} y={252} text="Teacher action" size={12} strong />
        <Label
          x={44}
          y={272}
          text="Dismiss or annotate with a supportive follow-up; the outcome is stored."
          size={11}
          tone="subtle"
        />
        <Chip
          x={472}
          y={248}
          text="No auto-decision"
          tone="signal"
          width={124}
          fontSize={10}
        />
      </Row>

      <Row x={28} y={310} width={584} height={52}>
        <Label
          x={44}
          y={336}
          text="Group views below 8 learners are suppressed to protect individuals."
          size={11}
          tone="subtle"
        />
        <Chip x={492} y={320} text="n = 24" width={92} fontSize={10} />
      </Row>
    </>
  );
}

export function LearnPulseVisual({
  view,
  compact = false,
}: {
  view: string;
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="LearnPulse · teacher support view"
      viewLabel={view === 'primary' ? 'Class overview' : 'Support flag'}
      description={
        view === 'primary'
          ? 'A class overview with participation, assignment and assessment figures, each showing its metric definition, above a weekly trend chart and a data-quality note.'
          : 'A support flag showing the exact rule that triggered it, the evidence records behind it, the teacher action controls and a small-cohort suppression note.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
