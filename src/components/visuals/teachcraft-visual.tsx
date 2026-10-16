import { Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#ef7d92';

function PrimaryView() {
  const outline = [
    'Unit 2 · Energy',
    'Lesson 2.1 — draft',
    'Lesson 2.2 — published',
    'Question bank (14)',
  ];
  const blocks = [
    { type: 'Heading', detail: 'Where energy goes' },
    { type: 'Text', detail: 'Two paragraphs · plain language' },
    { type: 'Image', detail: 'alt: labelled diagram of a leaf' },
    { type: 'Quiz', detail: '3 questions · single choice' },
  ];

  return (
    <>
      <Label
        x={28}
        y={34}
        text="Lesson editor · Energy in ecosystems"
        size={15}
        strong
      />
      <Chip x={474} y={20} text="Saved 12:04" tone="signal" width={138} />

      <Row x={28} y={52} width={196} height={302}>
        <Label
          x={44}
          y={78}
          text="Course outline"
          size={11}
          tone="subtle"
          mono
        />
        {outline.map((item, index) => {
          const y = 92 + index * 40;
          return (
            <g key={item}>
              {index === 1 && (
                <rect
                  x={40}
                  y={y}
                  width={172}
                  height={32}
                  rx={8}
                  className="fill-accent/10"
                />
              )}
              <StatusDot
                x={52}
                y={y + 16}
                hue={index === 1 ? HUE : undefined}
                className={index === 1 ? undefined : 'fill-line-strong'}
              />
              <Label x={64} y={y + 20} text={item} size={11} />
            </g>
          );
        })}
      </Row>

      <Row x={240} y={52} width={372} height={302}>
        <Label
          x={256}
          y={78}
          text="Structured blocks"
          size={11}
          tone="subtle"
          mono
        />
        {blocks.map((block, index) => {
          const y = 92 + index * 62;
          return (
            <g key={block.type}>
              <rect
                x={256}
                y={y}
                width={340}
                height={50}
                rx={10}
                className="fill-panel-strong stroke-line"
                strokeWidth={1}
              />
              <Label
                x={270}
                y={y + 20}
                text={block.type}
                size={10}
                tone="accent"
                mono
              />
              <Label
                x={270}
                y={y + 38}
                text={block.detail}
                size={11}
                tone="muted"
              />
              <Label
                x={584}
                y={y + 20}
                text="⠿"
                size={12}
                tone="subtle"
                anchor="end"
              />
            </g>
          );
        })}
        <Chip
          x={256}
          y={330}
          text="Preview: desktop · mobile"
          width={196}
          fontSize={10}
        />
      </Row>
    </>
  );
}

function DetailView() {
  const versions = [
    { label: 'v3 · working draft', meta: 'you · 2 minutes ago' },
    { label: 'v2 · published', meta: 'approved by reviewer · Tue' },
    { label: 'v1 · archived', meta: 'restored content available' },
  ];

  return (
    <>
      <Label x={28} y={34} text="Review and version history" size={15} strong />
      <Chip x={500} y={20} text="Draft → review" width={112} />

      <Row x={28} y={52} width={584} height={120}>
        <Label x={44} y={78} text="Reviewer comments" size={12} strong />
        <Label
          x={44}
          y={102}
          text="Reviewer: the alt text should name the organism shown."
          size={11}
          tone="muted"
        />
        <Label
          x={44}
          y={122}
          text="You: updated the diagram and the caption."
          size={11}
          tone="muted"
        />
        <Chip
          x={44}
          y={132}
          text="Change summary attached"
          width={190}
          fontSize={10}
        />
      </Row>

      <Label x={28} y={204} text="Version history" size={12} strong />
      {versions.map((version, index) => {
        const y = 216 + index * 46;
        return (
          <Row key={version.label} x={28} y={y} width={584} height={38}>
            <Label x={44} y={y + 24} text={version.label} size={11} />
            <Label
              x={300}
              y={y + 24}
              text={version.meta}
              size={10}
              tone="subtle"
              mono
            />
            <Chip
              x={506}
              y={y + 8}
              text={index === 0 ? 'Restorable' : 'Published'}
              width={90}
              fontSize={10}
            />
          </Row>
        );
      })}

      <Row x={28} y={354} width={584} height={0} />
      <Chip
        x={28}
        y={352}
        text="Export: PDF (static) · HTML (static)"
        width={260}
        fontSize={10}
      />
      <Chip
        x={300}
        y={352}
        text="Interactivity not preserved"
        tone="caution"
        width={214}
        fontSize={10}
      />
    </>
  );
}

export function TeachCraftVisual({
  view,
  compact = false,
}: {
  view: string;
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="TeachCraft · authoring studio"
      viewLabel={view === 'primary' ? 'Lesson editor' : 'Review + versions'}
      description={
        view === 'primary'
          ? 'A lesson editor with a course outline beside structured content blocks for headings, text, an image with alt text and a quiz, plus an autosave indicator.'
          : 'A review panel with reviewer comments above a version list showing a working draft, a published version and an archived version, with export fidelity notes.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
