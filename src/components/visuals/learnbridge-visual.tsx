import { Bar, Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#4c9ae8';

function PrimaryView() {
  const courses = [
    {
      title: 'Foundations of Algebra',
      meta: 'Module 3 of 8 · offline pack 24 MB',
      progress: 0.45,
      state: 'Offline ready',
    },
    {
      title: 'Reading for Meaning',
      meta: 'Module 1 of 6 · pack not downloaded',
      progress: 0.1,
      state: 'Online only',
    },
    {
      title: 'Everyday Science',
      meta: 'Module 5 of 5 · offline pack 18 MB',
      progress: 1,
      state: 'Offline ready',
    },
  ];

  return (
    <>
      <Label x={28} y={34} text="My courses" size={15} strong />
      <Chip
        x={470}
        y={20}
        text="3 pending changes"
        tone="caution"
        width={150}
      />

      {courses.map((course, index) => {
        const y = 54 + index * 74;
        return (
          <Row key={course.title} x={28} y={y} width={584} height={62}>
            <Label x={44} y={y + 24} text={course.title} size={13} strong />
            <Label
              x={44}
              y={y + 42}
              text={course.meta}
              size={11}
              tone="subtle"
              mono
            />
            <Bar
              x={44}
              y={y + 50}
              width={300}
              progress={course.progress}
              hue={HUE}
            />
            <Chip
              x={500}
              y={y + 20}
              text={course.state}
              tone={course.state === 'Offline ready' ? 'signal' : 'neutral'}
              width={96}
            />
          </Row>
        );
      })}

      <Row x={28} y={290} width={584} height={64} emphasis>
        <Label x={44} y={314} text="Sync status" size={12} strong />
        <StatusDot x={166} y={310} hue={HUE} />
        <Label
          x={178}
          y={314}
          text="Last successful sync 14:02"
          size={11}
          tone="muted"
          mono
        />
        <Label
          x={44}
          y={338}
          text="Reading progress, 2 quiz attempts and 1 note queued locally"
          size={11}
          tone="subtle"
        />
        <Chip x={486} y={306} text="Retry sync" tone="accent" width={110} />
      </Row>
    </>
  );
}

function DetailView() {
  const events = [
    {
      label: 'Lesson 4 completed',
      when: 'queued 12:41',
      state: 'Pending',
      tone: 'caution' as const,
    },
    {
      label: 'Quiz attempt — 4/5',
      when: 'queued 12:58',
      state: 'Pending',
      tone: 'caution' as const,
    },
    {
      label: 'Note updated',
      when: 'synced 12:20',
      state: 'Synced',
      tone: 'signal' as const,
    },
    {
      label: 'Lesson 3 completed',
      when: 'device clock 11:04',
      state: 'Merged',
      tone: 'accent' as const,
    },
  ];

  return (
    <>
      <Label x={28} y={34} text="Sync queue" size={15} strong />
      <Chip x={28} y={46} text="Event log · append-only" width={186} />
      <Chip x={500} y={20} text="1 conflict" tone="caution" width={112} />

      {events.map((event, index) => {
        const y = 80 + index * 52;
        return (
          <Row key={event.label} x={28} y={y} width={584} height={42}>
            <Label x={44} y={y + 26} text={event.label} size={12} />
            <Label
              x={286}
              y={y + 26}
              text={event.when}
              size={11}
              tone="subtle"
              mono
            />
            <Chip
              x={498}
              y={y + 10}
              text={event.state}
              tone={event.tone}
              width={98}
            />
          </Row>
        );
      })}

      <Row x={28} y={296} width={584} height={58}>
        <StatusDot x={44} y={318} hue="#e0a352" />
        <Label
          x={56}
          y={322}
          text="Conflict: note edited on two devices"
          size={12}
          strong
        />
        <Label
          x={44}
          y={342}
          text="Merge keeps the newer note; lesson completion never decreases."
          size={11}
          tone="subtle"
        />
      </Row>
    </>
  );
}

export function LearnBridgeVisual({
  view,
  compact = false,
}: {
  view: 'primary' | 'detail';
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="LearnBridge · learner library"
      viewLabel={view === 'primary' ? 'Catalogue + sync state' : 'Sync queue'}
      description={
        view === 'primary'
          ? 'A course library where each lesson pack shows whether it is stored offline, above a sync strip reporting pending changes and the last successful sync.'
          : 'An append-only sync queue listing pending, synced and merged progress events with a recoverable conflict note.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
