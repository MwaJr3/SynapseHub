import { Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#8b7cf6';

function PrimaryView() {
  const sessions = [
    {
      title: 'Algebra clinic',
      when: 'Mon 10:00',
      state: 'Scheduled',
      tone: 'neutral' as const,
      joined: '—',
    },
    {
      title: 'Reading circle',
      when: 'Mon 14:30',
      state: 'Live',
      tone: 'accent' as const,
      joined: '18 joined',
    },
    {
      title: 'Science workshop',
      when: 'Tue 09:15',
      state: 'Ended',
      tone: 'signal' as const,
      joined: '22 attended',
    },
    {
      title: 'Revision Q&A',
      when: 'Wed 16:00',
      state: 'Cancelled',
      tone: 'caution' as const,
      joined: '—',
    },
  ];

  return (
    <>
      <Label x={28} y={34} text="Class schedule" size={15} strong />
      <Chip x={454} y={20} text="Local time zone" width={158} />

      <Row x={28} y={52} width={584} height={196}>
        {sessions.map((session, index) => {
          const x = 44 + index * 142;
          const [firstWord = '', ...restWords] = session.title.split(' ');
          return (
            <g key={session.title}>
              <rect
                x={x}
                y={68}
                width={126}
                height={164}
                rx={10}
                className="fill-panel-strong stroke-line"
                strokeWidth={1}
              />
              <StatusDot x={x + 14} y={86} hue={HUE} />
              <Label
                x={x + 26}
                y={90}
                text={session.when}
                size={10}
                tone="subtle"
                mono
              />
              <Label x={x + 14} y={126} text={firstWord} size={12} strong />
              <Label
                x={x + 14}
                y={144}
                text={restWords.join(' ')}
                size={12}
                strong
              />
              <Chip
                x={x + 12}
                y={160}
                text={session.state}
                tone={session.tone}
                width={102}
                fontSize={10}
              />
              <Label
                x={x + 14}
                y={206}
                text={session.joined}
                size={10}
                tone="muted"
                mono
              />
              <Label
                x={x + 14}
                y={222}
                text="Materials attached"
                size={10}
                tone="subtle"
              />
            </g>
          );
        })}
      </Row>

      <Row x={28} y={262} width={286} height={92}>
        <Label x={44} y={288} text="Low-bandwidth profile" size={12} strong />
        <Label
          x={44}
          y={308}
          text="Video off · audio priority · text chat"
          size={11}
          tone="subtle"
        />
        <Chip
          x={44}
          y={318}
          text="Audio + text only"
          tone="accent"
          width={150}
          fontSize={10}
        />
      </Row>
      <Row x={326} y={262} width={286} height={92}>
        <Label x={342} y={288} text="Asynchronous follow-up" size={12} strong />
        <Label
          x={342}
          y={308}
          text="Summary, assignments and answers"
          size={11}
          tone="subtle"
        />
        <Chip
          x={342}
          y={318}
          text="4 learners caught up"
          width={150}
          fontSize={10}
        />
      </Row>
    </>
  );
}

function DetailView() {
  const participants = ['K. Mwale', 'T. Banda', 'J. Phiri', 'S. Nkosi'];
  const questions = ['Can we revisit question 4?', 'Where is the worksheet?'];

  return (
    <>
      <Label
        x={28}
        y={34}
        text="Live session · low bandwidth"
        size={15}
        strong
      />
      <Chip x={470} y={20} text="Video off" tone="caution" width={142} />

      <Row x={28} y={54} width={360} height={300}>
        <Label x={44} y={80} text="Audio participants" size={12} strong />
        {participants.map((name, index) => {
          const y = 98 + index * 46;
          return (
            <Row key={name} x={44} y={y} width={328} height={38}>
              <circle cx={68} cy={y + 19} r={11} className="fill-accent/15" />
              <Label
                x={68}
                y={y + 23}
                text={name.slice(0, 1)}
                size={11}
                tone="accent"
                anchor="middle"
              />
              <Label x={90} y={y + 23} text={name} size={12} />
              <Label
                x={340}
                y={y + 23}
                text="mic on"
                size={10}
                tone="subtle"
                anchor="end"
                mono
              />
            </Row>
          );
        })}
        <Label x={44} y={300} text="Reconnecting" size={11} tone="muted" mono />
        <Label
          x={44}
          y={318}
          text="Audio only — provider reports weak uplink"
          size={11}
          tone="subtle"
        />
        <Chip
          x={44}
          y={326}
          text="Retry media"
          tone="accent"
          width={118}
          fontSize={10}
        />
      </Row>

      <Row x={404} y={54} width={208} height={142}>
        <Label x={420} y={80} text="Chat" size={12} strong />
        <Label
          x={420}
          y={104}
          text="Teacher: slide 3 attached"
          size={11}
          tone="muted"
        />
        <Label
          x={420}
          y={124}
          text="K. Mwale: audio ok now"
          size={11}
          tone="muted"
        />
        <Label
          x={420}
          y={144}
          text="T. Banda: thank you"
          size={11}
          tone="muted"
        />
        <Label x={420} y={176} text="Typing…" size={10} tone="subtle" mono />
      </Row>

      <Row x={404} y={212} width={208} height={142}>
        <Label x={420} y={238} text="Question queue" size={12} strong />
        {questions.map((question, index) => (
          <g key={question}>
            <circle
              cx={426}
              cy={258 + index * 34}
              r={8}
              className="fill-accent/15"
            />
            <Label
              x={426}
              y={262 + index * 34}
              text={String(index + 1)}
              size={10}
              tone="accent"
              anchor="middle"
            />
            <Label
              x={442}
              y={262 + index * 34}
              text={question}
              size={10}
              tone="muted"
            />
          </g>
        ))}
        <Chip
          x={420}
          y={318}
          text="Attendance recorded"
          tone="signal"
          width={158}
          fontSize={10}
        />
      </Row>
    </>
  );
}

export function ClassConnectVisual({
  view,
  compact = false,
}: {
  view: string;
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="ClassConnect · sessions and live room"
      viewLabel={view === 'primary' ? 'Weekly schedule' : 'Low-bandwidth room'}
      description={
        view === 'primary'
          ? 'A weekly session schedule showing scheduled, live, ended and cancelled states with attendance counts and a low-bandwidth participation profile.'
          : 'A live classroom stage with audio participants, a video-off notice, a chat panel and a numbered question queue.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
