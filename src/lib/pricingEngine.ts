import { RepFindingsData } from "@/types/session";

export interface UpgradeOption {
  id: string;
  name: string;
  premiumPerSquare: number; // cost added per square
  description: string;
  bullets: string[];
}

export const UPGRADE_OPTIONS: UpgradeOption[] = [
  {
    id: "uhdz",
    name: "GAF UHDZ Shingles",
    premiumPerSquare: 35,
    description: "Upgrade from standard GAF HDZ to Ultra HDZ.",
    bullets: [
      "Thicker, heavier shingle layer for maximum durability",
      "Patent-pending Dual Shadow Line for stunning dimensional depth",
      "Stands out from the street with dramatic curb appeal",
      "Standard 30-year warranty with enhanced algae resistance"
    ]
  },
  {
    id: "silver_pledge",
    name: "Silver Pledge Warranty",
    premiumPerSquare: 25,
    description: "Upgrade to GAF's mid-tier system warranty.",
    bullets: [
      "10-year workmanship coverage backed fully by GAF",
      "Upgraded tear-off & disposal costs covered in warranty",
      "100% transferable coverage for future resale value",
      "Requires GAF starter strips, ridge caps, and leak barriers"
    ]
  },
  {
    id: "golden_pledge",
    name: "Golden Pledge Warranty",
    premiumPerSquare: 55,
    description: "The absolute gold standard in roof protection.",
    bullets: [
      "25-year non-prorated workmanship warranty backed by GAF",
      "Requires certified GAF Master Elite installer",
      "Complete roof tear-off, disposal, and replacement covered",
      "GAF inspectors perform a 40-point forensic post-install audit"
    ]
  },
  {
    id: "premium_designer",
    name: "Premium Designer Shingles",
    premiumPerSquare: 95,
    description: "Upgrade to luxury designer shingle aesthetics.",
    bullets: [
      "Luxury architectural styles matching slate or hand-cut wood shake",
      "Camelot II, Slateline, or Woodland style options",
      "Highest wind rating available (130 MPH)",
      "Unrivaled custom color blends that make your home unique"
    ]
  }
];

export interface PricingBreakdown {
  basePrice: number;
  totalSquares: number;
  tearOffCost: number;
  laborPremium: number;
  accessoriesCost: number;
  upgrades: {
    id: string;
    name: string;
    upgradeCost: number;
    totalCost: number;
    bullets: string[];
  }[];
}

/**
 * Calculates the base estimate and upgrade tiers based on the gathered findings data.
 */
export function calculateEstimate(data: RepFindingsData): PricingBreakdown {
  const totalSF = data.totalSF || 0;
  const wasteFactor = data.wasteFactor || 12;
  const pitch = data.pitch || "6/12";
  const stories = data.stories || 1;
  const layers = data.layers || 1;

  // Accessories count
  const pipeBoots = data.pipeBootsCount || 0;
  const ridgeVentLF = data.ridgeVentLF || 0;
  const offRidgeVents = data.offRidgeVentsCount || 0;
  const powerVents = data.powerVentsCount || 0;
  const valleyMetalLF = data.valleyMetalLF || 0;

  // 1. Calculate Squares (1 square = 100 SF)
  const squaresWithWaste = (totalSF * (1 + wasteFactor / 100)) / 100;
  const roundedSquares = Math.ceil(squaresWithWaste * 100) / 100; // round to 2 decimal places

  // 2. Base pricing assumptions
  const shingleBasePricePerSquare = 380; // includes standard underlayment, starter strips, nails, labor

  // 3. Pitch Multiplier
  let pitchMultiplier = 1.0;
  const pitchValue = parseInt(pitch.split("/")[0]) || 6;
  if (pitchValue >= 9 && pitchValue <= 12) {
    pitchMultiplier = 1.15; // Steep premium
  } else if (pitchValue > 12) {
    pitchMultiplier = 1.30; // Extreme steep premium
  }

  // 4. Story Multiplier
  let storyMultiplier = 1.0;
  if (stories === 2) {
    storyMultiplier = 1.08;
  } else if (stories >= 3) {
    storyMultiplier = 1.18;
  }

  // 5. Tear-off Labor and Dump Fees (per square)
  let tearOffCostPerSquare = 50;
  if (layers === 2) {
    tearOffCostPerSquare = 85;
  } else if (layers >= 3) {
    tearOffCostPerSquare = 120;
  }
  const totalTearOffCost = roundedSquares * tearOffCostPerSquare;

  // 6. Main Roof Area (Material + Labor)
  const baseAreaCost = roundedSquares * shingleBasePricePerSquare * pitchMultiplier * storyMultiplier;
  const laborPremium = baseAreaCost - (roundedSquares * shingleBasePricePerSquare);

  // 7. Accessories pricing
  const pipeBootCost = pipeBoots * 45;
  const ridgeVentCost = ridgeVentLF * 12;
  const offRidgeVentCost = offRidgeVents * 65;
  const powerVentCost = powerVents * 220;
  const valleyMetalCost = valleyMetalLF * 10;
  const totalAccessoriesCost = pipeBootCost + ridgeVentCost + offRidgeVentCost + powerVentCost + valleyMetalCost;

  // 8. Base Estimate Total (GAF HDZ + System Plus Warranty)
  const basePrice = Math.round(baseAreaCost + totalTearOffCost + totalAccessoriesCost);

  // 9. Upgrades Calculation
  const upgrades = UPGRADE_OPTIONS.map(opt => {
    const upgradeCost = Math.round(roundedSquares * opt.premiumPerSquare);
    return {
      id: opt.id,
      name: opt.name,
      upgradeCost,
      totalCost: basePrice + upgradeCost,
      bullets: opt.bullets
    };
  });

  return {
    basePrice,
    totalSquares: roundedSquares,
    tearOffCost: Math.round(totalTearOffCost),
    laborPremium: Math.round(laborPremium),
    accessoriesCost: Math.round(totalAccessoriesCost),
    upgrades
  };
}
