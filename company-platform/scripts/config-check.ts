#!/usr/bin/env tsx
/**
 * `npm run config:check` — what this deployment is and is not configured to do.
 *
 * Exits non-zero when something deployment-critical is missing, so a build or a
 * CI step can refuse to ship a site that would 500 or silently drop messages.
 * Prints variable *names*, never values.
 *
 * The contact-email and assistant-model items are optional: the pages report
 * their own state honestly, so a deployment without them is degraded, not broken.
 * `--strict` makes them required too, for the day they matter to a release.
 */
import { configReport, formatConfigReport } from '../src/lib/config-check';

const report = configReport();
console.log(formatConfigReport(report));

const strict = process.argv.includes('--strict');
const optionalMissing = report.checks.filter(
  (check) => check.state === 'optional' && check.missing.length > 0,
);

if (!report.ready || (strict && optionalMissing.length > 0)) process.exit(1);
process.exit(0);
