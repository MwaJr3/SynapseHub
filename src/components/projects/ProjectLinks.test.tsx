import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from './ProjectCard';
import { ProjectExternalActions } from './ProjectExternalActions';
import { DeploymentPanel } from './DeploymentPanel';
import { renderWithRouter } from '@/test/render-app';
import { getProject } from '@/data/projects';
import { connectProjects, catalogue } from '@/data/projects';

const learnbridge = getProject('learnbridge')!;

describe('project card', () => {
  it('always offers the internal case study', () => {
    renderWithRouter(<ProjectCard project={learnbridge} />);

    expect(
      screen.getByRole('heading', { name: 'LearnBridge' }),
    ).toBeInTheDocument();
    const caseStudyLinks = screen.getAllByRole('link', {
      name: /learnbridge|view case study/i,
    });
    expect(
      caseStudyLinks.some(
        (link) => link.getAttribute('href') === '/projects/learnbridge',
      ),
    ).toBe(true);
  });

  it('shows the unconnected note instead of dead external buttons', () => {
    renderWithRouter(<ProjectCard project={learnbridge} />);

    expect(
      screen.queryByRole('link', { name: /live demo/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /source code/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/application and source not yet connected/i),
    ).toBeInTheDocument();
  });

  it('renders external actions once a project is connected', async () => {
    const connected = connectProjects(
      {
        learnbridge: {
          liveDemoUrl: 'https://learnbridge-demo.org',
          repositoryUrl: 'https://github.com/MwaJr3/learnbridge',
        },
      },
      catalogue,
    ).find((project) => project.slug === 'learnbridge')!;

    renderWithRouter(<ProjectCard project={connected} />);

    const demo = screen.getByRole('link', { name: /live demo/i });
    const source = screen.getByRole('link', { name: /source code/i });

    expect(demo).toHaveAttribute('href', 'https://learnbridge-demo.org/');
    expect(source).toHaveAttribute(
      'href',
      'https://github.com/MwaJr3/learnbridge',
    );
    expect(demo).toHaveAttribute('rel', 'noopener noreferrer');
    expect(demo).toHaveAttribute('target', '_blank');
    expect(screen.getByText(/demo connected/i)).toBeInTheDocument();
  });
});

describe('external actions component', () => {
  it('renders nothing at all when no URL is configured', () => {
    const { container } = renderWithRouter(
      <ProjectExternalActions project={learnbridge} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('deployment panel', () => {
  it('states plainly that nothing is connected yet', () => {
    renderWithRouter(<DeploymentPanel project={learnbridge} />);

    expect(screen.getAllByText(/not yet connected/i)).toHaveLength(2);
    expect(screen.getByText(/live application/i)).toBeInTheDocument();
    expect(screen.getByText(/source repository/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /live demo/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the demo note and links when connected', async () => {
    const connected = connectProjects(
      {
        learnbridge: {
          liveDemoUrl: 'https://learnbridge-demo.org',
          repositoryUrl: 'https://github.com/MwaJr3/learnbridge',
          demoNote: 'Seeded demo learner with resettable synthetic data.',
        },
      },
      catalogue,
    ).find((project) => project.slug === 'learnbridge')!;

    renderWithRouter(<DeploymentPanel project={connected} />);

    expect(screen.getAllByText(/^Connected$/i)).toHaveLength(2);
    expect(screen.getByText(/resettable synthetic data/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /live demo/i }),
    ).toBeInTheDocument();
  });
});

describe('case study share control', () => {
  it('reports copy success or failure truthfully', async () => {
    const user = userEvent.setup();

    // Clipboard unavailable: the control must report failure rather than claim success.
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    document.execCommand = () => false;

    const { CopyLinkButton } = await import('./CopyLinkButton');
    renderWithRouter(<CopyLinkButton path="/projects/learnbridge" />);

    await user.click(screen.getByRole('button', { name: /copy link/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/copy failed/i);
  });
});
