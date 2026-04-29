"use client";

import { useSession } from "@/components/SessionProvider";
import { P00RepLaunch } from "@/components/screens/P00RepLaunch";
import { A01Welcome } from "@/components/screens/A01Welcome";
import { A02WhyInspection } from "@/components/screens/A02WhyInspection";
import {
  A03WhatWeInspect,
  A04HowFindingsSorted,
  A05InsuranceClarity,
} from "@/components/screens/A03_A05";
import {
  A06WarrantyImpact,
  A07WhyHustad,
  A08WhatYouReceive,
} from "@/components/screens/A06_A08";
import { A09BuyerPriorities } from "@/components/screens/A09BuyerPriorities";
import { A10InspectionHold, B11RepFindingsPrep } from "@/components/screens/A10_B11";
import {
  B12FindingsSummary,
  B13RecommendedPath,
  B14PathDecision,
  B15UrgentProtection,
} from "@/components/screens/B12_B15";
import {
  B16SystemOptions,
  B17AgreementSummary,
  B18SignatureDeferral,
  B19NextSteps,
} from "@/components/screens/B16_B19";

export function ScreenRouter() {
  const {
    session, updateSession, goNext, goBack, jumpTo,
    repJumpTo, resetSession, loadDraft, isOnline,
  } = useSession();

  const props = {
    session,
    onUpdate: updateSession,
    onNext: goNext,
    onBack: goBack,
  };

  switch (session.currentScreen) {
    case "P00_rep_launch":
      return (
        <P00RepLaunch
          session={session}
          onUpdate={updateSession}
          onNext={goNext}
          onLoadDraft={loadDraft}
          onRepJump={repJumpTo}
          isOnline={isOnline}
        />
      );

    case "A01_welcome":
      return (
        <A01Welcome
          session={session}
          onNext={goNext}
          onSkip={() => jumpTo("A10_inspection_hold")}
        />
      );

    case "A02_why_inspection":
      return <A02WhyInspection {...props} />;

    case "A03_what_we_inspect":
      return <A03WhatWeInspect {...props} />;

    case "A04_how_findings_sorted":
      return <A04HowFindingsSorted {...props} />;

    case "A05_insurance_clarity":
      return <A05InsuranceClarity {...props} />;

    case "A06_warranty_impact":
      return <A06WarrantyImpact {...props} />;

    case "A07_why_hustad":
      return <A07WhyHustad {...props} />;

    case "A08_what_you_receive":
      return <A08WhatYouReceive {...props} />;

    case "A09_buyer_priorities":
      return <A09BuyerPriorities {...props} />;

    case "A10_inspection_hold":
      return (
        <A10InspectionHold
          session={session}
          onRepReturn={() => jumpTo("B11_rep_findings_prep")}
        />
      );

    case "B11_rep_findings_prep":
      return (
        <B11RepFindingsPrep
          session={session}
          onUpdate={updateSession}
          onNext={goNext}
        />
      );

    case "B12_findings_summary":
      return (
        <B12FindingsSummary
          {...props}
          onRepJump={repJumpTo}
        />
      );

    case "B13_recommended_path":
      return <B13RecommendedPath {...props} />;

    case "B14_path_decision":
      return <B14PathDecision {...props} />;

    case "B15_urgent_protection":
      return <B15UrgentProtection {...props} />;

    case "B16_system_options":
      return <B16SystemOptions {...props} />;

    case "B17_agreement_summary":
      return <B17AgreementSummary {...props} />;

    case "B18_signature_deferral":
      return <B18SignatureDeferral {...props} />;

    case "B19_next_steps":
      return (
        <B19NextSteps
          session={session}
          onUpdate={updateSession}
          onFinish={resetSession}
        />
      );

    default:
      return (
        <div className="screen-container items-center justify-center">
          <p className="font-mono text-hustad-navy/40">Unknown screen</p>
          <button className="btn-primary mt-4" onClick={resetSession}>
            Reset Session
          </button>
        </div>
      );
  }
}
