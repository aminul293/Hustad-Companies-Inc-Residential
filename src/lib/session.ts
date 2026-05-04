import type {
  SessionState,
  ScreenId,
  AuditEvent,
  OutcomeType,
  SelectedPath,
  FollowUpTask,
} from "@/types/session";

const STORAGE_KEY = "hustad_session_v1";
const DRAFTS_INDEX_KEY = "hustad_drafts_v1";
const DRAFT_PREFIX = "hustad_draft_";

// ─────────────────────────────────────────────────────────────────────────────
// SESSION FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createSession(repId: string, repName: string): SessionState {
  const now = new Date().toISOString();
  return {
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    reviewToken: undefined,
    repId,
    repName,
    createdAt: now,
    lastSavedAt: now,
    sessionStatus: "draft",
    currentScreen: "P00_rep_launch",
    mode: "rep",
    phaseACompleted: false,
    property: {
      address: "",
      cityStateZip: "Madison, WI",
      propertyType: "single_family",
      homeownerPrimaryName: "",
      homeownerPrimaryEmail: "",
      homeownerPrimaryMobile: "",
      insurerNameKnown: "",
      claimNumberKnown: "",
      workingDateOfLoss: "",
      stormBasis: "",
      accessNotes: "",
    },
    buyerData: {
      buyerPriorities: [],
      insurerContactStatus: null,
      anotherDecisionMakerPresent: null,
      decisionMakerRelation: "",
      decisionMakerName: "",
      decisionMakerEmail: "",
      decisionMakerMobile: "",
      buyerQuestions: "",
    },
    findings: {
      outcomeType: null,
      recommendedPath: null,
      urgentItemsCount: 0,
      stormRelatedItemsCount: 0,
      monitorItemsCount: 0,
      roofingArea: "",
      estimatedClaimValue: "",
      weatherEvents: [],
      stormSummary: "",
      summaryHeadline: "",
      summaryBody: "",
      topPhotoAssetIds: [],
      urgentProtectionRecommended: false,
      urgentProtectionAuthorized: null,
      internalNotes: "",
      summaryLockedAt: null,
      summaryLockedBy: null,
      findingCategories: [],
      aiPdfCopy: "",
      aiFollowUpNote: "",
    },
    pathData: {
      selectedPath: null,
      manufacturerSelected: null,
      productSelected: "",
      impactUpgradeSelected: false,
      warrantyOptionSelected: "",
      claimRelatedWork: null,
      agreementAcknowledged: false,
    },
    signatureData: {
      signerName: "",
      signerEmail: "",
      signerMobile: "",
      preferredFollowUpMethod: null,
      signatureImage: null,
      summarySendRecipient: "",
      deferralReason: "",
      signedAt: null,
    },
    photoAssets: [],
    followUpTasks: [],
    remoteReview: {
      status: "sent",
      sentAt: null,
      openedAt: null,
      viewedAt: null,
      signedAt: null,
      declinedAt: null,
      declineReason: "",
      callbackRequestedAt: null,
      callbackPhone: "",
      callbackPreferredTime: "",
      approvedAt: null,
      questions: [],
      recipientName: "",
      recipientEmail: "",
      recipientRelation: "",
      statusHistory: [],
    },
    syncStatus: "local_only",
    auditEvents: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

export function saveSession(session: SessionState): void {
  if (typeof window === "undefined") return;
  const updated = { ...session, lastSavedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Also save by draft ID for resume listing
  localStorage.setItem(DRAFT_PREFIX + session.sessionId, JSON.stringify(updated));

  // Update drafts index
  const index = getDraftsIndex();
  
  // Calculate missing fields for dashboard validation
  let missing = 0;
  if (!session.property.address) missing++;
  if (!session.property.homeownerPrimaryName) missing++;
  if (session.photoAssets.length === 0) missing++;

  index[session.sessionId] = {
    sessionId: session.sessionId,
    address: session.property.address || "Untitled Property",
    homeownerName: session.property.homeownerPrimaryName || "Unknown Owner",
    repName: session.repName,
    lastSavedAt: updated.lastSavedAt,
    sessionStatus: session.sessionStatus,
    outcomeType: session.findings.outcomeType,
    syncStatus: session.syncStatus,
    hasFollowUp: session.followUpTasks.length > 0,
    missingFieldsCount: missing,
  };
  localStorage.setItem(DRAFTS_INDEX_KEY, JSON.stringify(index));
}

export function loadActiveSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

interface DraftMeta {
  sessionId: string;
  address: string;
  homeownerName: string;
  repName: string;
  lastSavedAt: string;
  sessionStatus: string;
  outcomeType: string | null;
  syncStatus: string;
  hasFollowUp: boolean;
  missingFieldsCount: number;
}

function getDraftsIndex(): Record<string, DraftMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DRAFTS_INDEX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function listDrafts(): DraftMeta[] {
  return Object.values(getDraftsIndex()).sort(
    (a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime()
  );
}

export function loadDraftById(sessionId: string): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

export function saveDraftById(session: SessionState): void {
  if (typeof window === "undefined") return;
  const updated = { ...session, lastSavedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_PREFIX + session.sessionId, JSON.stringify(updated));
}

export function deleteDraft(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_PREFIX + sessionId);
  const index = getDraftsIndex();
  delete index[sessionId];
  localStorage.setItem(DRAFTS_INDEX_KEY, JSON.stringify(index));
}

export function hasSameDayDraft(address: string): DraftMeta | null {
  const today = new Date().toISOString().slice(0, 10);
  const drafts = listDrafts();
  return drafts.find(
    (d) =>
      d.address.toLowerCase().trim() === address.toLowerCase().trim() &&
      d.lastSavedAt.slice(0, 10) === today &&
      !d.sessionStatus.startsWith("closed_")
  ) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW-UP TASKS
// ─────────────────────────────────────────────────────────────────────────────

export function createFollowUpTask(
  session: SessionState,
  reason: string
): SessionState {
  const task: FollowUpTask = {
    taskId: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    owner: session.repId,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    reason,
    status: "open",
    recipientName:
      session.buyerData.decisionMakerName ||
      session.property.homeownerPrimaryName,
    recipientEmail:
      session.signatureData.summarySendRecipient ||
      session.buyerData.decisionMakerEmail ||
      session.property.homeownerPrimaryEmail,
    createdAt: new Date().toISOString(),
  };
  const updated: SessionState = {
    ...session,
    followUpTasks: [...session.followUpTasks, task],
  };
  return addAuditEvent(updated, "follow_up_created", {
    taskId: task.taskId,
    reason,
    dueDate: task.dueDate,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION EXPORT (MVP JSON dump)
// ─────────────────────────────────────────────────────────────────────────────

export function exportSessionJSON(session: SessionState): string {
  const exportData = {
    sessionId: session.sessionId,
    exportedAt: new Date().toISOString(),
    property: session.property,
    outcome: session.findings.outcomeType,
    summaryHeadline: session.findings.summaryHeadline,
    summaryBody: session.findings.summaryBody,
    findingCounts: {
      urgent: session.findings.urgentItemsCount,
      stormRelated: session.findings.stormRelatedItemsCount,
      monitorOnly: session.findings.monitorItemsCount,
    },
    selectedPath: session.pathData.selectedPath,
    manufacturerSelected: session.pathData.manufacturerSelected,
    warrantyOptionSelected: session.pathData.warrantyOptionSelected,
    impactUpgradeSelected: session.pathData.impactUpgradeSelected,
    claimRelatedWork: session.pathData.claimRelatedWork,
    buyerPriorities: session.buyerData.buyerPriorities,
    anotherDecisionMakerPresent: session.buyerData.anotherDecisionMakerPresent,
    signatureStatus: session.signatureData.signedAt ? "signed" : "unsigned",
    signerName: session.signatureData.signerName,
    signerEmail: session.signatureData.signerEmail,
    sessionStatus: session.sessionStatus,
    followUpTasks: session.followUpTasks,
    photoCount: session.photoAssets.length,
    auditEvents: session.auditEvents,
    repName: session.repName,
    repId: session.repId,
  };
  return JSON.stringify(exportData, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGGING
// ─────────────────────────────────────────────────────────────────────────────

export function addAuditEvent(
  session: SessionState,
  eventName: string,
  metadata?: Record<string, unknown>
): SessionState {
  const event: AuditEvent = {
    eventName,
    actorId: session.repId,
    occurredAt: new Date().toISOString(),
    metadata,
  };
  return {
    ...session,
    auditEvents: [...session.auditEvents, event],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export function navigateTo(
  session: SessionState,
  screen: ScreenId
): SessionState {
  return addAuditEvent(
    { ...session, currentScreen: screen },
    "screen_navigated",
    { screen }
  );
}

export function lockSummary(
  session: SessionState
): SessionState {
  const now = new Date().toISOString();
  const updated: SessionState = {
    ...session,
    sessionStatus: "summary_locked",
    findings: {
      ...session.findings,
      summaryLockedAt: now,
      summaryLockedBy: session.repId,
    },
  };
  return addAuditEvent(updated, "rep_summary_locked", {
    lockedAt: now,
    repId: session.repId,
    outcomeType: session.findings.outcomeType,
  });
}

export function unlockSummary(
  session: SessionState
): SessionState {
  const updated: SessionState = {
    ...session,
    sessionStatus: "rep_review_pending",
    findings: {
      ...session.findings,
      summaryLockedAt: null,
      summaryLockedBy: null,
    },
  };
  return addAuditEvent(updated, "rep_summary_unlocked", { repId: session.repId });
}

export function setOutcomeType(
  session: SessionState,
  outcomeType: OutcomeType
): SessionState {
  const updated: SessionState = {
    ...session,
    findings: { ...session.findings, outcomeType },
    pathData: { ...session.pathData, selectedPath: null },
  };
  return addAuditEvent(updated, "outcome_type_set", { outcomeType });
}

export function setSelectedPath(
  session: SessionState,
  selectedPath: SelectedPath
): SessionState {
  const updated: SessionState = {
    ...session,
    pathData: { ...session.pathData, selectedPath },
  };
  return addAuditEvent(updated, "path_selected", { selectedPath });
}

export function completePhaseA(session: SessionState): SessionState {
  return addAuditEvent(
    { ...session, phaseACompleted: true, sessionStatus: "phase_a_complete" },
    "phase_a_completed"
  );
}

export function submitSession(session: SessionState): SessionState {
  const now = new Date().toISOString();
  const statusMap: Record<string, SessionState["sessionStatus"]> = {
    no_damage: "closed_no_damage",
    monitor_only: "closed_monitor_only",
    repair_only: "closed_repair_only",
    claim_review_candidate: "closed_claim_review",
    full_restoration_candidate: "closed_restoration",
  };
  const outcome = session.findings.outcomeType ?? "no_damage";
  return addAuditEvent(
    {
      ...session,
      sessionStatus: statusMap[outcome] ?? "closed_no_damage",
      signatureData: { ...session.signatureData, signedAt: now },
    },
    "authorization_submitted",
    { outcome }
  );
}

export function generateReviewToken(session: SessionState): SessionState {
  if (session.reviewToken) return session; // Already exists
  const token = `rt_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  const updated = { ...session, reviewToken: token };
  return addAuditEvent(updated, "review_token_generated", { token });
}
