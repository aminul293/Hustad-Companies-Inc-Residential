/**
 * Structured Photo Checklist Configuration
 * Each item represents a required or optional shot during the forensic inspection.
 */

export interface ShotListItem {
  id: string;
  section: string;
  label: string;
  description: string;
  requiredCount: number;
  allowMultiple: boolean;
}

export interface ShotListSection {
  title: string;
  items: ShotListItem[];
}

export const INSPECTION_SHOT_LIST: ShotListSection[] = [
  {
    title: "Roof Inspection Photos",
    items: [
      {
        id: "general_observations",
        section: "Roof Inspection",
        label: "General roof area observations",
        description: "Wide shots showing overall roof condition and layout.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "membrane_shingle_condition",
        section: "Roof Inspection",
        label: "Membrane/shingle/tile condition",
        description: "Close-up of the primary roof material surface.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "edge_metal_detail",
        section: "Roof Inspection",
        label: "Edge metal detail",
        description: "Gutter apron, drip edge, or coping metal condition.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "roof_assembly_core_cut",
        section: "Roof Inspection",
        label: "Roof assembly / core cut",
        description: "Photo of core cut showing substrate and layers.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "eave_edge_detail",
        section: "Roof Inspection",
        label: "IWS or felt at eave edge",
        description: "Verify ice & water shield or underlayment at the eave.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "roof_to_wall_detail",
        section: "Roof Inspection",
        label: "Roof-to-wall detail",
        description: "Counter flashing and transition details.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "headwall_flashing",
        section: "Roof Inspection",
        label: "Headwall flashing",
        description: "Condition of flashing where roof meets a vertical wall.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "roof_penetrations",
        section: "Roof Inspection",
        label: "Roof penetrations",
        description: "Pipe boots, chimney flashing, and other penetrations.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "roof_ventilation",
        section: "Roof Inspection",
        label: "Roof ventilation system",
        description: "Ridge vents, static vents, or power vents.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "non_storm_deficiencies",
        section: "Roof Inspection",
        label: "Non-storm deficiencies",
        description: "Wear and tear, improper installation, or maintenance issues.",
        requiredCount: 0,
        allowMultiple: true,
      },
    ],
  },
  {
    title: "Storm Inspection",
    items: [
      {
        id: "test_squares",
        section: "Storm Inspection",
        label: "Test squares",
        description: "Photos of marked 10x10 test squares.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "best_hail_hit_closeups",
        section: "Storm Inspection",
        label: "Best hail hit close-ups",
        description: "Clear, close-up photos of significant hail impacts.",
        requiredCount: 3,
        allowMultiple: true,
      },
      {
        id: "collateral_damage",
        section: "Storm Inspection",
        label: "Collateral damage",
        description: "Damage to non-roof items (AC units, fences, etc.).",
        requiredCount: 1,
        allowMultiple: true,
      },
    ],
  },
  {
    title: "Hail/Wind Shot List",
    items: [
      {
        id: "test_square_hits_circled",
        section: "Hail/Wind",
        label: "Test square with hits circled",
        description: "Test square showing all identified hits marked.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "hip_ridge_hits",
        section: "Hail/Wind",
        label: "Hail hits to hip/ridge cap",
        description: "Impacts specifically on the ridge or hip shingles.",
        requiredCount: 2,
        allowMultiple: true,
      },
      {
        id: "soft_metal_dents",
        section: "Hail/Wind",
        label: "Soft metal vents or skylight dents",
        description: "Dents in turtle vents, box vents, or skylight frames.",
        requiredCount: 2,
        allowMultiple: true,
      },
      {
        id: "siding_paint_damage",
        section: "Hail/Wind",
        label: "Damaged siding or paint",
        description: "Chips, cracks, or dents in siding and trim.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "gutters_downspouts_damage",
        section: "Hail/Wind",
        label: "Damaged gutters/downspouts",
        description: "Dents or detachment caused by storm.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "broken_glass_casings",
        section: "Hail/Wind",
        label: "Broken glass or window casings",
        description: "Cracked panes or damaged window frames.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "vehicle_damage",
        section: "Hail/Wind",
        label: "Vehicle damage",
        description: "Hail dents on vehicles parked at the property.",
        requiredCount: 1,
        allowMultiple: true,
      },
    ],
  },
];

export function getMissingRequiredShots(photos: any[] = []): ShotListItem[] {
  const missing: ShotListItem[] = [];
  INSPECTION_SHOT_LIST.forEach(section => {
    section.items.forEach(item => {
      const count = photos.filter(p => p.category === item.id).length;
      if (count < item.requiredCount) {
        missing.push(item);
      }
    });
  });
  return missing;
}
