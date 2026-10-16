import { Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#4fb3a6';

function PrimaryView() {
  const resources = [
    {
      title: 'Water cycle worksheet',
      licence: 'CC BY-SA 4.0',
      language: 'EN',
      offline: 'Downloadable',
    },
    {
      title: 'Local weather prompts',
      licence: 'CC BY 4.0',
      language: 'EN · NYA',
      offline: 'Downloadable',
    },
    {
      title: 'Reading: market day',
      licence: 'Licence unclear',
      language: 'EN',
      offline: 'Link only',
    },
    {
      title: 'Audio: counting songs',
      licence: 'CC0',
      language: 'BEM',
      offline: 'Downloadable',
    },
  ];

  return (
    <>
      <Label x={28} y={34} text="Resource catalogue" size={15} strong />
      <Chip x={468} y={20} text="Licence-aware" tone="accent" width={144} />

      {resources.map((resource, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 28 + column * 300;
        const y = 52 + row * 118;

        return (
          <Row key={resource.title} x={x} y={y} width={284} height={106}>
            <StatusDot x={x + 18} y={y + 22} hue={HUE} />
            <Label
              x={x + 30}
              y={y + 26}
              text={resource.title}
              size={12}
              strong
            />
            <Label
              x={x + 18}
              y={y + 48}
              text="source + creator recorded"
              size={10}
              tone="subtle"
              mono
            />
            <Chip
              x={x + 16}
              y={y + 60}
              text={resource.licence}
              tone={
                resource.licence === 'Licence unclear' ? 'caution' : 'signal'
              }
              fontSize={10}
            />
            <Chip
              x={x + 16}
              y={y + 84}
              text={`Lang ${resource.language}`}
              fontSize={10}
              width={100}
            />
            <Label
              x={x + 128}
              y={y + 92}
              text={resource.offline}
              size={10}
              tone="muted"
            />
          </Row>
        );
      })}

      <Row x={28} y={290} width={584} height={64}>
        <Label x={44} y={316} text="Reuse guidance" size={12} strong />
        <Label
          x={44}
          y={336}
          text="Adaptation and redistribution permitted · attribution required · licence missing on one resource"
          size={11}
          tone="subtle"
        />
      </Row>
    </>
  );
}

function DetailView() {
  return (
    <>
      <Label
        x={28}
        y={34}
        text="Translation review · Water cycle worksheet"
        size={15}
        strong
      />
      <Chip x={470} y={20} text="Draft → approved" width={142} />

      <Row x={28} y={52} width={286} height={216}>
        <Label
          x={44}
          y={78}
          text="Source · English"
          size={11}
          tone="subtle"
          mono
        />
        <Label
          x={44}
          y={106}
          text="Water moves between the"
          size={12}
          tone="muted"
        />
        <Label
          x={44}
          y={126}
          text="ocean, the air and the"
          size={12}
          tone="muted"
        />
        <Label
          x={44}
          y={146}
          text="land in a continuous cycle."
          size={12}
          tone="muted"
        />
        <Chip
          x={44}
          y={170}
          text="CC BY-SA 4.0"
          tone="signal"
          width={124}
          fontSize={10}
        />
        <Label
          x={44}
          y={212}
          text="Attribution kept with the adaptation"
          size={10}
          tone="subtle"
        />
        <Label
          x={44}
          y={232}
          text="Source version: 2024-11"
          size={10}
          tone="subtle"
          mono
        />
      </Row>

      <Row x={326} y={52} width={286} height={216} emphasis>
        <Label
          x={342}
          y={78}
          text="Target · draft translation"
          size={11}
          tone="accent"
          mono
        />
        <Label x={342} y={106} text="Machine draft awaiting" size={12} />
        <Label x={342} y={126} text="human review before it" size={12} />
        <Label x={342} y={146} text="can be published." size={12} />
        <Chip
          x={342}
          y={170}
          text="Not approved"
          tone="caution"
          width={118}
          fontSize={10}
        />
        <Label
          x={342}
          y={212}
          text="Reviewer comment: check the term"
          size={10}
          tone="subtle"
        />
        <Label
          x={342}
          y={232}
          text="used for “cycle” in this language."
          size={10}
          tone="subtle"
        />
      </Row>

      <Row x={28} y={284} width={584} height={70}>
        <Label x={44} y={310} text="Contributor checklist" size={12} strong />
        <Label
          x={44}
          y={330}
          text="Rights confirmed · source linked · licence recorded · review completed"
          size={11}
          tone="subtle"
        />
        <Chip x={498} y={308} text="Takedown ready" width={98} fontSize={10} />
      </Row>
    </>
  );
}

export function OpenLearnVisual({
  view,
  compact = false,
}: {
  view: string;
  compact?: boolean;
}) {
  return (
    <VisualFrame
      compact={compact}
      label="OpenLearn Commons · catalogue"
      viewLabel={view === 'primary' ? 'Resource search' : 'Translation review'}
      description={
        view === 'primary'
          ? 'A resource catalogue where each card shows its licence, language, downloadability and an honest note when the licence could not be confirmed.'
          : 'A side-by-side translation review with source attribution on one side and an unapproved machine draft with a reviewer comment on the other.'
      }
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
