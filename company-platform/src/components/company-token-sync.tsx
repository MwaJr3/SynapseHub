/** Applies per-company brand tokens to the document root. */
'use client';

import { useEffect } from 'react';

export function CompanyTokenSync({ companySlug }: { companySlug?: string }) {
  useEffect(() => {
    if (companySlug) {
      document.documentElement.dataset.company = companySlug;
    }
    return () => {
      delete document.documentElement.dataset.company;
    };
  }, [companySlug]);
  return null;
}
