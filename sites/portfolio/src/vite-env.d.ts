/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute origin of the deployed site. Empty until a real domain exists. */
  readonly VITE_SITE_URL?: string;
  /** Backend that accepts contact-form submissions. Empty = mailto fallback. */
  readonly VITE_CONTACT_ENDPOINT?: string;
  /** Public contact address. Empty = contact link hidden, never invented. */
  readonly VITE_CONTACT_EMAIL?: string;
  /** Code-hosting account/organisation used to build repository links. */
  readonly VITE_REPO_OWNER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
