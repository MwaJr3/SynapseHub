import { Chip, Label, Row, StatusDot, VisualFrame } from './primitives';

const HUE = '#6366f1';

function PrimaryView() {
  const jobs = [
    {
      title: 'Senior Backend Engineer',
      org: 'NovaStack (fictional)',
      type: 'Full-time · Remote',
      state: 'Verified company',
      tone: 'signal' as const,
    },
    {
      title: 'Security Engineer',
      org: 'CyberShield (fictional)',
      type: 'Full-time · Hybrid',
      state: 'Verified company',
      tone: 'signal' as const,
    },
    {
      title: 'Technical Writer',
      org: 'OpenGrid (fictional)',
      type: 'Contract · Remote',
      state: 'Unverified',
      tone: 'caution' as const,
    },
    {
      title: 'Analytics Engineer',
      org: 'DataSphere (fictional)',
      type: 'Full-time · Remote',
      state: 'Unverified',
      tone: 'caution' as const,
    },
  ];

  return (
    <>
      <Label x={28} y={34} text="Job board · honest filters" size={15} strong />
      <Chip x={452} y={20} text="One application per role" tone="accent" width={188} />

      {jobs.map((job, index) => {
        const y = 52 + index * 78;
        return (
          <Row key={job.title} x={28} y={y} width={584} height={68}>
            <StatusDot x={46} y={y + 22} hue={HUE} />
            <Label x={62} y={y + 26} text={job.title} size={12} strong />
            <Label x={62} y={y + 46} text={`${job.org} · ${job.type}`} size={10} tone="subtle" />
            <Chip x={470} y={y + 18} text={job.state} tone={job.tone} fontSize={10} width={124} />
          </Row>
        );
      })}

      <Row x={28} y={372} width={584} height={48}>
        <Label x={44} y={392} text="Search explanation" size={11} strong />
        <Label
          x={44}
          y={408}
          text="Filtered by skill “TypeScript”, remote workplaces; newest first."
          size={10}
          tone="subtle"
        />
      </Row>
    </>
  );
}

function DetailView() {
  const history = [
    { label: 'Submitted', note: '2026-10-01 · candidate' },
    { label: 'Under review', note: '2026-10-03 · hiring team' },
    { label: 'Shortlisted', note: '2026-10-05 · hiring team' },
  ];

  return (
    <>
      <Label x={28} y={34} text="Candidate file · append-only history" size={15} strong />
      <Chip x={468} y={20} text="Notes stay private" tone="accent" width={144} />

      <Row x={28} y={52} width={276} height={180}>
        <Label x={44} y={78} text="Application" size={11} strong />
        <Label x={44} y={100} text="Senior Backend Engineer" size={12} tone="muted" />
        <Label x={44} y={122} text="Résumé: resume.pdf (private)" size={10} tone="subtle" mono />
        <Label x={44} y={144} text="Screening: 1 answer recorded" size={10} tone="subtle" />
        <Chip x={44} y={160} text="Status: SHORTLISTED" tone="signal" fontSize={10} width={150} />
        <Label x={44} y={200} text="Email hidden — profile visibility" size={10} tone="subtle" />
      </Row>

      <Row x={320} y={52} width={292} height={180}>
        <Label x={336} y={78} text="Status history (append-only)" size={11} strong />
        {history.map((entry, index) => (
          <g key={entry.label}>
            <StatusDot x={344} y={104 + index * 38} hue={HUE} />
            <Label x={360} y={108 + index * 38} text={entry.label} size={11} strong />
            <Label x={360} y={124 + index * 38} text={entry.note} size={9} tone="subtle" mono />
          </g>
        ))}
      </Row>

      <Row x={28} y={252} width={584} height={120}>
        <Label x={44} y={280} text="Private hiring notes" size={11} strong />
        <Label
          x={44}
          y={302}
          text="“Strong systems background; schedule the technical conversation.”"
          size={11}
          tone="muted"
        />
        <Label
          x={44}
          y={326}
          text="Never included in any applicant-facing query — enforced in the data layer."
          size={10}
          tone="subtle"
        />
        <Chip x={44} y={336} text="UNIQUE(job, applicant)" tone="neutral" fontSize={10} width={170} />
      </Row>
    </>
  );
}

export function WorkNicheVisual({
  view,
  compact = false,
}: {
  view: 'primary' | 'detail';
  compact?: boolean;
}) {
  return (
    <VisualFrame
      label="WorkNiche job marketplace"
      viewLabel={view === 'primary' ? 'Job board' : 'Candidate file'}
      description={
        view === 'primary'
          ? 'Illustrative preview of the WorkNiche job board: four fictional listings with verification labels and a plain-language search explanation.'
          : 'Illustrative preview of a candidate file: status history, a private hiring note and the one-application-per-role constraint.'
      }
      compact={compact}
    >
      {view === 'primary' ? <PrimaryView /> : <DetailView />}
    </VisualFrame>
  );
}
