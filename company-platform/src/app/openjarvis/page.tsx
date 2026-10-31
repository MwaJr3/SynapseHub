import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge, Section } from '@/components/ui';
import {
  ATTRIBUTION,
  OPENJARVIS_SOURCES,
  PRODUCTS_USING_A_MODEL,
  SERVER_CONTRACT,
  SITE_ASSISTANTS,
  WHAT_IT_IS,
  WHAT_THIS_REPOSITORY_DID,
} from '@/content/openjarvis';
import { externalAnchorProps } from '@/lib/links';

export const metadata: Metadata = {
  title: 'OpenJarvis — the model layer behind the assistants',
  description:
    'What OpenJarvis is, which part of it this platform depends on, and what had to change to point the assistants ' +
    'and two products at a local OpenAI-compatible endpoint.',
};

/**
 * One page, in the order a reader needs it: what the project is, what we
 * actually use, why a local model matters here, and where the sources are.
 *
 * The split between "what OpenJarvis is" and "what this repository did" is the
 * whole design. Presenting somebody else's research framework as our product
 * would be the same failure as inventing a metric.
 */
export default function OpenJarvisPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider accent-text">Model layer</p>
        <h1 className="mt-1 text-2xl font-semibold">OpenJarvis, and what we actually use</h1>
        <p className="mt-2 max-w-prose text-muted">
          The assistants on this site need a language model. Rather than hard-code one vendor, the platform
          speaks OpenAI’s chat-completions protocol and treats the endpoint as configuration. OpenJarvis is
          one of the endpoints that fits — a local one — and this page explains what it is, what we took
          from it, and what we did not.
        </p>
      </header>

      <Section title="Attribution first" id="attribution">
        <p className="mt-1 max-w-prose text-sm text-muted">
          OpenJarvis is an open-source research project from a team we have no connection to. It is licensed
          Apache-2.0. The fork at{' '}
          <a
            href="https://github.com/MwaJr3/OpenJarvis"
            {...externalAnchorProps}
            className="underline"
          >
            github.com/MwaJr3/OpenJarvis
          </a>{' '}
          is a copy kept in sync with upstream, not work we authored — when it was inspected, its{' '}
          <code>main</code> was identical to{' '}
          <a
            href="https://github.com/open-jarvis/OpenJarvis"
            {...externalAnchorProps}
            className="underline"
          >
            open-jarvis/OpenJarvis
          </a>
          .
        </p>
        <p className="mt-2 max-w-prose text-xs text-muted">{ATTRIBUTION}</p>
      </Section>

      <Section title="What OpenJarvis is" id="what-it-is">
        <p className="mt-1 max-w-prose text-sm font-medium">{WHAT_IT_IS.title}</p>
        <p className="mt-1 max-w-prose text-sm text-muted">{WHAT_IT_IS.summary}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {WHAT_IT_IS.primitives.map((primitive) => (
            <li key={primitive.name} className="card">
              <p className="text-sm font-semibold">{primitive.name}</p>
              <p className="mt-1 text-sm text-muted">{primitive.detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-prose text-xs text-muted">
          The five primitives, the engine list and the “personal AI on personal devices” framing are the
          project’s own words, summarised from its site and documentation. Paraphrased here; not measured by
          us.
        </p>
      </Section>

      <Section title="What this platform depends on" id="contract">
        <p className="mt-1 max-w-prose text-sm text-muted">
          Only the HTTP surface. It is read from the server’s own route table, so the page describes a
          contract rather than an expectation.
        </p>
        <dl className="mt-3 grid gap-2">
          {SERVER_CONTRACT.map((row) => (
            <div key={row.label} className="flex flex-wrap gap-x-3 border-b border-line pb-2 last:border-0">
              <dt className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
                {row.label}
              </dt>
              <dd className="text-sm">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="What this repository did about it" id="our-work">
        <p className="mt-1 max-w-prose text-sm text-muted">
          Five things, each checkable at the path beside it. None of them is a fork, a patch, or a
          contribution upstream.
        </p>
        <ol className="mt-3 grid gap-3">
          {WHAT_THIS_REPOSITORY_DID.map((step) => (
            <li key={step.id} className="card">
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.detail}</p>
              <p className="mt-1 text-xs text-muted">
                <code>{step.path}</code>
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Why a local model, for these two companies" id="why">
        <p className="mt-1 max-w-prose text-sm text-muted">
          Both answers the assistants give are grounded in a small corpus written for this site. A model
          that runs beside the application keeps the conversation on the machine that already holds the
          record — no third party receives a visitor’s question about their campus or their incident. That
          is a data-minimisation argument, not a performance claim: a hosted model may well be better at
          the task. The endpoint stays configuration, so a deployment can choose either without a rebuild.
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted">
          The trade-off is honest and boring: a local model needs hardware and has to be installed and kept
          current, while a hosted one needs a subscription and sends the text away. Neither is free of
          maintenance. {SITE_ASSISTANTS.note}
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {SITE_ASSISTANTS.routes.map((route) => (
            <li key={route.href}>
              <Link href={route.href} className="btn btn-primary text-sm">
                {route.label} — {route.company}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="The two products that need a model" id="products">
        <p className="mt-1 max-w-prose text-sm text-muted">
          Both already read an OpenAI-compatible base URL from their environment, so a local OpenJarvis
          server is a configuration value rather than new code. Neither is deployed; nothing below has been
          run against a model in this repository.
        </p>
        <ul className="mt-3 grid gap-3">
          {PRODUCTS_USING_A_MODEL.map((product) => (
            <li key={product.product} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{product.product}</h3>
                <Badge>{product.company}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{product.whatNeedsAModel}</p>
              <p className="mt-2 text-xs">
                <span className="font-semibold">Configuration:</span> <code>{product.configuration}</code>
              </p>
              <p className="mt-1 text-xs text-muted">
                Read at <code>{product.path}</code>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-prose text-xs text-muted">
          TranscriptWise requires an API key even for a local endpoint and refuses a non-HTTPS one in
          production. That is its own deliberate policy; pointing it at OpenJarvis means satisfying both,
          and the honest answer for a local server is that the key is a placeholder the server ignores.
        </p>
      </Section>

      <Section title="How to switch it on" id="enable">
        <p className="mt-1 max-w-prose text-sm text-muted">
          Install and start the server, name an installed model, set two variables. These are the steps the
          documentation gives; they are reproduced here so the page is usable without leaving it.
        </p>
        <pre className="mt-3 overflow-x-auto rounded border border-line bg-[var(--surface)] p-3 text-xs">
          <code>{`# 1. On the machine that will run the model
curl -fsSL open-jarvis.github.io/OpenJarvis/install.sh | bash
jarvis init
jarvis serve            # http://localhost:8000

# 2. List what is actually installed — this is the only default worth having
jarvis model

# 3. Point this platform at it
ASSISTANT_PROVIDER=openjarvis
ASSISTANT_MODEL=<an id from \`jarvis model\`
# no ASSISTANT_API_KEY: a loopback endpoint authenticates nobody`}</code>
        </pre>
        <p className="mt-2 max-w-prose text-xs text-muted">
          A deployment elsewhere cannot reach <code>127.0.0.1</code> on your laptop. The assistants are off
          until an endpoint is set, and they say so on their pages — the platform never shows a composer
          that cannot answer.
        </p>
        <p className="mt-2 max-w-prose text-xs text-muted">
          Check the result without opening a browser:{' '}
          <code>npm run config:check</code> prints every deployment setting by name, never by value.
        </p>
      </Section>

      <Section title="Sources" id="sources">
        <ul className="mt-2 grid gap-2 text-sm">
          {OPENJARVIS_SOURCES.map((source) => (
            <li key={source.href}>
              <a href={source.href} {...externalAnchorProps} className="underline">
                {source.label}
              </a>
              <span className="text-muted"> — {source.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-prose text-xs text-muted">
          Facts on this page were taken from those sources on 2026-10-31. Where something could not be
          verified from them — benchmark figures for particular models, or how well any of this performs on
          a given task — it is not stated.
        </p>
      </Section>
    </div>
  );
}
