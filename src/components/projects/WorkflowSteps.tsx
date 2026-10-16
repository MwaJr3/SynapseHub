import type { WorkflowStep } from '@/types';

interface WorkflowStepsProps {
  steps: WorkflowStep[];
  projectName: string;
}

/**
 * Primary workflow as an ordered list. Rendered as `<ol>` so the sequence is
 * conveyed semantically, not by the visual numbering alone.
 */
export function WorkflowSteps({ steps, projectName }: WorkflowStepsProps) {
  return (
    <ol className="grid gap-5 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li key={step.title} className="rail rail-node">
          <p className="mono-meta">
            Step {index + 1} of {steps.length}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{step.title}</p>
          <p className="prose-body mt-1.5 text-sm">{step.description}</p>
        </li>
      ))}
      <li className="sr-only">{`End of the ${projectName} workflow.`}</li>
    </ol>
  );
}
