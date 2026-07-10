// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineLead {
  id: string;
  cpc_ticket_id: string;
  pipeline_status: string;
  assigned_rep_id: string | null;
  contact_attempt_count: number;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  lead_notes: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  centerpoint_jobs: {
    name: string;
    property_name: string;
    raw?: Record<string, any>;
  };
  appointments?: { id: string; assigned_rep_id: string }[];
}

// ─── Status config ────────────────────────────────────────────────────────────

import {
  Phone, Clock, MessageSquare, CalendarDays, CheckCircle2,
  PlayCircle, XCircle,
} from "lucide-react";

export const STATUS_CONFIG: Record<string, { label: string; color: string; bar: string; icon: any }> = {
  new_lead:               { label: "New Lead",   color: "text-sky-400 bg-sky-400/10 border-sky-400/20",          bar: "bg-sky-500",      icon: Clock },
  follow_up_needed:       { label: "Follow Up",  color: "text-orange-400 bg-orange-400/10 border-orange-400/20", bar: "bg-orange-500",   icon: Clock },
  contact_attempted:      { label: "Attempted",  color: "text-amber-400 bg-amber-400/10 border-amber-400/20",    bar: "bg-amber-500",    icon: Phone },
  contacted:              { label: "Contacted",  color: "text-[#2563ba] bg-[#2563ba]/10 border-[#2563ba]/20",   bar: "bg-[#2563ba]",   icon: MessageSquare },
  scheduled:              { label: "Scheduled",  color: "text-[#3aada3] bg-[#3aada3]/10 border-[#3aada3]/20",   bar: "bg-[#2a8a82]",   icon: CalendarDays },
  appointment_confirmed:  { label: "Confirmed",  color: "text-sky-400 bg-sky-400/10 border-sky-400/20",          bar: "bg-sky-500",      icon: CheckCircle2 },
  inspection_in_progress: { label: "In Field",   color: "text-[#2a8a82] bg-[#2a8a82]/10 border-[#2a8a82]/20",   bar: "bg-[#2a8a82]",   icon: PlayCircle },
  inspection_completed:   { label: "Inspected",  color: "text-[#4a8fd4] bg-[#4a8fd4]/10 border-[#4a8fd4]/20",   bar: "bg-[#4a8fd4]",   icon: CheckCircle2 },
  dead_lead:              { label: "Dead Lead",  color: "text-rose-400 bg-rose-400/10 border-rose-400/20",       bar: "bg-rose-500/50",  icon: XCircle },
  signed:                 { label: "Signed",     color: "text-green-400 bg-green-400/10 border-green-400/20",    bar: "bg-green-500",    icon: CheckCircle2 },
  closed:                 { label: "Closed",     color: "text-[#3F5878] bg-white/5 border-white/10",             bar: "bg-white/20",     icon: CheckCircle2 },
};

export const STAGE_MAP: Record<string, number> = {
  new_lead: 0, contact_attempted: 1, follow_up_needed: 1,
  contacted: 2, scheduled: 3, appointment_confirmed: 3,
  inspection_in_progress: 4, inspection_completed: 4, signed: 4, closed: 4,
};

export const BLOCKED_STATUSES = ["inspection_in_progress", "inspection_completed", "signed", "closed"];
export const STAGE_STATUSES   = ["new_lead", "contact_attempted", "contacted", "scheduled", "inspection_in_progress"];
export const STAGE_LABELS     = ["New Lead", "Attempted", "Contacted", "Scheduled", "In Field"];
export const STAGE_HINTS      = [
  "No outreach yet",
  "Email sent / voicemail left — no reply yet",
  "Tap when homeowner responds or you speak with them",
  "Inspection appointment booked",
  "Inspector is on site",
];

export const TIME_SLOTS = [
  { label: "7 AM",  value: "07:00" }, { label: "8 AM",  value: "08:00" },
  { label: "9 AM",  value: "09:00" }, { label: "10 AM", value: "10:00" },
  { label: "11 AM", value: "11:00" }, { label: "12 PM", value: "12:00" },
  { label: "1 PM",  value: "13:00" }, { label: "2 PM",  value: "14:00" },
  { label: "3 PM",  value: "15:00" }, { label: "4 PM",  value: "16:00" },
  { label: "5 PM",  value: "17:00" }, { label: "6 PM",  value: "18:00" },
];

export const DURATIONS = [
  { label: "30 min", value: 30  }, { label: "1 hr",   value: 60  },
  { label: "1.5 hr", value: 90  }, { label: "2 hr",   value: 120 },
  { label: "3 hr",   value: 180 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const addDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

export const daysSince = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;

export const callTimestamp = () => {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

export const normalizePhone = (raw: unknown): string | null => {
  if (!raw || typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim() || null;
};

// CP-sourced contacts (_phone, _email, _service_phone, _service_email) take
// strict priority — they are always the homeowner contact linked to this property.
// owner_phone / owner_email are manual rep entries used only when CP has nothing.
export const resolvePhone = (lead: PipelineLead): string | null =>
  normalizePhone(
    lead.centerpoint_jobs?.raw?._service_phone ||  // property-linked (service include)
    lead.centerpoint_jobs?.raw?._phone ||           // company profile linked to this property
    lead.owner_phone ||                             // manual rep entry (CP had nothing)
    null
  );

export const resolveEmail = (lead: PipelineLead): string | null => {
  const raw =
    lead.centerpoint_jobs?.raw?._service_email ||  // property-linked (service include)
    lead.centerpoint_jobs?.raw?._email ||           // company profile linked to this property
    lead.owner_email ||                             // manual rep entry (CP had nothing)
    null;
  return typeof raw === "string" && raw.includes("@") ? raw.trim() : null;
};

// True if the resolved contact came from CenterPoint (not manually entered by a rep).
export const phoneFromCP = (lead: PipelineLead): boolean =>
  !!(lead.centerpoint_jobs?.raw?._service_phone || lead.centerpoint_jobs?.raw?._phone);

export const emailFromCP = (lead: PipelineLead): boolean =>
  !!(lead.centerpoint_jobs?.raw?._service_email || lead.centerpoint_jobs?.raw?._email);

export const noteEntryIcon = (content: string) => {
  if (content.startsWith("Email sent"))    return { icon: require("lucide-react").Mail,         color: "text-[#2563ba] bg-[#2563ba]/10" };
  if (content.startsWith("Reached"))       return { icon: Phone,                                color: "text-[#3aada3] bg-[#3aada3]/10" };
  if (content.startsWith("No Answer"))     return { icon: Phone,                                color: "text-amber-400 bg-amber-400/10" };
  if (content.startsWith("Voicemail"))     return { icon: Phone,                                color: "text-sky-400 bg-sky-400/10" };
  if (content.startsWith("Wrong Number"))  return { icon: Phone,                                color: "text-rose-400 bg-rose-400/10" };
  if (content.startsWith("Follow-up set")) return { icon: Clock,                                color: "text-orange-400 bg-orange-400/10" };
  if (content.startsWith("Imported"))      return { icon: CheckCircle2,                         color: "text-[#3F5878] bg-white/5" };
  return                                          { icon: MessageSquare,                        color: "text-[#354D6F] bg-white/5" };
};

export const parseNoteEntries = (notes: string) => {
  if (!notes) return [];
  const entries: { timestamp: string | null; content: string; isActivity: boolean }[] = [];
  let currentTimestamp: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (content) entries.push({ timestamp: currentTimestamp, content, isActivity: currentTimestamp !== null });
    currentLines = [];
    currentTimestamp = null;
  };

  for (const line of notes.split("\n")) {
    const m = line.match(/^\[([^\]]+)\]\s*(.*)/);
    if (m) {
      flush();
      currentTimestamp = m[1];
      if (m[2].trim()) currentLines.push(m[2]);
    } else {
      currentLines.push(line);
    }
  }
  flush();
  return entries;
};
