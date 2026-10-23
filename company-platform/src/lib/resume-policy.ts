/**
 * Resume download rule — pure policy used by the API route and the tests:
 * the owner can always fetch their file; everyone else only while the resume
 * is explicitly published AND the profile is published. Withdrawal kills
 * downloads immediately.
 */
export interface ResumeDownloadFacts {
  resumePublished: boolean;
  resumeDeleted: boolean;
  profilePublished: boolean;
  ownerUserId: string;
}

export function canDownloadResume(
  facts: ResumeDownloadFacts,
  actorUserId: string | null,
): boolean {
  if (facts.resumeDeleted) return false;
  const isOwner = actorUserId != null && actorUserId === facts.ownerUserId;
  if (isOwner) return true;
  return facts.resumePublished && facts.profilePublished;
}
