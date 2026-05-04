// ─────────────────────────────────────────────────────────────────────────────
// ENUMS AND UNION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type OutcomeType =
  | "no_damage"
  | "monitor_only"
  | "repair_only"
  | "claim_review_candidate"
  | "full_restoration_candidate";

export type SelectedPath =
  | "direct_repair"
  | "claim_review"
  | "full_restoration"
  | null;

export type PhotoTag = 
  | "shingle" | "ridge" | "soft_metal" | "siding" | "screen" 
  | "gutter" | "flashing" | "urgent_protection" | "monitor_only";

export type PhotoSeverity = "low" | "medium" | "high" | "critical";

export type SessionStatus =
  | "draft"
  | "phase_a_active"
  | "phase_a_complete"
  | "rep_review_pending"
  | "summary_locked"
  | "authorization_pending"
  | "signed"
  | "deferred"
  | "closed_no_damage"
  | "closed_monitor_only"
  | "closed_repair_only"
  | "closed_claim_review"
  | "closed_restoration";

export type AppMode = "homeowner" | "rep";

export type ScreenId =
  | "P00_rep_launch"
  | "A01_welcome"
  | "A02_why_inspection"
  | "A03_what_we_inspect"
  | "A04_how_findings_sorted"
  | "A05_insurance_clarity"
  | "A06_warranty_impact"
  | "A07_why_hustad"
  | "A08_what_you_receive"
  | "A09_buyer_priorities"
  | "A11_innovation"
  | "A10_inspection_hold"
  | "B11_rep_findings_prep"
  | "B12_findings_summary"
  | "B13_recommended_path"
  | "B14_path_decision"
  | "B15_urgent_protection"
  | "B16_system_options"
  | "B17_agreement_summary"
  | "B18_signature_deferral"
  | "B19_next_steps";

export type BuyerPriority =
  | "roof_longevity"
  | "insurance_process"
  | "repair_speed"
  | "cost_clarity"
  | "warranty_coverage"
  | "minimal_disruption";

export type InsurerContactStatus =
  | "not_yet"
  | "already_contacted"
  | "not_sure";

export type DeliveryMethod = "email" | "text" | "both";

export type SyncStatus = "local_only" | "queued" | "syncing" | "synced" | "error";

export type RemoteReviewStatus =
  | "sent"
  | "opened"
  | "viewed"
  | "question_submitted"
  | "callback_requested"
  | "approved"
  | "signed"
  | "declined"
  | "expired";

export interface RemoteQuestion {
  questionId: string;
  askedAt: string;
  questionText: string;
  askerName: string;
  replyText?: string;
  repliedAt?: string;
}

export interface RemoteReviewData {
  status: RemoteReviewStatus;
  sentAt: string | null;
  openedAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  declineReason: string;
  callbackRequestedAt: string | null;
  callbackPhone: string;
  callbackPreferredTime: string;
  approvedAt: string | null;
  questions: RemoteQuestion[];
  recipientName: string;
  recipientEmail: string;
  recipientRelation: string;
  statusHistory: { status: RemoteReviewStatus; at: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PHOTO ASSETS
// ─────────────────────────────────────────────────────────────────────────────

export interface Annotation {
  type: "circle" | "arrow" | "label" | "blur";
  x: number;
  y: number;
  toX?: number;
  toY?: number;
  radius?: number;
  color: string;
  text?: string;
}

export interface PhotoAsset {
  assetId: string;
  dataUrl: string; // base64 data URL from camera/file input
  caption: string;
  category: "urgent" | "storm_related" | "monitor_only" | "general";
  displayOrder: number;
  selectedForSummary: boolean;
  annotations?: Annotation[];
  tags?: PhotoTag[];
  severity?: PhotoSeverity;
  isSensitive?: boolean;
  wasShownToBuyer?: boolean;
  wasInPdf?: boolean;
  comparisonAssetId?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW-UP TASK
// ─────────────────────────────────────────────────────────────────────────────

export interface FollowUpTask {
  taskId: string;
  owner: string;
  dueDate: string;
  reason: string;
  status: "open" | "scheduled" | "contacted" | "awaiting_buyer" | "completed" | "closed_lost";
  recipientName: string;
  recipientEmail: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION STATE OBJECT
// ─────────────────────────────────────────────────────────────────────────────

export interface PropertyContext {
  address: string;
  cityStateZip: string;
  propertyType: "single_family" | "condo" | "townhome" | "other";
  homeownerPrimaryName: string;
  homeownerPrimaryEmail: string;
  homeownerPrimaryMobile: string;
  insurerNameKnown: string;
  claimNumberKnown: string;
  workingDateOfLoss: string;
  stormBasis: string;
  accessNotes: string;
}

export interface BuyerPhaseAData {
  buyerPriorities: BuyerPriority[];
  insurerContactStatus: InsurerContactStatus | null;
  anotherDecisionMakerPresent: boolean | null;
  decisionMakerRelation: string;
  decisionMakerName: string;
  decisionMakerEmail: string;
  decisionMakerMobile: string;
  buyerQuestions: string;
}

export interface RepFindingsData {
  outcomeType: OutcomeType | null;
  recommendedPath: SelectedPath;
  urgentItemsCount: number;
  stormRelatedItemsCount: number;
  monitorItemsCount: number;
  roofingArea: string;
  estimatedClaimValue: string;
  summaryHeadline: string;
  summaryBody: string;
  weatherEvents: { time: string; reference: string; relevance: string }[];
  stormSummary: string;
  topPhotoAssetIds: string[];
  urgentProtectionRecommended: boolean;
  urgentProtectionAuthorized: boolean | null;
  internalNotes: string;
  summaryLockedAt: string | null;
  summaryLockedBy: string | null;
  findingCategories: string[];
  aiPdfCopy: string;
  aiFollowUpNote: string;
}

export interface PathSelectionData {
  selectedPath: SelectedPath;
  manufacturerSelected: "GAF" | "OwensCorning" | "CertainTeed" | null;
  productSelected: string;
  impactUpgradeSelected: boolean;
  warrantyOptionSelected: string;
  claimRelatedWork: boolean | null;
  agreementAcknowledged: boolean;
}

export interface SignatureData {
  signerName: string;
  signerEmail: string;
  signerMobile: string;
  preferredFollowUpMethod: DeliveryMethod | null;
  signatureImage: string | null;
  summarySendRecipient: string;
  deferralReason: string;
  signedAt: string | null;
}

export interface AuditEvent {
  eventName: string;
  actorId: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface SessionState {
  // Identity
  sessionId: string;
  reviewToken?: string;
  repId: string;
  repName: string;
  createdAt: string;
  lastSavedAt: string;

  // State machine
  sessionStatus: SessionStatus;
  currentScreen: ScreenId;
  mode: AppMode;
  phaseACompleted: boolean;

  // Data groups
  property: PropertyContext;
  buyerData: BuyerPhaseAData;
  findings: RepFindingsData;
  pathData: PathSelectionData;
  signatureData: SignatureData;

  // Photo assets
  photoAssets: PhotoAsset[];

  // Follow-up tasks
  followUpTasks: FollowUpTask[];

  // Remote co-decision-maker review
  remoteReview: RemoteReviewData;

  // Offline / sync
  syncStatus: SyncStatus;

  // Audit log
  auditEvents: AuditEvent[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenConfig {
  id: ScreenId;
  phase: "setup" | "A" | "B";
  mode: AppMode | "both";
  label: string;
}

export const SCREEN_FLOW: ScreenConfig[] = [
  { id: "P00_rep_launch", phase: "setup", mode: "rep", label: "Launch Session" },
  { id: "A01_welcome", phase: "A", mode: "homeowner", label: "Welcome" },
  { id: "A02_why_inspection", phase: "A", mode: "homeowner", label: "Why This Inspection" },
  { id: "A03_what_we_inspect", phase: "A", mode: "homeowner", label: "What We Inspect" },
  { id: "A04_how_findings_sorted", phase: "A", mode: "homeowner", label: "How Findings Are Sorted" },
  { id: "A05_insurance_clarity", phase: "A", mode: "homeowner", label: "Insurance Clarity" },
  { id: "A06_warranty_impact", phase: "A", mode: "homeowner", label: "Warranty & Impact" },
  { id: "A07_why_hustad", phase: "A", mode: "homeowner", label: "Why Hustad" },
  { id: "A08_what_you_receive", phase: "A", mode: "homeowner", label: "What You Receive" },
  { id: "A09_buyer_priorities", phase: "A", mode: "homeowner", label: "Your Priorities" },
  { id: "A11_innovation", phase: "A", mode: "homeowner", label: "Forensic Innovation" },
  { id: "A10_inspection_hold", phase: "A", mode: "homeowner", label: "Inspection In Progress" },
  { id: "B11_rep_findings_prep", phase: "B", mode: "rep", label: "Findings Prep" },
  { id: "B12_findings_summary", phase: "B", mode: "both", label: "Findings Summary" },
  { id: "B13_recommended_path", phase: "B", mode: "both", label: "Recommended Path" },
  { id: "B14_path_decision", phase: "B", mode: "both", label: "Path Decision" },
  { id: "B15_urgent_protection", phase: "B", mode: "both", label: "Urgent Protection" },
  { id: "B16_system_options", phase: "B", mode: "both", label: "System Options" },
  { id: "B17_agreement_summary", phase: "B", mode: "both", label: "Agreement Summary" },
  { id: "B18_signature_deferral", phase: "B", mode: "both", label: "Signature or Deferral" },
  { id: "B19_next_steps", phase: "B", mode: "both", label: "Next Steps" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING LOGIC
// ─────────────────────────────────────────────────────────────────────────────

export function getNextScreen(
  current: ScreenId,
  session: SessionState
): ScreenId | null {
  const { outcomeType, urgentItemsCount, urgentProtectionRecommended } =
    session.findings;
  const { selectedPath } = session.pathData;
  const { anotherDecisionMakerPresent } = session.buyerData;

  switch (current) {
    // Phase A linear flow
    case "P00_rep_launch": return "A01_welcome";
    case "A01_welcome": return "A02_why_inspection";
    case "A02_why_inspection": return "A03_what_we_inspect";
    case "A03_what_we_inspect": return "A04_how_findings_sorted";
    case "A04_how_findings_sorted": return "A05_insurance_clarity";
    case "A05_insurance_clarity": return "A06_warranty_impact";
    case "A06_warranty_impact": return "A07_why_hustad";
    case "A07_why_hustad": return "A08_what_you_receive";
    case "A08_what_you_receive": return "A09_buyer_priorities";
    case "A09_buyer_priorities": return "A11_innovation";
    case "A11_innovation": return "A10_inspection_hold";
    case "A10_inspection_hold": return "B11_rep_findings_prep";

    // Phase B – rep locks findings
    case "B11_rep_findings_prep": return "B12_findings_summary";

    // Phase B branching from findings summary
    case "B12_findings_summary": return "B13_recommended_path";

    case "B13_recommended_path": {
      if (outcomeType === "no_damage" || outcomeType === "monitor_only") {
        return "B19_next_steps";
      }
      // For repair_only: check if urgent items exist
      if (outcomeType === "repair_only") {
        return urgentItemsCount > 0 ? "B15_urgent_protection" : "B17_agreement_summary";
      }
      // claim or restoration: may show path decision first
      if (
        outcomeType === "claim_review_candidate" ||
        outcomeType === "full_restoration_candidate"
      ) {
        // Show path decision only if there's a viable alternate
        return selectedPath === null ? "B14_path_decision" : (urgentItemsCount > 0 ? "B15_urgent_protection" : (outcomeType === "full_restoration_candidate" ? "B16_system_options" : "B17_agreement_summary"));
      }
      return "B19_next_steps";
    }

    case "B14_path_decision": {
      if (urgentItemsCount > 0) return "B15_urgent_protection";
      if (outcomeType === "full_restoration_candidate" || selectedPath === "full_restoration") {
        return "B16_system_options";
      }
      return "B17_agreement_summary";
    }

    case "B15_urgent_protection": {
      if (outcomeType === "full_restoration_candidate" || selectedPath === "full_restoration") {
        return "B16_system_options";
      }
      return "B17_agreement_summary";
    }

    case "B16_system_options": return "B17_agreement_summary";
    case "B17_agreement_summary": return "B18_signature_deferral";
    case "B18_signature_deferral": return "B19_next_steps";
    case "B19_next_steps": return null;

    default: return null;
  }
}

export function shouldShowScreen(
  screen: ScreenId,
  session: SessionState
): boolean {
  const { outcomeType, urgentItemsCount } = session.findings;
  const { selectedPath } = session.pathData;

  switch (screen) {
    case "B14_path_decision":
      return (
        outcomeType === "claim_review_candidate" ||
        outcomeType === "full_restoration_candidate"
      );
    case "B15_urgent_protection":
      return urgentItemsCount > 0;
    case "B16_system_options":
      return (
        outcomeType === "full_restoration_candidate" ||
        selectedPath === "full_restoration"
      );
    case "B17_agreement_summary":
    case "B18_signature_deferral":
      return (
        outcomeType === "repair_only" ||
        outcomeType === "claim_review_candidate" ||
        outcomeType === "full_restoration_candidate"
      );
    default:
      return true;
  }
}

// Phase A screens for progress calculation
export const PHASE_A_SCREENS: ScreenId[] = [
  "A01_welcome",
  "A02_why_inspection",
  "A03_what_we_inspect",
  "A04_how_findings_sorted",
  "A05_insurance_clarity",
  "A06_warranty_impact",
  "A07_why_hustad",
  "A08_what_you_receive",
  "A09_buyer_priorities",
  "A11_innovation",
  "A10_inspection_hold",
];

export const PHASE_B_SCREENS: ScreenId[] = [
  "B11_rep_findings_prep",
  "B12_findings_summary",
  "B13_recommended_path",
  "B14_path_decision",
  "B15_urgent_protection",
  "B16_system_options",
  "B17_agreement_summary",
  "B18_signature_deferral",
  "B19_next_steps",
];
