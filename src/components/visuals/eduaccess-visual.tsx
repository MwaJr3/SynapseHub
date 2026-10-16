import { Bar, Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#5fae6a';

function PrimaryView() {
  const plans = [
    {
      name: 'Free access',
      detail: 'Fee waiver · open to all learners',
      state: 'Available',
      tone: 'signal' as const,
      fill: 1,
    },
    {
      name: 'Sponsored seats',
      detail: '12 seats · sponsor pool · window closes 30 Oct',
      state: '8 remaining',
      tone: 'accent' as const,
      fill: 0.33,
    },
    {
      name: 'Paid place',
      detail: 'Adapter configured · invoiced by provider',
      state: 'Configured',
      tone: 'neutral' as const,
      fill: 1,
    },
  ];

  return (
    <>
      <Label x={28} y={34} text="Course access plans" size={15} strong />
      <Chip x={466} y={20} text="Support source recorded" width={146} />

      {plans.map((plan, index) => {
        const y = 52 + index * 92;
        return (
          <Row
            key={plan.name}
            x={28}
            y={y}
            width={584}
            height={80}
            emphasis={index === 1}
          >
            <Label x={44} y={y + 26} text={plan.name} size={13} strong />
            <Label
              x={44}
              y={y + 46}
              text={plan.detail}
              size={11}
              tone="subtle"
            />
            <Bar
              x={44}
              y={y + 58}
              width={280}
              progress={plan.fill}
              hue={plan.fill === 1 ? undefined : HUE}
            />
            <Chip
              x={474}
              y={y + 26}
              text={plan.state}
              tone={plan.tone}
              width={122}
              fontSize={10}
            />
          </Row>
        );
      })}

      <Row x={28} y={328} width={584} height={52}>
        <Label
          x={44}
          y={354}
          text="Eligibility criteria and application window shown before a learner applies."
          size={11}
          tone="muted"
        />
      </Row>
    </>
  );
}

function DetailView() {
  const pool = [
    { label: 'Sponsor pool A', available: 4, committed: 6, allocated: 10 },
    { label: 'Programme reserve', available: 2, committed: 1, allocated: 3 },
  ];

  return (
    <>
      <Label
        x={28}
        y={34}
        text="Review queue and seat allocation"
        size={15}
        strong
      />
      <Chip x={492} y={20} text="Audited decisions" width={120} />

      <Row x={28} y={52} width={584} height={96}>
        <Label
          x={44}
          y={78}
          text="Application 2219 · fee waiver"
          size={12}
          strong
        />
        <Label
          x={44}
          y={98}
          text="Criteria met: 2 of 2 · reviewer: programme admin"
          size={11}
          tone="subtle"
        />
        <Chip
          x={44}
          y={110}
          text="Approved — reason recorded"
          tone="signal"
          width={214}
          fontSize={10}
        />
        <Chip
          x={272}
          y={110}
          text="Needs information"
          width={120}
          fontSize={10}
        />
        <Chip x={404} y={110} text="Waitlisted" width={92} fontSize={10} />
      </Row>

      <Label x={28} y={180} text="Funding pools" size={12} strong />
      {pool.map((entry, index) => {
        const y = 192 + index * 76;
        return (
          <Row key={entry.label} x={28} y={y} width={584} height={66}>
            <Label x={44} y={y + 24} text={entry.label} size={12} />
            <Label
              x={200}
              y={y + 24}
              text={`available ${entry.available}`}
              size={11}
              tone="muted"
              mono
            />
            <Label
              x={318}
              y={y + 24}
              text={`committed ${entry.committed}`}
              size={11}
              tone="muted"
              mono
            />
            <Label
              x={444}
              y={y + 24}
              text={`allocated ${entry.allocated}`}
              size={11}
              tone="muted"
              mono
            />
            <Bar
              x={44}
              y={y + 38}
              width={548}
              progress={entry.allocated / (entry.allocated + entry.available)}
              hue={HUE}
            />
            <Label
              x={44}
              y={y + 58}
              text="Reserved transactionally — cannot be oversubscribed"
              size={10}
              tone="subtle"
            />
          </Row>
        );
      })}

      <Row x={28} y={344} width={584} height={40}>
        <StatusDot x={44} y={364} hue={HUE} />
        <Label
          x={56}
          y={368}
          text="Payments: adapter configured · manual reconciliation path labelled separately"
          size={11}
          tone="muted"
        />
      </Row>
    </>
  );
}

export function EduAccessVisual({
  view,
  compact = false,
}: {
  view: string;
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="EduAccess · plans and allocation"
      viewLabel={view === 'primary' ? 'Access plans' : 'Review + pools'}
      description={
        view === 'primary'
          ? 'Three access plans for a course — free, sponsored seats with a remaining count, and a paid place — each stating the support source.'
          : 'A reviewer queue with recorded decisions above funding pool rows showing available, committed and allocated seat counts and a payment-state note.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
