import { Link } from 'react-router-dom';
import { evidenceProjects, skillGroups, type Skill } from '@/data/skills';
import { projects, technologyIndex } from '@/data/projects';
import { usePageMeta } from '@/lib/seo';
import { cn } from '@/lib/cn';
import { Container, Section, SectionSpacing } from '@/components/ui/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { StateBlock } from '@/components/ui/StateBlock';
import { AccentScope } from '@/components/project/AccentScope';

export default function SkillsPage() {
  usePageMeta({
    title: 'Skills — Mwangala',
    description:
      'Technical skills grouped by area and tied to the projects where each one was actually used. No proficiency percentages — every skill links to evidence.',
    path: '/skills',
  });

  const techIndex = technologyIndex();

  return (
    <>
      <PageHeader
        eyebrow="Skills"
        title="Every skill here points at something I built"
        lead="No proficiency bars and no percentages — there is no honest measurement behind “Python 95%”. Instead, each entry names the projects where the technology or practice was actually used, and links straight to the case study. Areas I am still studying are listed separately at the bottom, clearly marked as interests."
      />

      <Section tone="light">
        <SectionSpacing>
          <Container>
            <nav aria-label="Skill groups" className="mb-10 flex flex-wrap gap-2">
              {skillGroups.map((group) => (
                <a
                  key={group.id}
                  href={`#group-${group.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-accent-line hover:text-fg"
                >
                  {group.title}
                  <span className="rounded-full bg-surface-sunken px-1.5 py-px font-mono text-[0.65rem] text-fg-subtle">
                    {group.skills.length}
                  </span>
                </a>
              ))}
            </nav>

            <div className="flex flex-col gap-14">
              {skillGroups.map((group) => (
                <section key={group.id} id={`group-${group.id}`} className="scroll-mt-24">
                  <SectionHeading
                    eyebrow={group.id === 'interests' ? 'Not yet shipped' : 'Demonstrated in projects'}
                    title={group.title}
                    description={group.summary}
                  />

                  <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                    {group.skills.map((skill) => (
                      <li key={skill.name}>
                        <SkillCard skill={skill} interest={group.id === 'interests'} />
                      </li>
                    ))}
                  </ul>

                  {group.id === 'interests' ? (
                    <p className="mt-5 text-xs leading-relaxed text-fg-subtle">
                      Listed separately so these are never mistaken for demonstrated project experience.
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          </Container>
        </SectionSpacing>
      </Section>

      {/* ------------------------------------------------- technology index -- */}
      <Section tone="dark" className="border-y border-line">
        <SectionSpacing>
          <Container>
            <SectionHeading
              eyebrow="Cross-reference"
              title="Where each technology shows up"
              description={`Derived directly from the project registry — ${techIndex.length} distinct technologies across ${projects.length} projects. Nothing here is maintained by hand.`}
            />

            <div className="mt-10 overflow-hidden rounded-xl border border-line bg-surface">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Technologies used across the portfolio and the projects that use each one
                </caption>
                <thead>
                  <tr className="border-b border-line bg-surface-sunken">
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-fg">
                      Technology
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-fg">
                      Used in
                    </th>
                    <th scope="col" className="hidden px-4 py-3 text-right font-semibold text-fg sm:table-cell">
                      Projects
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {techIndex.map(({ tech, projects: users }) => (
                    <tr key={tech} className="border-b border-line last:border-b-0">
                      <th scope="row" className="px-4 py-3 text-left align-top font-mono text-[0.82rem] font-medium text-fg">
                        {tech}
                      </th>
                      <td className="px-4 py-3 align-top">
                        <ul className="flex flex-wrap gap-1.5">
                          {users.map((project) => (
                            <li key={project.slug}>
                              <AccentScope accent={project.accent} as="span">
                                <Link
                                  to={`/projects/${project.slug}`}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-sunken px-2 py-0.5 text-[0.72rem] text-fg-muted transition-colors hover:border-[var(--prj-line)] hover:text-fg"
                                >
                                  <span aria-hidden className="size-1.5 rounded-full bg-[var(--prj)]" />
                                  {project.name}
                                </Link>
                              </AccentScope>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="hidden px-4 py-3 text-right align-top font-mono text-xs text-fg-subtle sm:table-cell">
                        {users.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </SectionSpacing>
      </Section>

      {/* ------------------------------------------- skills per project ----- */}
      <Section tone="light">
        <SectionSpacing>
          <Container>
            <SectionHeading
              eyebrow="By project"
              title="What each project exercises"
              description="The same evidence from the other direction: pick a project and see which skills it demonstrates."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const skills = skillGroups.flatMap((group) =>
                  group.skills.filter((skill) => skill.evidence.includes(project.slug)),
                );
                return (
                  <AccentScope key={project.slug} accent={project.accent}>
                    <Panel className="h-full bg-surface" id={`project-${project.slug}`}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[0.98rem] font-semibold text-fg">
                          <Link to={`/projects/${project.slug}`} className="hover:text-[var(--prj)]">
                            {project.name}
                          </Link>
                        </h3>
                        <span
                          aria-hidden
                          className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[var(--prj)]"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-fg-subtle">{project.categories[0]}</p>
                      {skills.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {skills.map((skill) => (
                            <li key={skill.name}>
                              <Badge tone="neutral">{skill.name}</Badge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-fg-subtle">
                          Skills for this project are still being mapped in the skills registry.
                        </p>
                      )}
                    </Panel>
                  </AccentScope>
                );
              })}
            </div>

            <div className="mt-12">
              <StateBlock tone="neutral" icon="info" title="How to read this page">
                <p>
                  “Demonstrated” means the technology or practice was used in a project documented in this
                  portfolio, with a case study explaining how. “Interest” means I am actively studying it
                  without a shipped project to point at yet. Nothing in between is claimed.
                </p>
              </StateBlock>
            </div>
          </Container>
        </SectionSpacing>
      </Section>
    </>
  );
}

function SkillCard({ skill, interest }: { skill: Skill; interest: boolean }) {
  const evidence = evidenceProjects(skill);

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-xl border bg-surface p-4 transition-colors',
        interest ? 'border-dashed border-line-strong' : 'border-line hover:border-accent-line',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[0.95rem] font-semibold text-fg">{skill.name}</h3>
        {interest ? <Badge tone="warning">learning interest</Badge> : null}
      </div>
      <p className="mt-2 flex-1 text-[0.85rem] leading-relaxed text-fg-muted">{skill.note}</p>

      {evidence.length > 0 ? (
        <ul className="mt-3.5 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {evidence.map((project) => (
            <li key={project.slug}>
              <AccentScope accent={project.accent} as="span">
                <Link
                  to={`/projects/${project.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-sunken px-2 py-0.5 text-[0.72rem] text-fg-muted transition-colors hover:border-[var(--prj-line)] hover:text-fg"
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-[var(--prj)]" />
                  {project.name}
                </Link>
              </AccentScope>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3.5 flex items-center gap-1.5 border-t border-line pt-3 text-[0.72rem] text-fg-subtle">
          <Icon name="book" size={13} aria-hidden />
          No project evidence yet
        </p>
      )}
    </article>
  );
}
