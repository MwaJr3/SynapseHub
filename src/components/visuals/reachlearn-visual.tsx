import { Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#e08a4f';

function PrimaryView() {
  return (
    <>
      <Label x={28} y={34} text="Channel preview · SMS" size={15} strong />
      <Chip
        x={458}
        y={20}
        text="154 / 160 characters"
        tone="signal"
        width={154}
      />

      <rect
        x={96}
        y={52}
        width={236}
        height={300}
        rx={20}
        className="fill-panel-strong stroke-line-strong"
        strokeWidth={1.5}
      />
      <rect
        x={150}
        y={62}
        width={128}
        height={10}
        rx={5}
        className="fill-line"
      />

      <Row x={116} y={88} width={196} height={78}>
        <Label
          x={130}
          y={112}
          text="Lesson 4 of 12"
          size={10}
          tone="subtle"
          mono
        />
        <Label x={130} y={134} text="Water changes shape:" size={12} />
        <Label x={130} y={152} text="liquid → gas → liquid." size={12} />
      </Row>

      <Row x={116} y={174} width={196} height={96}>
        <Label x={130} y={198} text="Question" size={10} tone="subtle" mono />
        <Label x={130} y={220} text="What makes water" size={12} />
        <Label x={130} y={238} text="evaporate?" size={12} />
        <Label
          x={130}
          y={258}
          text="1 Heat  2 Salt  3 Wind"
          size={11}
          tone="muted"
          mono
        />
      </Row>

      <Row x={116} y={278} width={196} height={56}>
        <Label x={130} y={302} text="Reply with 1, 2 or 3" size={11} />
        <Label
          x={130}
          y={322}
          text="Quiet hours: 20:00–06:00"
          size={10}
          tone="subtle"
          mono
        />
      </Row>

      <Row x={356} y={52} width={256} height={152}>
        <Label x={372} y={78} text="Rendering checks" size={12} strong />
        <StatusDot x={378} y={100} hue={HUE} />
        <Label
          x={390}
          y={104}
          text="1 message · no split word"
          size={11}
          tone="muted"
        />
        <StatusDot x={378} y={128} hue={HUE} />
        <Label
          x={390}
          y={132}
          text="USSD menu depth 2 of 3"
          size={11}
          tone="muted"
        />
        <StatusDot x={378} y={156} hue={HUE} />
        <Label
          x={390}
          y={160}
          text="IVR script available (EN)"
          size={11}
          tone="muted"
        />
        <Chip
          x={372}
          y={172}
          text="Consent recorded"
          tone="signal"
          width={150}
          fontSize={10}
        />
      </Row>

      <Row x={356} y={216} width={256} height={136}>
        <Label x={372} y={242} text="Learner state" size={12} strong />
        <Label
          x={372}
          y={266}
          text="Lesson 4 · awaiting reply"
          size={11}
          tone="muted"
        />
        <Label
          x={372}
          y={288}
          text="Previous: Lesson 3 complete"
          size={11}
          tone="muted"
        />
        <Label
          x={372}
          y={310}
          text="Channel: SMS (last answered 09:12)"
          size={11}
          tone="subtle"
        />
        <Chip
          x={372}
          y={322}
          text="Next: review in 3 days"
          width={172}
          fontSize={10}
        />
      </Row>
    </>
  );
}

function DetailView() {
  const deliveries = [
    {
      to: 'Learner 014 · +27 ·· ·· 41',
      state: 'Delivered',
      tone: 'signal' as const,
      channel: 'SMS',
    },
    {
      to: 'Learner 021 · +27 ·· ·· 87',
      state: 'Sent',
      tone: 'accent' as const,
      channel: 'SMS',
    },
    {
      to: 'Learner 006 · +26 ·· ·· 16',
      state: 'Queued',
      tone: 'neutral' as const,
      channel: 'USSD',
    },
    {
      to: 'Learner 033 · +27 ·· ·· 52',
      state: 'Failed',
      tone: 'caution' as const,
      channel: 'SMS',
    },
    {
      to: 'Simulator · development',
      state: 'Simulated',
      tone: 'neutral' as const,
      channel: 'Local',
    },
  ];

  return (
    <>
      <Label x={28} y={34} text="Delivery queue" size={15} strong />
      <Chip x={462} y={20} text="Provider results only" width={150} />

      {deliveries.map((delivery, index) => {
        const y = 54 + index * 52;
        return (
          <Row key={delivery.to} x={28} y={y} width={584} height={42}>
            <Label x={44} y={y + 26} text={delivery.to} size={11} mono />
            <Label
              x={300}
              y={y + 26}
              text={delivery.channel}
              size={10}
              tone="subtle"
              mono
            />
            <Chip
              x={498}
              y={y + 10}
              text={delivery.state}
              tone={delivery.tone}
              width={98}
              fontSize={10}
            />
          </Row>
        );
      })}

      <Row x={28} y={322} width={584} height={44}>
        <StatusDot x={44} y={344} hue={HUE} />
        <Label
          x={56}
          y={348}
          text="Simulator entries are labelled and are never reported as carrier delivery."
          size={11}
          tone="muted"
        />
      </Row>
    </>
  );
}

export function ReachLearnVisual({
  view,
  compact = false,
}: {
  view: string;
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="ReachLearn · channel delivery"
      viewLabel={view === 'primary' ? 'SMS lesson' : 'Delivery queue'}
      description={
        view === 'primary'
          ? 'A phone preview of a short SMS lesson with a reply prompt, alongside rendering checks for message length, menu depth and learner consent state.'
          : 'A delivery queue listing queued, sent, delivered and failed messages with phone numbers partially masked and a separate labelled simulator entry.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
