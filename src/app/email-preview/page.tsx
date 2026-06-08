"use client";

import { useState } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const PROP = "2679 Taylor St, Madison, WI 53704";
const DATE = "June 4, 2026";
const INSP = "Eric Catania";

// ─── Atoms ─────────────────────────────────────────────────────────────────────
const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 bg-amber-400 rounded flex items-center justify-center font-black text-slate-900 text-base">H</div>
    <div>
      <div className="text-white font-black text-sm tracking-widest leading-none">HUSTAD</div>
      <div className="text-amber-400 text-xs tracking-wider leading-none mt-0.5">COMPANIES</div>
    </div>
  </div>
);

const Badge = ({ text, v }: { text: string; v: string }) => {
  const map: Record<string, string> = {
    executed: "bg-emerald-500 text-white",
    pending:  "bg-amber-400 text-slate-900",
    proposal: "bg-blue-600 text-white",
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${map[v]}`}>{text}</span>;
};

const SL = ({ children }: { children: React.ReactNode }) => (
  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">{children}</p>
);

// ─── Email Header ───────────────────────────────────────────────────────────────
const Hdr = ({ title, tag, bt, bv, ac = "text-amber-400" }: { title: string; tag: string; bt: string; bv: string; ac?: string }) => (
  <div className="bg-slate-900 px-8 py-7">
    <div className="flex justify-between items-start mb-8">
      <Logo />
      <Badge text={bt} v={bv} />
    </div>
    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${ac}`}>{tag}</p>
    <h1 className="text-white text-2xl font-bold leading-tight max-w-xs">{title}</h1>
  </div>
);

// ─── Property Row ───────────────────────────────────────────────────────────────
const PropRow = () => (
  <div className="bg-gray-50 border-b border-gray-200 px-8 py-4">
    <div className="flex flex-wrap gap-x-8 gap-y-2">
      {([["Property", PROP], ["Inspection Date", DATE], ["Inspector", INSP], ["Report Sent", DATE]] as [string, string][]).map(([l, v]) => (
        <div key={l}>
          <p className="text-gray-400 text-xs uppercase tracking-wide">{l}</p>
          <p className="text-gray-800 text-sm font-semibold">{v}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─── Stats Grid ─────────────────────────────────────────────────────────────────
const Stats = ({ data }: { data: { l: string; v: string; vc: string; bg: string; bc: string }[] }) => (
  <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
    <SL>Inspection Summary</SL>
    <div className="grid grid-cols-3 gap-3">
      {data.map(({ l, v, vc, bg, bc }) => (
        <div key={l} className={`${bg} border ${bc} rounded-xl p-4 text-center`}>
          <div className={`text-3xl font-black ${vc}`}>{v}</div>
          <div className="text-gray-500 text-xs mt-1 leading-tight">{l}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Storm Banner ───────────────────────────────────────────────────────────────
const StormBanner = () => (
  <div className="px-8 py-3 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
    <span className="text-amber-500 flex-shrink-0">⚡</span>
    <p className="text-xs">
      <span className="font-bold text-amber-800">STORM EVENT CONFIRMED — </span>
      <span className="text-amber-700">NWS Milwaukee and Sullivan products support a severe Dane County hail event on April 16, 2024.</span>
    </p>
  </div>
);

// ─── Findings List ──────────────────────────────────────────────────────────────
const Findings = ({ items, icon = "•", ic = "text-amber-500", label = "Key Findings" }: { items: string[]; icon?: string; ic?: string; label?: string }) => (
  <div className="px-8 py-6 bg-white border-b border-gray-200">
    <SL>{label}</SL>
    <ul className="space-y-2">
      {items.map((f, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-700">
          <span className={`flex-shrink-0 mt-0.5 ${ic}`}>{icon}</span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  </div>
);

// ─── Photo Grid ─────────────────────────────────────────────────────────────────
const Photos = ({ label = "Storm Evidence · Strongest Proof Photos" }: { label?: string }) => (
  <div className="px-8 py-6 bg-white border-b border-gray-200">
    <SL>{label}</SL>
    <div className="grid grid-cols-3 gap-2 mb-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-lg h-24 flex flex-col items-center justify-center border border-gray-200">
          <span className="text-2xl text-gray-300">📷</span>
          <span className="text-gray-400 text-xs mt-1">Photo {i + 1}</span>
        </div>
      ))}
    </div>
    <p className="text-gray-400 text-xs">Full-resolution photos available in your inspection portal account.</p>
  </div>
);

// ─── Steps List ─────────────────────────────────────────────────────────────────
const Steps = ({ items }: { items: { t: string; d: string }[] }) => (
  <div className="px-8 py-6 bg-white border-b border-gray-200">
    <SL>Your Next Steps</SL>
    <div className="space-y-4">
      {items.map(({ t, d }, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{t}</p>
            <p className="text-xs text-gray-500 mt-0.5">{d}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Rec Box ────────────────────────────────────────────────────────────────────
const RecBox = ({ icon, title, desc, bg = "bg-amber-50", bc = "border-amber-100", tc = "text-amber-900", dc = "text-amber-800", ib = "bg-amber-400" }: { icon: string; title: string; desc: string; bg?: string; bc?: string; tc?: string; dc?: string; ib?: string }) => (
  <div className={`px-8 py-5 ${bg} border-b ${bc}`}>
    <div className="flex gap-3">
      <div className={`w-10 h-10 ${ib} rounded-lg flex items-center justify-center flex-shrink-0 text-xl`}>{icon}</div>
      <div>
        <p className={`font-bold text-sm ${tc}`}>{title}</p>
        <p className={`text-xs mt-1 leading-relaxed ${dc}`}>{desc}</p>
      </div>
    </div>
  </div>
);

// ─── Footer ─────────────────────────────────────────────────────────────────────
const Footer = () => (
  <div className="bg-slate-900 px-8 py-8">
    <div className="flex flex-col items-center gap-3">
      <Logo />
      <div className="text-center text-gray-500 text-xs space-y-1 mt-1">
        <p>Hustad Companies, Inc. · Madison, Wisconsin</p>
        <p>Licensed Exterior Restoration Contractor · State of Wisconsin</p>
        <p>General Liability & Workers&apos; Compensation Insurance Verified</p>
      </div>
      <div className="border-t border-slate-800 w-full mt-2 pt-4 text-center">
        <p className="text-gray-600 text-xs max-w-sm mx-auto leading-relaxed">This report is confidential and prepared solely for the property owner identified above. It reflects conditions observed at the time of inspection and does not constitute a guarantee of insurance coverage or claim outcome.</p>
      </div>
    </div>
  </div>
);

// ─── Full Insurance Contingency Agreement Text ──────────────────────────────────
const AgreeText = () => (
  <div className="text-xs text-gray-600 leading-relaxed space-y-4">
    {([
      ["Parties and Property", `This Insurance Contingency Agreement ("Agreement") is entered into between the property owner(s) identified at the time of signing ("Homeowner") and Hustad Companies, Inc., a Wisconsin corporation ("Contractor"). This Agreement applies to the property address documented in the associated inspection session. Both parties agree that the inspection findings recorded by the Contractor's representative on the date of this Agreement constitute the factual basis for the scope of work described herein.`],
      ["Scope of Work", `Contractor agrees to perform the exterior restoration or repair services identified in the inspection findings summary presented during this session. The scope is limited to the items documented, photographed, and classified during today's inspection. No work beyond the documented scope will be performed without a written change order signed by the Homeowner. The Contractor's recommendation is based solely on findings observed at the property and does not include speculative or preventive items not documented today.`],
      ["Insurance Contingency", `This Agreement is contingent upon the Homeowner's insurance carrier approving coverage for the documented scope of work. If the carrier denies coverage in full, the Homeowner may cancel this Agreement within 3 business days of receiving written notice of denial at no penalty. If the carrier approves partial coverage, the parties will review the approved scope and agree in writing before work begins. The Contractor will not begin production work until insurance coverage determination has been received and confirmed in writing. Hustad Companies is not a licensed public adjuster and will not negotiate claim terms with the Homeowner's carrier on the Homeowner's behalf.`],
      ["Compensation and Payment", `Compensation for work performed under this Agreement shall be the amount approved by the Homeowner's insurance carrier for the documented scope, including applicable overhead and profit, as established by the carrier's written settlement. The Homeowner's deductible, any depreciation withheld pending completion, and any non-covered items agreed to separately remain the financial responsibility of the Homeowner. The Contractor will not waive, absorb, or rebate any portion of the insurance deductible as prohibited under Wisconsin Statute § 100.65. Final invoicing will be provided upon project completion.`],
      ["Scheduling and Production", `Following insurance approval and written authorization from the Homeowner, the Contractor will schedule the work within a reasonable timeframe subject to production capacity, material availability, and weather conditions. The Homeowner agrees to provide reasonable access to the property for pre-production measurements, material delivery, and the work itself. The Contractor will notify the Homeowner at least 48 hours in advance of the production start date.`],
      ["Homeowner Obligations", `The Homeowner agrees to: (a) promptly file or confirm an active insurance claim for the documented storm event if not already filed; (b) notify the Contractor within 5 business days of any written communication received from the insurance carrier regarding this claim; (c) provide the Contractor access to any carrier-issued Explanation of Benefits, adjuster reports, or coverage decisions within 5 business days of receipt; and (d) not authorize any other contractor to perform work on the documented scope while this Agreement is active without written notice to Hustad Companies.`],
      ["Wisconsin Cancellation Rights", `You have the right to cancel this Agreement without penalty within 3 business days of the date signed. To cancel, you must provide written notice to Hustad Companies, Inc. by mail, email, or hand delivery. This right of cancellation is in addition to any right of cancellation provided under Wisconsin law if your insurance carrier denies coverage. Notice of cancellation should be directed to: Hustad Companies, Inc., Madison, Wisconsin. This disclosure is provided in compliance with Wisconsin Statute § 100.65 and regulations promulgated by the Wisconsin Department of Agriculture, Trade and Consumer Protection (DATCP).`],
      ["Representations and Warranties", `The Contractor represents that it is licensed to perform roofing and exterior restoration work in the State of Wisconsin, carries appropriate general liability and workers' compensation insurance, and will perform all work in a workmanlike manner consistent with applicable building codes. The Homeowner represents that they are the legal owner or authorized agent of the property and have the authority to enter into this Agreement. The Contractor's workmanship warranty terms are separate from and in addition to any manufacturer warranty associated with installed materials, and will be provided in writing upon project completion.`],
      ["Dispute Resolution", `In the event of a dispute arising from this Agreement, the parties agree to first attempt resolution through direct negotiation. If negotiation is unsuccessful within 30 days, disputes shall be submitted to binding arbitration in Dane County, Wisconsin under the rules of the American Arbitration Association. This Agreement shall be governed by and construed in accordance with the laws of the State of Wisconsin.`],
    ] as [string, string][]).map(([h, p]) => (
      <div key={h}>
        <p className="font-bold text-gray-800 text-xs mb-1">{h}</p>
        <p>{p}</p>
      </div>
    ))}
  </div>
);

// ─── Agreement Wrappers ─────────────────────────────────────────────────────────
const AgreeExec = ({ docTitle, hdrBg = "bg-emerald-700", ftBg = "bg-emerald-50", text = <AgreeText /> }: { docTitle: string; hdrBg?: string; ftBg?: string; text?: React.ReactNode }) => (
  <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
    <div className="flex items-center justify-between mb-4">
      <SL>Your Executed Agreement</SL>
      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">✓ EXECUTED</span>
    </div>
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className={`${hdrBg} px-5 py-3`}>
        <p className="text-white text-xs font-bold">{docTitle} — EXECUTED COPY</p>
        <p className="text-emerald-200 text-xs mt-0.5">Signed: {DATE} · Property: {PROP}</p>
      </div>
      <div className="px-6 py-5 max-h-72 overflow-y-auto">{text}</div>
      <div className={`border-t border-gray-200 px-6 py-4 ${ftBg}`}>
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div>
            <p className="text-gray-500 uppercase tracking-wide text-xs mb-1">Homeowner</p>
            <p className="border-b border-gray-400 pb-1 italic text-gray-700">Authorized Electronically</p>
            <p className="text-gray-400 mt-1">{DATE}</p>
          </div>
          <div>
            <p className="text-gray-500 uppercase tracking-wide text-xs mb-1">Hustad Representative</p>
            <p className="border-b border-gray-400 pb-1 italic text-gray-700">{INSP}</p>
            <p className="text-gray-400 mt-1">{DATE} · Hustad Companies, Inc.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AgreePend = ({ docTitle, notice, text = <AgreeText /> }: { docTitle: string; notice: string; text?: React.ReactNode }) => (
  <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
    <div className="flex items-center justify-between mb-4">
      <SL>Agreement — Pending Your Signature</SL>
      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">SIGNATURE PENDING</span>
    </div>
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800">
      <p className="font-bold mb-1">Before You Sign</p>
      <p>{notice}</p>
    </div>
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-slate-800 px-5 py-3">
        <p className="text-white text-xs font-bold">{docTitle} — REVIEW COPY</p>
        <p className="text-gray-400 text-xs mt-0.5">Prepared: {DATE} · Property: {PROP}</p>
      </div>
      <div className="px-6 py-5 max-h-72 overflow-y-auto">{text}</div>
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div>
            <p className="text-gray-500 uppercase tracking-wide text-xs mb-1">Homeowner Signature</p>
            <div className="border-b-2 border-dashed border-gray-300 h-6 mb-1"></div>
            <p className="text-gray-400">Date: ________________________</p>
          </div>
          <div>
            <p className="text-gray-500 uppercase tracking-wide text-xs mb-1">Hustad Representative</p>
            <p className="border-b border-gray-400 pb-1 italic text-gray-700">{INSP}</p>
            <p className="text-gray-400 mt-1">{DATE} · Hustad Companies, Inc.</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-4 pt-3 border-t border-gray-200">To sign this agreement, contact your Hustad representative or use the secure link provided in your original inspection session email.</p>
      </div>
    </div>
  </div>
);

// ─── Repair Auth Text ───────────────────────────────────────────────────────────
const RepairAuthText = ({ scope }: { scope: string[] }) => (
  <div className="text-xs text-gray-600 leading-relaxed space-y-4">
    <div>
      <p className="font-bold text-gray-800 mb-1">Scope Authorization</p>
      <p>This Repair Authorization confirms the Homeowner&apos;s approval for Hustad Companies, Inc. to perform the documented exterior repair scope at the property identified above. Work is limited to the items documented during the inspection. No work beyond the documented scope will be performed without a signed change order signed by the Homeowner.</p>
    </div>
    <div>
      <p className="font-bold text-gray-800 mb-1">Authorized Scope of Work</p>
      <ul className="space-y-1 list-none">
        {scope.map((s, i) => <li key={i} className="flex gap-2"><span className="text-emerald-500">✓</span>{s}</li>)}
      </ul>
    </div>
    <div>
      <p className="font-bold text-gray-800 mb-1">Compensation</p>
      <p>Compensation is limited to the agreed estimate for the authorized scope. The Homeowner&apos;s financial responsibility is as stated in the estimate. Final invoicing will be provided upon project completion and walkthrough.</p>
    </div>
    <div>
      <p className="font-bold text-gray-800 mb-1">Representations and Warranties</p>
      <p>The Contractor is licensed to perform roofing and exterior restoration work in Wisconsin, carries appropriate general liability and workers&apos; compensation insurance, and will perform all work in a workmanlike manner consistent with applicable building codes. Workmanship warranty terms will be provided in writing upon project completion.</p>
    </div>
    <div>
      <p className="font-bold text-gray-800 mb-1">Wisconsin Cancellation Rights</p>
      <p>You have the right to cancel this Agreement without penalty within 3 business days of the date signed. To cancel, provide written notice to Hustad Companies, Inc. by mail, email, or hand delivery. This disclosure is provided in compliance with Wisconsin Statute § 100.65.</p>
    </div>
    <div>
      <p className="font-bold text-gray-800 mb-1">Dispute Resolution</p>
      <p>Disputes shall be submitted to binding arbitration in Dane County, Wisconsin under the rules of the American Arbitration Association. This Agreement is governed by the laws of the State of Wisconsin.</p>
    </div>
  </div>
);

// ─── HAIL FINDINGS (reused in both hail reports) ────────────────────────────────
const HAIL_STATS = [
  { l: "Storm Indicators", v: "7",  vc: "text-amber-600", bg: "bg-amber-50",  bc: "border-amber-200" },
  { l: "Monitor Items",    v: "2",  vc: "text-blue-600",  bg: "bg-blue-50",   bc: "border-blue-200" },
  { l: "Photos Taken",     v: "24", vc: "text-gray-600",  bg: "bg-gray-100",  bc: "border-gray-200" },
];
const HAIL_FINDS = [
  "Hail impact spatter on soft metal surfaces — gutters, downspouts, and flashing",
  "Granule displacement observed across multiple roof planes",
  "Impact dents visible on ridge cap and field shingles",
  "Soft metal deformation consistent with 1\"–1.5\" hail diameter",
  "Drip edge denting along north and west elevations",
];
const REPAIR_SCOPE_ITEMS = [
  "Replace damaged valley flashing — left rear slope",
  "Reseal and recaulk pipe boot penetrations — 3 locations",
  "Replace deteriorated ridge cap — east ridge",
  "Resecure and seal open drip edge — north fascia",
];

// ══════════════════════════════════════════════════════════════════════════════
//  REPORT 1 — HAIL / CARRIER REVIEW — AUTHORIZED (SOLD)
// ══════════════════════════════════════════════════════════════════════════════
const R1 = () => (
  <div>
    <Hdr title="Your Carrier Review Report" tag="Inspection Complete · Claim Path" bt="Agreement Executed" bv="executed" />
    <PropRow />
    <div className="px-8 py-6 bg-white border-b border-gray-200">
      <p className="text-gray-700 text-sm leading-relaxed">Thank you for authorizing Hustad Companies to coordinate your insurance claim. Below is your complete inspection report and a copy of your executed Insurance Contingency Agreement. We will manage the carrier coordination process and keep you informed at each stage. <strong className="text-gray-900">No production work begins until your carrier issues a written coverage determination.</strong></p>
    </div>
    <Stats data={HAIL_STATS} />
    <StormBanner />
    <Findings items={HAIL_FINDS} />
    <Photos />
    <Steps items={[
      { t: "Confirm Your Claim is Active", d: "Let us know if your claim has been filed, or if you need guidance on filing with your carrier." },
      { t: "Carrier Inspection Coordinated", d: "Hustad will schedule the adjuster visit and be present to ensure documented findings are accurately represented." },
      { t: "Review Your Coverage Decision", d: "Share any Explanation of Benefits or adjuster correspondence with your Hustad rep within 5 business days of receipt." },
      { t: "Production Scheduled", d: "Once coverage is confirmed in writing, we will schedule production and provide 48-hour advance notice." },
    ]} />
    <AgreeExec docTitle="INSURANCE CONTINGENCY AGREEMENT" />
    <Footer />
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  REPORT 2 — HAIL / CARRIER REVIEW — FOR REVIEW (NOT SOLD)
// ══════════════════════════════════════════════════════════════════════════════
const R2 = () => (
  <div>
    <Hdr title="Your Carrier Review Report" tag="Inspection Complete · Review Requested" bt="Awaiting Your Review" bv="pending" />
    <PropRow />
    <div className="px-8 py-6 bg-white border-b border-gray-200">
      <p className="text-gray-700 text-sm leading-relaxed">Hustad Companies has completed your exterior inspection and documented conditions consistent with storm-related impact. Based on our findings, we recommend a formal carrier review before any out-of-pocket expense. <strong className="text-gray-900">Review this report and the attached agreement at your convenience — there is no obligation to sign today.</strong></p>
    </div>
    <RecBox icon="⚖️" title="Our Recommendation: Carrier Review" desc="The documented storm findings are strong enough to justify a formal carrier inspection before spending any out-of-pocket money. This is not a coverage guarantee — it is a recommendation to let the documented evidence be evaluated by your insurance carrier." />
    <Stats data={HAIL_STATS} />
    <StormBanner />
    <Findings items={HAIL_FINDS} />
    <Photos />
    <Steps items={[
      { t: "Review This Report", d: "Take time to review the inspection findings and photo documentation below." },
      { t: "Review the Agreement Below", d: "Read the Insurance Contingency Agreement included at the bottom of this report. Contact your rep with any questions." },
      { t: "Sign to Authorize Carrier Coordination", d: "Signing authorizes Hustad to organize your documentation package and coordinate a carrier inspection. No work begins until coverage is confirmed." },
      { t: "File or Confirm Your Claim", d: "We can guide you on filing if needed. Let your Hustad rep know the status of your claim." },
    ]} />
    <AgreePend
      docTitle="INSURANCE CONTINGENCY AGREEMENT"
      notice="This agreement authorizes Hustad to organize your documentation and coordinate a carrier inspection — nothing more. No repair or restoration work begins until your insurance carrier issues a written coverage determination and you authorize production in writing. Your deductible and any non-covered items remain your financial responsibility."
    />
    <Footer />
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  REPORT 3 — REPAIR ONLY — AUTHORIZED (SOLD)
// ══════════════════════════════════════════════════════════════════════════════
const R3 = () => (
  <div>
    <Hdr title="Your Repair Authorization Report" tag="Inspection Complete · Repair Path" bt="Repair Authorized" bv="executed" />
    <PropRow />
    <div className="px-8 py-6 bg-white border-b border-gray-200">
      <p className="text-gray-700 text-sm leading-relaxed">Thank you for authorizing Hustad Companies to complete the documented repairs at your property. Below is your inspection summary, authorized scope of work, and a copy of your executed Repair Authorization. Our scheduling team will contact you within 2 business days to confirm your production date.</p>
    </div>
    <Stats data={[
      { l: "Repair Items",  v: "4",  vc: "text-orange-600", bg: "bg-orange-50",  bc: "border-orange-200" },
      { l: "Monitor Items", v: "1",  vc: "text-blue-600",   bg: "bg-blue-50",    bc: "border-blue-200" },
      { l: "Photos Taken",  v: "12", vc: "text-gray-600",   bg: "bg-gray-100",   bc: "border-gray-200" },
    ]} />
    <Findings label="Documented Conditions" icon="▸" ic="text-orange-500" items={[
      "Cracked and deteriorated valley flashing — left rear slope — active leak risk",
      "Pipe boot penetration seals failing — 3 locations — moisture intrusion present",
      "Ridge cap shingles lifting and unsealed — east ridge — wind vulnerability",
      "Open drip edge along north fascia — water infiltration risk identified",
    ]} />
    <div className="px-8 py-6 bg-white border-b border-gray-200">
      <SL>Authorized Repair Scope</SL>
      <ul className="space-y-2">
        {REPAIR_SCOPE_ITEMS.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="text-emerald-500 flex-shrink-0">✓</span><span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
    <Photos label="Repair Documentation · Inspection Photos" />
    <Steps items={[
      { t: "Scheduling Confirmation", d: "Expect a call from our scheduling team within 2 business days to confirm your production window." },
      { t: "Pre-Production Measurement", d: "A Hustad field team member will confirm final measurements before material is ordered." },
      { t: "48-Hour Advance Notice", d: "You will receive notification at least 48 hours before your scheduled production start date." },
      { t: "Completion and Final Invoice", d: "Final invoicing will be provided upon project completion and a brief walkthrough with your rep." },
    ]} />
    <AgreeExec
      docTitle="REPAIR AUTHORIZATION"
      hdrBg="bg-emerald-700"
      ftBg="bg-emerald-50"
      text={<RepairAuthText scope={REPAIR_SCOPE_ITEMS} />}
    />
    <Footer />
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  REPORT 4 — REPAIR ONLY — FOR REVIEW (NOT SOLD)
// ══════════════════════════════════════════════════════════════════════════════
const R4 = () => (
  <div>
    <Hdr title="Your Repair Estimate Report" tag="Inspection Complete · Repair Recommended" bt="Awaiting Authorization" bv="pending" />
    <PropRow />
    <div className="px-8 py-6 bg-white border-b border-gray-200">
      <p className="text-gray-700 text-sm leading-relaxed">Hustad Companies has completed your exterior inspection and identified conditions that require targeted repair. The documented scope is specific and actionable. <strong className="text-gray-900">Review the findings and repair authorization below. No work begins until you sign and return the authorization.</strong></p>
    </div>
    <RecBox icon="🔧" title="Our Recommendation: Targeted Repair" desc="The documented conditions do not support a full insurance claim path at this time. However, these findings represent real damage with a clear, cost-effective repair solution. Addressing them now protects your home from further deterioration and preserves your roof warranty coverage." bg="bg-orange-50" bc="border-orange-100" tc="text-orange-900" dc="text-orange-800" ib="bg-orange-500" />
    <Stats data={[
      { l: "Repair Items",  v: "4",  vc: "text-orange-600", bg: "bg-orange-50",  bc: "border-orange-200" },
      { l: "Monitor Items", v: "1",  vc: "text-blue-600",   bg: "bg-blue-50",    bc: "border-blue-200" },
      { l: "Photos Taken",  v: "12", vc: "text-gray-600",   bg: "bg-gray-100",   bc: "border-gray-200" },
    ]} />
    <Findings label="Documented Conditions" icon="▸" ic="text-orange-500" items={[
      "Cracked and deteriorated valley flashing — left rear slope — active leak risk",
      "Pipe boot penetration seals failing — 3 locations — moisture intrusion present",
      "Ridge cap shingles lifting and unsealed — east ridge — wind vulnerability",
      "Open drip edge along north fascia — water infiltration risk identified",
    ]} />
    <div className="px-8 py-6 bg-white border-b border-gray-200">
      <SL>Recommended Repair Scope</SL>
      <ul className="space-y-2">
        {REPAIR_SCOPE_ITEMS.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="text-amber-500 flex-shrink-0">•</span><span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
    <Photos label="Repair Documentation · Inspection Photos" />
    <Steps items={[
      { t: "Review This Report", d: "Take time to review the documented findings and recommended repair scope." },
      { t: "Review the Repair Authorization Below", d: "Read the scope and terms. Your Hustad representative is available to answer any questions." },
      { t: "Authorize the Repair", d: "Sign and return the authorization form below, or contact your Hustad rep to complete signing." },
      { t: "Scheduling Confirmation", d: "Once authorized, our scheduling team will contact you within 2 business days." },
    ]} />
    <AgreePend
      docTitle="REPAIR AUTHORIZATION"
      notice="This authorization, when signed, confirms your approval for Hustad to perform the documented repair scope listed above. Scope is limited strictly to the items documented during the inspection. No additional work will be performed without a signed change order. Work begins after you authorize and a production date is confirmed."
      text={<RepairAuthText scope={REPAIR_SCOPE_ITEMS} />}
    />
    <Footer />
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  REPORT 5 — FULL RESTORATION / DIRECT BUY (PROPOSAL IN PROGRESS)
// ══════════════════════════════════════════════════════════════════════════════
const R5 = () => (
  <div>
    <Hdr title="Your Roof Replacement Proposal" tag="Inspection Complete · Full Replacement" bt="Proposal in Progress" bv="proposal" ac="text-blue-400" />
    <PropRow />
    <div className="px-8 py-6 bg-white border-b border-gray-200">
      <p className="text-gray-700 text-sm leading-relaxed">Hustad Companies has completed your exterior inspection and documented conditions consistent with a full roof replacement. Based on our findings, you have requested a standard replacement proposal. <strong className="text-gray-900">Our estimating department is currently preparing your custom proposal and will send it for your review within 2–3 business days.</strong> No action is required from you at this time.</p>
    </div>
    <div className="px-8 py-5 bg-blue-50 border-b border-blue-100">
      <div className="flex gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xl">📋</div>
        <div>
          <p className="font-bold text-sm text-blue-900">Your Proposal Is Being Prepared</p>
          <p className="text-xs mt-1 leading-relaxed text-blue-800">Your Hustad estimating team is reviewing the documented inspection findings and preparing a complete, itemized replacement proposal. This proposal will include material options, pricing, timeline, and warranty details. No decisions or signatures are required until you have reviewed the proposal in full.</p>
        </div>
      </div>
    </div>
    <Stats data={[
      { l: "Conditions Found", v: "9",  vc: "text-red-600",   bg: "bg-red-50",    bc: "border-red-200" },
      { l: "Monitor Items",    v: "2",  vc: "text-blue-600",  bg: "bg-blue-50",   bc: "border-blue-200" },
      { l: "Photos Taken",     v: "31", vc: "text-gray-600",  bg: "bg-gray-100",  bc: "border-gray-200" },
    ]} />
    <Findings label="Documented Conditions" icon="▸" ic="text-red-400" items={[
      "Advanced granule loss across all roof planes — end of serviceable life indicated",
      "Multiple hail and storm impact sites consistent with documented storm events",
      "Deteriorated flashings and compromised penetration seals throughout",
      "Ridge ventilation system degraded — replacement required with new roof system",
      "Gutter system damaged and misaligned — replacement recommended with roof work",
    ]} />
    <Photos label="Storm Evidence · Strongest Proof Photos" />
    <div className="px-8 py-6 bg-white border-b border-gray-200">
      <SL>What Your Proposal Will Include</SL>
      <div className="space-y-4">
        {([
          ["📐", "Complete Scope of Work",       "Full replacement specification including decking inspection, underlayment, shingles, flashings, ridge, ventilation, and all accessories."],
          ["🎨", "Material Options",              "Two or more shingle product selections with pricing, manufacturer warranty terms, and aesthetic details."],
          ["💲", "Itemized Pricing",              "Full line-item pricing breakdown covering all labor, materials, removal, disposal, and applicable installation warranties."],
          ["📅", "Estimated Production Timeline", "Projected production window based on current scheduling availability and material lead times."],
        ] as [string, string, string][]).map(([icon, t, d]) => (
          <div key={t} className="flex gap-3">
            <span className="text-xl flex-shrink-0">{icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{t}</p>
              <p className="text-xs text-gray-500 mt-0.5">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
    <Steps items={[
      { t: "Proposal Delivered to You",   d: "Your Hustad estimating team will send your custom proposal to this email address within 2–3 business days." },
      { t: "Review at Your Own Pace",      d: "Take time to review the scope, material options, and pricing. No pressure and no deadline to decide." },
      { t: "Ask Questions Anytime",        d: "Your Hustad representative is available to walk through any part of the proposal before you make a decision." },
      { t: "Authorize to Proceed",         d: "Once you are ready to move forward, sign the proposal and we will schedule your production date." },
    ]} />
    <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
      <SL>Questions Before Your Proposal Arrives?</SL>
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-amber-400 text-xl flex-shrink-0">👤</div>
          <div>
            <p className="text-sm font-bold text-gray-800">{INSP}</p>
            <p className="text-xs text-gray-500">Your Hustad Representative</p>
            <p className="text-xs text-gray-500">Hustad Companies, Inc. · Madison, Wisconsin</p>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

// ─── Tab Config ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "r1", label: "Hail/Claim\nAuthorized",  group: "01" },
  { id: "r2", label: "Hail/Claim\nFor Review",   group: "01" },
  { id: "r3", label: "Repair Only\nAuthorized",  group: "02" },
  { id: "r4", label: "Repair Only\nFor Review",  group: "02" },
  { id: "r5", label: "Full\nRestoration",         group: "03" },
];

const REPORTS: Record<string, React.ReactNode> = {
  r1: <R1 />, r2: <R2 />, r3: <R3 />, r4: <R4 />, r5: <R5 />,
};

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function EmailPreviewPage() {
  const [active, setActive] = useState("r1");

  return (
    <div className="min-h-screen bg-gray-300" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {/* ── Selector Bar ── */}
      <div className="bg-slate-950 px-4 py-4 sticky top-0 z-50 shadow-xl">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2" style={{ fontFamily: "system-ui, sans-serif" }}>
            Hustad Companies · Email Report Mockup · Select Report Type
          </p>
          <div className="grid grid-cols-5 gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`py-2.5 px-1 rounded-lg text-xs font-bold text-center transition-all leading-tight whitespace-pre-line ${
                  active === t.id ? "bg-amber-400 text-slate-900" : "text-gray-400 hover:text-gray-200 hover:bg-slate-800"
                }`}
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                <span className={`block text-xs mb-0.5 ${active === t.id ? "text-slate-700" : "text-gray-600"}`}>PATH {t.group}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Email Preview Shell ── */}
      <div className="max-w-2xl mx-auto my-6 px-4 pb-12">
        <div className="bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-300">
          {/* Simulated email client chrome */}
          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center gap-3" style={{ fontFamily: "system-ui, sans-serif" }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-1 text-xs text-gray-400 truncate">
              From: reports@hustad.com · Subject: Your Hustad Companies Inspection Report — {PROP}
            </div>
          </div>
          {/* Report Content */}
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {REPORTS[active]}
          </div>
        </div>
        <p className="text-center text-gray-400 text-xs mt-4" style={{ fontFamily: "system-ui, sans-serif" }}>
          Interactive mockup — select a path above to preview each report variant
        </p>
      </div>
    </div>
  );
}
