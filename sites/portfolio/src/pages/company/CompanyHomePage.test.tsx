import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@/hooks/useTheme';
import { CompanyShell } from '@/App';
import { contactEmails } from '@/config/profile';
import { PORTFOLIO_BASE, portfolioPath, isPortfolioPath } from '@/config/site';

function renderCompany(route = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <CompanyShell />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('isPortfolioPath', () => {
  it('recognises the portfolio section and nothing else', () => {
    expect(isPortfolioPath('/portfolio')).toBe(true);
    expect(isPortfolioPath('/portfolio/projects')).toBe(true);
    expect(isPortfolioPath('/portfolio/projects/netscope')).toBe(true);
    expect(isPortfolioPath('/')).toBe(false);
    expect(isPortfolioPath('/portfolioish')).toBe(false);
  });
});

describe('portfolioPath', () => {
  it('builds public portfolio URLs', () => {
    expect(portfolioPath()).toBe('/portfolio');
    expect(portfolioPath('/')).toBe('/portfolio');
    expect(portfolioPath('/projects')).toBe('/portfolio/projects');
    expect(portfolioPath('about')).toBe('/portfolio/about');
    expect(PORTFOLIO_BASE).toBe('/portfolio');
  });
});

describe('contact recipients', () => {
  it('defaults to the two nominated inboxes', () => {
    expect(contactEmails).toEqual(['mwangalamackjrv2@gmail.com', 'mackjrv2@gmail.com']);
  });
});

describe('company site', () => {
  it('renders a landing page at the root and links into the portfolio', async () => {
    renderCompany('/');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /defensive security tools and full-stack products/i,
      }),
    ).toBeInTheDocument();

    const main = screen.getByRole('main');
    const portfolioLinks = within(main)
      .getAllByRole('link')
      .filter((link) => (link.getAttribute('href') ?? '').startsWith('/portfolio'));
    expect(portfolioLinks.length).toBeGreaterThan(0);
  });

  it('publishes both contact addresses', async () => {
    renderCompany('/');
    await screen.findByRole('heading', { level: 1 });
    for (const email of contactEmails) {
      expect(screen.getAllByText(email).length).toBeGreaterThan(0);
    }
  });

  it('shows honest framing rather than unverifiable claims', async () => {
    renderCompany('/');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(/never claim more than the evidence supports/i)).toBeInTheDocument();
    // No fabricated social proof vocabulary anywhere on the page.
    const text = screen.getByRole('main').textContent ?? '';
    for (const phrase of ['trusted by', 'certified', 'award-winning', 'fortune 500']) {
      expect(text.toLowerCase()).not.toContain(phrase);
    }
  });

  it('explains the portfolio location on an unknown company URL', async () => {
    renderCompany('/does-not-exist');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('heading', { level: 1, name: /doesn’t exist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '/portfolio' })).toHaveAttribute('href', '/portfolio');
  });
});
