export interface WarrantyTier {
  id: string;
  label: string;
  description: string;
}

export interface ManufacturerConfig {
  id: string;
  label: string;
  warranties: string[];
}

export const PRODUCT_CONFIG: Record<string, ManufacturerConfig> = {
  GAF: {
    id: "GAF",
    label: "GAF",
    warranties: ["System Plus", "Silver Pledge", "Golden Pledge"],
  },
  OwensCorning: {
    id: "OwensCorning",
    label: "Owens Corning",
    warranties: ["System Protection", "Preferred Protection", "Platinum Protection"],
  },
  CertainTeed: {
    id: "CertainTeed",
    label: "CertainTeed",
    warranties: ["Standard", "SureStart", "5-Star"],
  },
};

export const IMPACT_DISCLAIMER = "Laboratory rated protection. Eligibility confirmed in final proposal.";
