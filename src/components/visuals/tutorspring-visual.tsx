import { Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#6f86f6';

function PrimaryView() {
  const sources = [
    {
      title: 'Lesson 4.2 — Cell respiration',
      meta: 'approved · updated Mar 3',
    },
    {
      title: 'Worked example 3 — Energy flow',
      meta: 'approved · level: introductory',
    },
  ];

  return (
    <>
      <Label
        x={28}
        y={34}
        text="Tutor session · Explain mode"
        size={15}
        strong
      />
      <Chip x={474} y={20} text="Live model" tone="accent" width={138} />

      <Row x={28} y={52} width={584} height={72}>
        <Label x={44} y={78} text="Learner" size={11} tone="subtle" mono />
        <Label
          x={44}
          y={100}
          text="Why does respiration release energy in steps?"
          size={13}
        />
      </Row>

      <Row x={28} y={136} width={584} height={132} emphasis>
        <Label
          x={44}
          y={162}
          text="Tutor · grounded in approved material"
          size={11}
          tone="accent"
          mono
        />
        <Label
          x={44}
          y={186}
          text="Think of it as a staircase rather than a drop:"
          size={13}
        />
        <Label
          x={44}
          y={208}
          text="each step releases a small amount that the cell"
          size={13}
        />
        <Label
          x={44}
          y={230}
          text="can capture instead of losing it as heat."
          size={13}
        />
        <Chip
          x={44}
          y={240}
          text="Hint level 1 of 3"
          tone="signal"
          width={128}
          fontSize={10}
        />
      </Row>

      <Label
        x={28}
        y={292}
        text="Sources used in this answer"
        size={12}
        strong
      />
      {sources.map((source, index) => {
        const y = 304 + index * 36;
        return (
          <Row key={source.title} x={28} y={y} width={584} height={30}>
            <StatusDot x={46} y={y + 15} hue={HUE} />
            <Label x={58} y={y + 19} text={source.title} size={11} />
            <Label
              x={596}
              y={y + 19}
              text={source.meta}
              size={10}
              tone="subtle"
              anchor="end"
              mono
            />
          </Row>
        );
      })}
    </>
  );
}

function DetailView() {
  const flags = [
    {
      topic: 'Photosynthesis · 2-step logic',
      learner: 'Learner 014',
      state: 'Needs review',
      tone: 'caution' as const,
    },
    {
      topic: 'Fractions → ratios',
      learner: 'Learner 021',
      state: 'Reviewed',
      tone: 'signal' as const,
    },
    {
      topic: 'Energy transfer wording',
      learner: 'Learner 006',
      state: 'Needs review',
      tone: 'caution' as const,
    },
  ];

  return (
    <>
      <Label x={28} y={34} text="Teacher review queue" size={15} strong />
      <Chip x={478} y={20} text="Privacy-scoped" width={134} />

      {flags.map((flag, index) => {
        const y = 54 + index * 74;
        return (
          <Row key={flag.topic} x={28} y={y} width={584} height={62}>
            <Label x={44} y={y + 26} text={flag.topic} size={13} strong />
            <Label
              x={44}
              y={y + 46}
              text={`Flagged by ${flag.learner} · conversation shown: summary only`}
              size={11}
              tone="subtle"
            />
            <Chip
              x={480}
              y={y + 20}
              text={flag.state}
              tone={flag.tone}
              width={116}
              fontSize={10}
            />
          </Row>
        );
      })}

      <Row x={28} y={282} width={584} height={72}>
        <Label x={44} y={308} text="Reviewer note" size={12} strong />
        <Label
          x={44}
          y={330}
          text="Reworded the hint to match Lesson 4.2 and republished the prompt."
          size={11}
          tone="muted"
        />
        <Chip
          x={460}
          y={310}
          text="Recorded, not auto-fixed"
          width={136}
          fontSize={10}
        />
      </Row>
    </>
  );
}

export function TutorSpringVisual({
  view,
  compact = false,
}: {
  view: string;
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="TutorSpring · grounded tutor"
      viewLabel={view === 'primary' ? 'Explain mode' : 'Review queue'}
      description={
        view === 'primary'
          ? 'A tutoring exchange in explain mode with a level-one hint and a list of the approved lesson passages used to ground the answer.'
          : 'A teacher review queue listing learner-flagged explanations with review states and a recorded reviewer note.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
