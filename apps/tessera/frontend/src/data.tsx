/**
 * Your data: take a copy, or delete the account.
 *
 * Both actions are ordinary product features here rather than support tickets,
 * which is why this file is careful about three things:
 *
 * * **The download says what it is.** "Export your data" is a promise; the card
 *   under it lists what is included and what is withheld (passwords, session
 *   keys), so the file is not expected to contain something it never will.
 * * **Deletion shows its work before it happens.** The counts come from the
 *   server, not from a sentence written here, and the confirmation is the
 *   account email typed by hand — a checkbox is one misfired click away from
 *   erasing a year of work.
 * * **Nothing destructive is the default.** The download is the first, styled
 *   action; the delete button is outlined, sits under a warning, and is only
 *   enabled once both fields are filled. It explains what is missing instead of
 *   silently staying grey, because a disabled control is skipped by the keyboard.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError, type DeletionPreview } from './api';
import { Card, ErrorNote, Loading, SectionTitle } from './ui';

const muted = 'text-[color:var(--muted)]';

/** Write a JSON string to the user's downloads. */
function saveJson(filename: string, body: string): void {
  const blob = new Blob([body], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // The blob stays alive until this runs; revoking immediately can cancel the
  // download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Tables shown in the "what is included" list, in the order a person reads them. */
const CONTENT_TABLES: { key: string; label: string }[] = [
  { key: 'learner_profiles', label: 'Profile context' },
  { key: 'assessments', label: 'Diagnostic results' },
  { key: 'retrieval_attempts', label: 'Retrieval answers' },
  { key: 'concepts', label: 'Concepts you wrote' },
  { key: 'concept_edges', label: 'Links between concepts' },
  { key: 'reference_notes', label: 'Notes' },
  { key: 'learning_sessions', label: 'Study sessions' },
  { key: 'quest_progress', label: 'Quest progress' },
  { key: 'xp_entries', label: 'XP awards' },
  { key: 'consent_grants', label: 'App connections' },
];

export function DataControls({ onDeleted }: { onDeleted: (message: string) => void }) {
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [armed, setArmed] = useState(false);

  const statusRef = useRef<HTMLParagraphElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const deleteHeadingRef = useRef<HTMLHeadingElement>(null);

  const loadPreview = useCallback(async () => {
    try {
      setPreview(await api.deletionPreview());
      setPreviewError('');
    } catch (cause) {
      setPreviewError(cause instanceof ApiError ? cause.message : 'Could not read your account.');
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const download = async () => {
    setExporting(true);
    setExportError('');
    setExportStatus('');
    try {
      const bundle = await api.exportAccount();
      const stamp = bundle.generated_at.slice(0, 10);
      saveJson(`tessera-export-${stamp}.json`, `${JSON.stringify(bundle, null, 2)}\n`);
      // The count is the server's, not the browser's guess at how much was written.
      setExportStatus(
        `Downloaded ${bundle.rows.toLocaleString()} record${bundle.rows === 1 ? '' : 's'} across ${
          Object.keys(bundle.manifest).length
        } tables. Your password and session keys are not in the file.`,
      );
      statusRef.current?.focus();
    } catch (cause) {
      setExportError(cause instanceof ApiError ? cause.message : 'The export could not be created.');
    } finally {
      setExporting(false);
    }
  };

  const emailMatches = preview !== null && confirmEmail.trim().toLowerCase() === preview.email.toLowerCase();
  const ready = emailMatches && password.length > 0;
  const hintId = 'delete-hint';

  const remove = async () => {
    if (!ready) {
      // The button is disabled in this state, so this branch guards programmatic
      // submission; the sentence is still the right thing to say.
      setDeleteError(
        emailMatches
          ? 'Enter your password to confirm.'
          : 'Type your account email exactly to confirm.',
      );
      passwordRef.current?.focus();
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const result = await api.deleteAccount({ password, confirm_email: confirmEmail.trim() });
      onDeleted(result.message);
    } catch (cause) {
      setDeleteError(
        cause instanceof ApiError
          ? cause.message
          : 'The account could not be deleted. Nothing was removed.',
      );
      deleteHeadingRef.current?.focus();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section aria-labelledby="data-heading" className="mt-8">
      <h2 id="data-heading" className="text-lg font-semibold">
        Your data
      </h2>
      <p className={`mt-1 text-sm ${muted}`}>
        Everything Tessera records belongs to you. You can take a copy at any time, and you can
        have it erased — both without asking anyone.
      </p>

      <div className="mt-4 grid gap-4">
        <Card>
          <SectionTitle hint="One JSON file, written by the server from your own rows.">
            Download a copy
          </SectionTitle>
          <p className="text-sm">
            Includes your profile and diagnostic results, every answer you have given, the concepts
            and notes you wrote, your study sessions, quest progress, XP ledger and any app
            connections.
          </p>
          <p className={`mt-2 text-xs ${muted}`}>
            Not included, deliberately: your password hash and your live session keys. A downloaded
            file must not be able to sign in as you.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={() => void download()} disabled={exporting}>
              {exporting ? 'Preparing…' : 'Download my data'}
            </button>
            <p
              ref={statusRef}
              role="status"
              tabIndex={-1}
              className="text-sm"
              style={{ color: exportStatus ? 'var(--good)' : undefined }}
            >
              {exportStatus}
            </p>
          </div>
          {exportError ? <ErrorNote message={exportError} onRetry={() => void download()} /> : null}
        </Card>

        <Card>
          <h3 id="delete-heading" ref={deleteHeadingRef} tabIndex={-1} className="text-lg font-semibold">
            Delete this account
          </h3>
          {previewError ? (
            <ErrorNote message={previewError} onRetry={() => void loadPreview()} />
          ) : preview === null ? (
            <Loading label="Counting what would be deleted" />
          ) : (
            <>
              <p className="mt-1 text-sm" style={{ color: 'var(--bad)' }}>
                {preview.statement}
              </p>

              <p className="mt-3 text-sm">
                <strong>{preview.rows.toLocaleString()}</strong>{' '}
                {preview.rows === 1 ? 'record' : 'records'} would be removed. The shared curriculum
                — the concepts, lessons and questions every learner sees — is not yours and is not
                deleted.
              </p>

              <ul className={`mt-2 grid gap-1 text-xs ${muted}`}>
                {CONTENT_TABLES.filter((table) => (preview.tables[table.key] ?? 0) > 0).map((table) => (
                  <li key={table.key}>
                    {table.label}: {preview.tables[table.key]}
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid gap-3 sm:max-w-md">
                <div>
                  <label htmlFor="delete-password" className="text-sm font-medium">
                    Your password
                  </label>
                  <input
                    id="delete-password"
                    ref={passwordRef}
                    type="password"
                    autoComplete="current-password"
                    className="field mt-1"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="delete-email" className="text-sm font-medium">
                    Type <span className="font-mono">{preview.email}</span> to confirm
                  </label>
                  <input
                    id="delete-email"
                    type="email"
                    autoComplete="off"
                    className="field mt-1"
                    value={confirmEmail}
                    onChange={(event) => setConfirmEmail(event.target.value)}
                    aria-describedby={hintId}
                  />
                </div>
              </div>

              {armed ? null : (
                <button
                  type="button"
                  className="btn mt-4"
                  onClick={() => {
                    setArmed(true);
                    // Move focus to the first field that has to be filled: the next
                    // action is typing, and this is where a keyboard user expects
                    // to be.
                    window.setTimeout(() => passwordRef.current?.focus(), 0);
                  }}
                >
                  I want to delete my account…
                </button>
              )}

              {armed ? (
                <div className="mt-4">
                  <button
                    type="button"
                    className="btn"
                    style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
                    onClick={() => void remove()}
                    disabled={deleting || !ready}
                    aria-describedby={hintId}
                  >
                    {deleting ? 'Deleting…' : 'Delete my account permanently'}
                  </button>
                </div>
              ) : null}

              {/* Rendered whether or not the button is: `aria-describedby` must
                  never point at an element that does not exist, which is exactly
                  what happens when the explanation is inside the same conditional
                  as the thing it describes. */}
              <p id={hintId} className={`mt-2 text-xs ${muted}`}>
                {!armed
                  ? 'Nothing has been deleted. The confirmation step comes first.'
                  : deleting
                    ? 'Removing your records.'
                    : ready
                      ? 'This cannot be undone. There is no copy on the server after it runs.'
                      : 'Both fields above are required before this button will work.'}
              </p>

              {deleteError ? (
                <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--bad)' }}>
                  {deleteError}
                </p>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
