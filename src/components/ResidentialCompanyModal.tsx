"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Building2,
  X,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Clock,
  Tag,
  User,
  ChevronRight,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "search" | "form" | "pending";

interface CompanyResult {
  id: string;
  name: string;
  salesStatus: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
}

interface FormState {
  name: string;
  salesStatus: string;
  timezone: string;
  streetAddress: string;
  locality: string;
  region: string;
  postalCode: string;
  manager: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST, no DST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
];

const SALES_STATUSES = ["Lead", "Candidate", "Client", "Sold"];

const INITIAL_FORM: FormState = {
  name: "",
  salesStatus: "Lead",
  timezone: "America/Chicago",
  streetAddress: "",
  locality: "",
  region: "",
  postalCode: "",
  manager: "",
};

// ─── Input component ─────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest pl-1">
        {label} {required && <span className="text-rose-400">*</span>}
      </p>
      {children}
      {error && <p className="text-[10px] text-rose-400 pl-1">{error}</p>}
    </div>
  );
}

const inputCls = (error?: string) =>
  cn(
    "w-full bg-white/[0.04] border rounded-xl py-3.5 px-4 text-[#E8EDF8] placeholder:text-[#2D4060] outline-none transition-all text-sm font-body",
    error
      ? "border-rose-500/50 focus:border-rose-500/50"
      : "border-white/[0.1] focus:border-indigo-500/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10"
  );

const selectCls = cn(
  "w-full bg-white/[0.04] border border-white/[0.1] rounded-xl py-3.5 px-4",
  "text-[#E8EDF8] text-sm font-body outline-none transition-all",
  "focus:border-indigo-500/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10"
);

// ─── Step 1: Search ──────────────────────────────────────────────────────────

function SearchStep({
  onFound,
  onNotFound,
}: {
  onFound: () => void;
  onNotFound: (prefill?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearched(false);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/residential/search?search=${encodeURIComponent(query.trim())}&pageSize=8`
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setResults(data.companies ?? []);
      setSearched(true);
    } catch (err: any) {
      setError("Search failed. Check your connection and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/60" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSearched(false); }}
          onKeyDown={handleKey}
          placeholder="Search by company name…"
          className="w-full bg-white/[0.04] border border-white/10 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 rounded-2xl py-4 pl-12 pr-32 text-[#E8EDF8] placeholder:text-[#2D4060] outline-none transition-all text-base"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl bg-indigo-500 disabled:opacity-40 hover:bg-indigo-400 transition-all text-[#E8EDF8] text-sm font-medium flex items-center gap-2"
        >
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {searched && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {results.length > 0 ? (
              <>
                <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-widest px-1">
                  {results.length} match{results.length !== 1 ? "es" : ""} found in CenterPoint
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {results.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between group"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-display font-medium text-[#E8EDF8] truncate">
                          {c.name}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                            {c.salesStatus}
                          </span>
                          {(c.locality || c.region) && (
                            <span className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest">
                              {[c.locality, c.region].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={onFound}
                        className="ml-4 shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-medium"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Use this
                      </button>
                    </div>
                  ))}
                </div>

                {/* Option to create anyway */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    onClick={() => onNotFound(query)}
                    className="w-full py-3 rounded-2xl border border-dashed border-white/10 text-[#567090] hover:text-[#8BA5C5] hover:border-white/20 transition-all text-xs font-mono uppercase tracking-widest"
                  >
                    Company not listed? Request a new one
                  </button>
                </div>
              </>
            ) : (
              /* No results state */
              <div className="py-4 space-y-5">
                <div className="p-8 rounded-[28px] border border-dashed border-white/[0.08] flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#2D4060]" />
                  </div>
                  <div>
                    <p className="text-sm font-display text-[#8BA5C5]">
                      No company found for
                    </p>
                    <p className="text-base font-display font-medium text-[#E8EDF8] mt-0.5">
                      &ldquo;{query}&rdquo;
                    </p>
                  </div>
                  <p className="text-[11px] text-[#3F5878] font-mono max-w-xs">
                    This company does not exist in CenterPoint as a Residential account.
                  </p>
                </div>

                <button
                  onClick={() => onNotFound(query)}
                  className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] transition-all text-[#E8EDF8] font-display font-semibold flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(99,102,241,0.25)]"
                >
                  Request New Residential Company
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {!searched && !isSearching && (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 flex flex-col items-center gap-3 text-center"
          >
            <Search className="w-8 h-8 text-[#1F2E48]" />
            <p className="text-[11px] font-mono text-[#2D4060] uppercase tracking-widest">
              Search CenterPoint before creating
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 2: Request Form ─────────────────────────────────────────────────────

function RequestForm({
  prefill,
  onBack,
  onSuccess,
  repEmail,
}: {
  prefill?: string;
  onBack: () => void;
  onSuccess: (expiresAt: string) => void;
  repEmail: string;
}) {
  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM,
    name: prefill ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFetchingManager, setIsFetchingManager] = useState(true);

  useEffect(() => {
    fetch("/api/centerpoint/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.employeeId) {
          setForm((f) => ({ ...f, manager: data.employeeId }));
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingManager(false));
  }, []);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Company name is required";
    if (!form.salesStatus) e.salesStatus = "Required";
    if (!form.timezone) e.timezone = "Required";
    if (form.manager.trim() && !/^\d+$/.test(form.manager.trim())) {
      e.manager = "Must be a numeric CenterPoint Employee ID";
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/companies/residential/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          salesStatus: form.salesStatus,
          timezone: form.timezone,
          ...(form.streetAddress.trim() && { streetAddress: form.streetAddress.trim() }),
          ...(form.locality.trim() && { locality: form.locality.trim() }),
          ...(form.region.trim() && { region: form.region.trim() }),
          ...(form.postalCode.trim() && { postalCode: form.postalCode.trim() }),
          ...(form.manager.trim() && { manager: form.manager.trim() }),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setSubmitError(data.message ?? "Failed to submit request");
        return;
      }
      onSuccess(data.expiresAt);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Core fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Company Name" required error={errors.name}>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50" />
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="ABC Roofing"
                className={cn(inputCls(errors.name), "pl-10")}
              />
            </div>
          </Field>
        </div>

        <Field label="Sales Status" required error={errors.salesStatus}>
          <div className="relative">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50 pointer-events-none" />
            <select
              value={form.salesStatus}
              onChange={(e) => set("salesStatus", e.target.value)}
              className={cn(selectCls, "pl-10 appearance-none")}
            >
              {SALES_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-[#111]">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label="Timezone" required error={errors.timezone}>
          <div className="relative">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50 pointer-events-none" />
            <select
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
              className={cn(selectCls, "pl-10 appearance-none")}
            >
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#111]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
      </div>

      {/* Address section */}
      <div className="space-y-3 pt-2 border-t border-white/[0.06]">
        <p className="text-[10px] font-mono text-[#2D4060] uppercase tracking-widest">
          Address — optional
        </p>
        <Field label="Street Address">
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50" />
            <input
              value={form.streetAddress}
              onChange={(e) => set("streetAddress", e.target.value)}
              placeholder="123 Main St"
              className={cn(inputCls(), "pl-10")}
            />
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Field label="City">
              <input
                value={form.locality}
                onChange={(e) => set("locality", e.target.value)}
                placeholder="Madison"
                className={inputCls()}
              />
            </Field>
          </div>
          <Field label="State">
            <input
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              placeholder="WI"
              maxLength={2}
              className={inputCls()}
            />
          </Field>
          <Field label="Zip Code">
            <input
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              placeholder="53703"
              className={inputCls()}
            />
          </Field>
        </div>
      </div>

      {/* Manager ID */}
      <div className="pt-2 border-t border-white/[0.06]">
        <Field label="Manager ID (CenterPoint Employee ID)" error={errors.manager}>
          <div className="relative">
            {isFetchingManager ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50 animate-spin" />
            ) : (
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50" />
            )}
            <input
              value={form.manager}
              onChange={(e) => set("manager", e.target.value)}
              placeholder={isFetchingManager ? "Looking up..." : "74522"}
              disabled={isFetchingManager}
              className={cn(inputCls(errors.manager), "pl-10", isFetchingManager && "opacity-50")}
            />
          </div>
        </Field>
      </div>

      {/* Note */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/[0.12]">
        <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-indigo-300/70 leading-relaxed">
          The service manager will receive an approval email. Once approved, the company
          and inspection ticket will be created in CenterPoint. You will be notified at{" "}
          <span className="text-indigo-300 font-medium">{repEmail}</span>.
        </p>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">{submitError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-[#7090B0] hover:text-[#E8EDF8] hover:bg-white/[0.08] transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-3 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 active:scale-[0.98] transition-all text-[#E8EDF8] font-display font-semibold shadow-[0_0_30px_rgba(99,102,241,0.25)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit for Approval
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Pending approval ─────────────────────────────────────────────────

function PendingStep({
  expiresAt,
  onClose,
}: {
  expiresAt: string;
  onClose: () => void;
}) {
  return (
    <div className="py-6 flex flex-col items-center text-center space-y-6">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-20 h-20 rounded-[28px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.15)]"
      >
        <CheckCircle2 className="w-9 h-9 text-emerald-400" />
      </motion.div>

      <div className="space-y-2">
        <h3 className="text-xl font-display font-medium text-[#E8EDF8]">
          Request Submitted
        </h3>
        <p className="text-sm text-[#7090B0] max-w-xs leading-relaxed">
          The service manager has been notified and will approve or reject this request.
          You will receive an email with the outcome.
        </p>
      </div>

      <div className="w-full p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[#3F5878] uppercase tracking-widest">Status</span>
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] uppercase tracking-widest">
            Pending Approval
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[#3F5878] uppercase tracking-widest">Link Expires</span>
          <span className="text-[#7090B0] font-mono text-[11px]">
            {new Date(expiresAt).toLocaleString()} (48h)
          </span>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-4 rounded-xl bg-white text-black font-display font-semibold hover:bg-neutral-200 active:scale-[0.98] transition-all"
      >
        Done — Back to Inspection
      </button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const STEP_TITLES: Record<Step, string> = {
  search: "Find Residential Company",
  form: "Request New Company",
  pending: "Request Submitted",
};

const STEP_SUBTITLES: Record<Step, string> = {
  search: "Search CenterPoint before creating a new one",
  form: "Requires service manager approval",
  pending: "",
};

export function ResidentialCompanyModal({ isOpen, onClose }: Props) {
  const { data: authSession } = useSession();
  const repEmail = authSession?.user?.email ?? "your email";

  const [step, setStep] = useState<Step>("search");
  const [namePrefill, setNamePrefill] = useState<string | undefined>(undefined);
  const [expiresAt, setExpiresAt] = useState("");

  // Reset to search when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("search");
      setNamePrefill(undefined);
      setExpiresAt("");
    }
  }, [isOpen]);

  const handleNotFound = (prefill?: string) => {
    setNamePrefill(prefill);
    setStep("form");
  };

  const handleSuccess = (exp: string) => {
    setExpiresAt(exp);
    setStep("pending");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget && step !== "pending") onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="w-full max-w-xl bg-[#0A0A0A] border border-white/[0.1] rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-white/[0.06]">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {/* Step indicator */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {(["search", "form", "pending"] as Step[]).map((s, i) => (
                      <div
                        key={s}
                        className={cn(
                          "h-1 rounded-full transition-all duration-300",
                          step === s
                            ? "w-6 bg-indigo-400"
                            : (["search", "form", "pending"].indexOf(step) > i
                              ? "w-2 bg-indigo-500/40"
                              : "w-2 bg-white/10")
                        )}
                      />
                    ))}
                  </div>
                  <h2 className="text-xl font-display font-medium text-[#E8EDF8]">
                    {STEP_TITLES[step]}
                  </h2>
                  {STEP_SUBTITLES[step] && (
                    <p className="text-[11px] font-mono text-[#3F5878] uppercase tracking-widest">
                      {STEP_SUBTITLES[step]}
                    </p>
                  )}
                </div>
                {step !== "pending" && (
                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[#567090] hover:text-[#E8EDF8] hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
              <AnimatePresence mode="wait">
                {step === "search" && (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <SearchStep
                      onFound={onClose}
                      onNotFound={handleNotFound}
                    />
                  </motion.div>
                )}

                {step === "form" && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                    className="max-h-[60vh] overflow-y-auto pr-1 space-y-1"
                  >
                    <RequestForm
                      prefill={namePrefill}
                      onBack={() => setStep("search")}
                      onSuccess={handleSuccess}
                      repEmail={repEmail}
                    />
                  </motion.div>
                )}

                {step === "pending" && (
                  <motion.div
                    key="pending"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PendingStep expiresAt={expiresAt} onClose={onClose} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
