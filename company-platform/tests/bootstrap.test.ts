/**
 * The first-request bootstrap, which is what makes a fresh production database
 * serve a real catalogue instead of an empty one.
 *
 * On 2026-10-29 the site deployed green and every page returned "a server-side
 * exception has occurred": the tables did not exist, because nothing ran the
 * migrations. This suite pins the three properties that turned that into a
 * one-time failure rather than a permanent one — it creates the schema, it writes
 * the content, and it does neither twice.
 */
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bootstrapDatabase } from '@/lib/db/bootstrap';
import { getDb, rowsOf } from '@/lib/db';

async function count(table: string): Promise<number> {
  const rows = rowsOf(
    await getDb().execute(sql.raw(`SELECT count(*)::int AS n FROM platform."${table}"`)),
  );
  return Number(rows[0]?.n ?? 0);
}

describe('bootstrap', () => {
  it('seeds a fresh database on first call and reports what it did', async () => {
    expect(await count('companies')).toBe(0);

    const first = await bootstrapDatabase();
    expect(first).toEqual({ seeded: true });

    // The public catalogue: two companies, their solutions, and one case study per
    // product. These are the rows every public page reads.
    expect(await count('companies')).toBe(2);
    expect(await count('products')).toBe(25);
    expect(await count('case_studies')).toBe(25);
    expect(await count('solution_areas')).toBeGreaterThan(0);
  });

  it('does not create the demo sign-in accounts in a deployment', async () => {
    // `demo-password-123` is published in the README, and an EDITOR can change
    // company content. Those accounts belong on a laptop, not on a public URL.
    expect(await count('users')).toBe(0);
    expect(await count('person_profiles')).toBe(0);
  });

  it('is idempotent: a second call writes nothing', async () => {
    const before = await count('products');
    const second = await bootstrapDatabase();
    expect(second).toEqual({ seeded: false });
    expect(await count('products')).toBe(before);
  });

  it('publishes the catalogue, so the public queries return it', async () => {
    // Seeding rows in the wrong state would pass every count above and still render
    // an empty site: `listPublishedProducts` filters on `PUBLISHED`.
    const rows = rowsOf(
      await getDb().execute(
        sql.raw(`SELECT count(*)::int AS n FROM platform.products WHERE publication_state = 'PUBLISHED'`),
      ),
    );
    expect(Number(rows[0]?.n ?? 0)).toBe(25);
  });
});
