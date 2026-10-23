'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { getSessionActor } from '@/lib/auth';
import {
  AuthorizationError,
  requireCompanyContentAuthority,
  requirePlatformAdmin,
} from '@/lib/authorization';
import { getDb } from '@/lib/db';
import {
  auditEvents,
  caseStudies,
  companies,
  contactSubmissions,
  products,
  solutionAreas,
} from '@/lib/db/schema';
import {
  contentPublicationSchema,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/validation';

function errorResult(error: unknown): ActionResult {
  if (error instanceof AuthorizationError) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

const TABLES = {
  PRODUCT: products,
  CASE_STUDY: caseStudies,
  SOLUTION: solutionAreas,
} as const;

/**
 * Company-scoped content publishing. The actor must hold EDITOR or ADMIN in
 * the company that owns the record — a company editor cannot touch the other
 * company's catalogue.
 */
export async function setPublicationStateAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = await getSessionActor();
    const parsed = contentPublicationSchema.safeParse({
      entityType: formData.get('entityType'),
      entityId: formData.get('entityId'),
      publicationState: formData.get('publicationState'),
    });
    if (!parsed.success) {
      return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
    }
    const db = getDb();
    const { entityType, entityId, publicationState } = parsed.data;
    const table = TABLES[entityType];

    let companyId: string | null = null;
    if (entityType === 'PRODUCT') {
      const [row] = await db
        .select({ companyId: products.companyId })
        .from(products)
        .where(eq(products.id, entityId))
        .limit(1);
      companyId = row?.companyId ?? null;
    } else if (entityType === 'CASE_STUDY') {
      const [row] = await db
        .select({ companyId: products.companyId })
        .from(caseStudies)
        .innerJoin(products, eq(products.id, caseStudies.productId))
        .where(eq(caseStudies.id, entityId))
        .limit(1);
      companyId = row?.companyId ?? null;
    } else {
      const [row] = await db
        .select({ companyId: solutionAreas.companyId })
        .from(solutionAreas)
        .where(eq(solutionAreas.id, entityId))
        .limit(1);
      companyId = row?.companyId ?? null;
    }
    if (!companyId) return { ok: false, error: 'Record not found.' };

    await requireCompanyContentAuthority(actor, companyId, db);

    const [updated] = await db
      .update(table)
      .set({ publicationState, updatedAt: new Date() })
      .where(eq(table.id, entityId))
      .returning({ id: table.id });
    if (!updated) return { ok: false, error: 'Record not found.' };

    await db.insert(auditEvents).values({
      actorId: actor?.id ?? null,
      action: `content.publish_${publicationState.toLowerCase()}`,
      resourceType: entityType.toLowerCase(),
      resourceId: entityId,
      metadata: { companyId, publicationState },
    });
    revalidatePath('/admin/products');
    revalidatePath('/admin/case-studies');
    revalidatePath('/admin/solutions');
    revalidatePath('/products');
    revalidatePath('/case-studies');
    revalidatePath('/solutions');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function getAdminOverview(): Promise<{
  contactSubmissions: Array<{
    id: string;
    company: string;
    name: string;
    email: string;
    subject: string;
    delivery: string;
    createdAt: Date;
  }>;
}> {
  const db = getDb();
  const rows = await db
    .select({
      id: contactSubmissions.id,
      company: companies.name,
      name: contactSubmissions.name,
      email: contactSubmissions.email,
      subject: contactSubmissions.subject,
      delivery: contactSubmissions.delivery,
      createdAt: contactSubmissions.createdAt,
    })
    .from(contactSubmissions)
    .innerJoin(companies, eq(companies.id, contactSubmissions.companyId));
  return { contactSubmissions: rows };
}

export async function requireAdminActor() {
  return requirePlatformAdmin(await getSessionActor());
}
