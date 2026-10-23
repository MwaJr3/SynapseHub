import { projectSlugs } from '@/data/projects';

/**
 * The complete route table. Used by the sitemap generator, the 404 page and
 * the routing tests so the set of valid URLs is defined exactly once.
 */
export const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'monthly' },
  { path: '/projects', priority: '0.9', changefreq: 'weekly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/skills', priority: '0.7', changefreq: 'monthly' },
  { path: '/approach', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'yearly' },
] as const;

export function projectRoutes(): { path: string; priority: string; changefreq: string }[] {
  return projectSlugs.map((slug) => ({
    path: `/projects/${slug}`,
    priority: '0.8',
    changefreq: 'monthly',
  }));
}

export function allRoutes(): { path: string; priority: string; changefreq: string }[] {
  const projectPaths = projectRoutes();
  return [
    staticRoutes.filter((route) => route.path !== '/projects')[0],
    staticRoutes.find((route) => route.path === '/projects'),
    ...projectPaths,
    ...staticRoutes.filter((route) => route.path !== '/' && route.path !== '/projects'),
  ].filter((route): route is { path: string; priority: string; changefreq: string } => Boolean(route));
}
