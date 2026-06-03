"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/components/SessionProvider";
import { navigateTo } from "@/lib/session";
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
import { A11Innovation } from "@/components/screens/A11_Innovation";
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
  B15CarrierReviewAgreement,
} from "@/components/screens/B16_B19";

const SCREEN_ORDER = [
  "P00_rep_launch",
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

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
};

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

  const prevScreenRef = useRef(session.currentScreen);
  const directionRef = useRef(1);

  if (prevScreenRef.current !== session.currentScreen) {
    const prevIdx = SCREEN_ORDER.indexOf(prevScreenRef.current);
    const nextIdx = SCREEN_ORDER.indexOf(session.currentScreen);
    directionRef.current = nextIdx >= prevIdx ? 1 : -1;
    prevScreenRef.current = session.currentScreen;
  }

  // SYNC URL WITH SCREEN (Enables Browser Back/Forward)
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", session.currentScreen);
    window.history.pushState({ screen: session.currentScreen }, "", url.toString());
  }, [session.currentScreen]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.screen) {
        jumpTo(event.state.screen);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [jumpTo]);

  let content: JSX.Element | null = null;

  switch (session.currentScreen) {
    case "P00_rep_launch":
      content = (
        <P00RepLaunch
          session={session}
          onUpdate={updateSession}
          onNext={goNext}
          onLoadDraft={loadDraft}
          onRepJump={repJumpTo}
          isOnline={isOnline}
          onResetSession={resetSession}
        />
      );
      break;

    case "A01_welcome":
      content = (
        <A01Welcome
          session={session}
          onUpdate={updateSession}
          onNext={goNext}
          onBack={goBack}
          onSkip={() => jumpTo("A10_inspection_hold")}
        />
      );
      break;

    case "A02_why_inspection":
      content = <A02WhyInspection {...props} />;
      break;

    case "A03_what_we_inspect":
      content = <A03WhatWeInspect {...props} />;
      break;

    case "A04_how_findings_sorted":
      content = <A04HowFindingsSorted {...props} />;
      break;

    case "A05_insurance_clarity":
      content = <A05InsuranceClarity {...props} />;
      break;

    case "A06_warranty_impact":
      content = <A06WarrantyImpact {...props} />;
      break;

    case "A07_why_hustad":
      content = <A07WhyHustad {...props} />;
      break;

    case "A08_what_you_receive":
      content = <A08WhatYouReceive {...props} />;
      break;

    case "A09_buyer_priorities":
      content = <A09BuyerPriorities {...props} />;
      break;

    case "A11_innovation":
      content = <A11Innovation {...props} />;
      break;

    case "A10_inspection_hold":
      content = (
        <A10InspectionHold
          session={session}
          onRepReturn={() => {
            updateSession(navigateTo(
              { ...session, sessionStatus: "rep_review_pending" },
              "B11_rep_findings_prep"
            ));
          }}
          onBack={goBack}
        />
      );
      break;

    case "B11_rep_findings_prep":
      content = (
        <B11RepFindingsPrep
          session={session}
          onUpdate={updateSession}
          onNext={goNext}
          onBack={goBack}
        />
      );
      break;

    case "B12_findings_summary":
      content = (
        <B12FindingsSummary
          {...props}
          onRepJump={repJumpTo}
        />
      );
      break;

    case "B13_recommended_path":
      content = <B13RecommendedPath {...props} />;
      break;

    case "B14_path_decision":
      content = <B14PathDecision {...props} />;
      break;

    case "B15_urgent_protection":
      content = <B15UrgentProtection {...props} />;
      break;

    case "B16_system_options":
      content = <B16SystemOptions {...props} />;
      break;

    case "B17_agreement_summary": {
      const isCarrierReview =
        session.findings.outcomeType === "claim_review_candidate" ||
        session.findings.outcomeType === "full_restoration_candidate";
      content = isCarrierReview
        ? <B15CarrierReviewAgreement {...props} />
        : <B17AgreementSummary {...props} />;
      break;
    }

    case "B18_signature_deferral":
      content = <B18SignatureDeferral {...props} />;
      break;

    case "B19_next_steps":
      content = (
        <B19NextSteps
          session={session}
          onUpdate={updateSession}
          onNext={goNext}
          onBack={goBack}
          onFinish={resetSession}
        />
      );
      break;

    default:
      content = (
        <div className="screen-container items-center justify-center">
          <p className="font-mono text-hustad-navy/40">Unknown screen</p>
          <button className="btn-primary mt-4" onClick={resetSession}>
            Reset Session
          </button>
        </div>
      );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence mode="sync" initial={false} custom={directionRef.current}>
        <motion.div
          key={session.currentScreen}
          custom={directionRef.current}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
