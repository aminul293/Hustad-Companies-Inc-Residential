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
    title: "General Exterior",
    items: [
      {
        id: "front_elevation",
        section: "General Exterior",
        label: "Front elevation",
        description: "Overall front condition, access, siding, gutters, windows, garage, and visible collateral damage.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "left_elevation",
        section: "General Exterior",
        label: "Left elevation",
        description: "Overall left side condition, roof edge visibility, siding, downspouts, AC units, fences, and access.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "rear_elevation",
        section: "General Exterior",
        label: "Rear elevation",
        description: "Overall rear condition, decks, patios, landscaping, slope access, gutters, and windows.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "right_elevation",
        section: "General Exterior",
        label: "Right elevation",
        description: "Overall right side condition, roof edge visibility, siding, downspouts, AC units, fences, and access.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "exterior_collateral_damage",
        section: "General Exterior",
        label: "Exterior collateral damage",
        description: "Document non-roof storm indicators and related property damage visible from the exterior.",
        requiredCount: 0,
        allowMultiple: true,
      },
      {
        id: "access_site_constraints",
        section: "General Exterior",
        label: "Access or site constraints",
        description: "Document any access issues, steep slopes, or site conditions that may affect inspection or production.",
        requiredCount: 0,
        allowMultiple: true,
      },
    ],
  },
  {
    title: "General Roof",
    items: [
      {
        id: "roof_general",
        section: "General Roof",
        label: "Roof general",
        description: "Show roof planes, elevations, slope, layout, valleys, overall condition, and areas that may affect production.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "roof_assembly",
        section: "General Roof",
        label: "Roof assembly",
        description: "Show layers, decking condition where visible, underlayment, and whether ice and water shield is present.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "roof_to_wall_detail",
        section: "General Roof",
        label: "Roof-to-wall detail",
        description: "Show flashing, step flashing, counterflashing, wall intersections, siding tie-ins, and any prior repair work.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "pipe_flashings",
        section: "General Roof",
        label: "Pipe flashings",
        description: "Add quantity for each unique pipe flashing type. Note damaged or replacement recommended.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "roof_vents",
        section: "General Roof",
        label: "Roof vents",
        description: "Add quantity for each unique vent type. Note damaged or replacement recommended.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "ridge_cap",
        section: "General Roof",
        label: "Ridge cap",
        description: "Document ridge cap condition. Check whether ridge vent is present.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "chimney_skylight_details",
        section: "General Roof",
        label: "Chimney or skylight details",
        description: "Chimney flashing and chimney condition. Skylights including quantity, if present on this roof.",
        requiredCount: 0,
        allowMultiple: true,
      },
    ],
  },
  {
    title: "Hail and Wind",
    items: [
      {
        id: "test_squares",
        section: "Hail and Wind",
        label: "10 ft × 10 ft test squares",
        description: "Capture test square location, roof plane, and number of hail hits observed. Two largest planes.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "hail_hits_closeup",
        section: "Hail and Wind",
        label: "Hail hits close up",
        description: "Minimum of 4 close-up photos showing bruise, fracture, granule loss, mat break, or unknown impact type.",
        requiredCount: 4,
        allowMultiple: true,
      },
      {
        id: "hail_hits_hip_ridge",
        section: "Hail and Wind",
        label: "Hail hits to hip and ridge",
        description: "Show impacts on hip shingles, ridge cap, or ridge areas.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "soft_metal_damage",
        section: "Hail and Wind",
        label: "Soft metal damage",
        description: "Document dents to vents, flashing, gutters, downspouts, AC fins, or other soft metal items.",
        requiredCount: 1,
        allowMultiple: true,
      },
      {
        id: "damaged_siding_paint",
        section: "Hail and Wind",
        label: "Damaged siding or paint",
        description: "Close-up photos by elevation. Note material type and affected area.",
        requiredCount: 0,
        allowMultiple: true,
      },
      {
        id: "damaged_gutters_downspouts",
        section: "Hail and Wind",
        label: "Damaged gutters and downspouts",
        description: "Show denting, displacement, tearing, loose connections, or functional damage.",
        requiredCount: 0,
        allowMultiple: true,
      },
      {
        id: "broken_glass_window_casing",
        section: "Hail and Wind",
        label: "Broken glass or window casing damage",
        description: "Add quantity and elevation. Include screens, wraps, casing, and glass damage if present.",
        requiredCount: 0,
        allowMultiple: true,
      },
      {
        id: "collateral_damage",
        section: "Hail and Wind",
        label: "Collateral damage",
        description: "Document non-roof storm indicators and related property damage.",
        requiredCount: 0,
        allowMultiple: true,
      },
      {
        id: "non_roof_storm_damage",
        section: "Hail and Wind",
        label: "Non-roof storm damage",
        description: "AC units, fences, decks, garage doors, light fixtures, exterior trim, and personal property.",
        requiredCount: 0,
        allowMultiple: true,
      },
    ],
  },
  {
    title: "Urgent Repairs",
    items: [
      {
        id: "urgent_repair_1",
        section: "Urgent Repairs",
        label: "Urgent repair photo 1",
        description: "Active leak, temporary repair needed, or safety concern. Note location and recommended immediate action.",
        requiredCount: 0,
        allowMultiple: false,
      },
      {
        id: "urgent_repair_2",
        section: "Urgent Repairs",
        label: "Urgent repair photo 2",
        description: "Active leak, temporary repair needed, or safety concern. Note location and recommended immediate action.",
        requiredCount: 0,
        allowMultiple: false,
      },
      {
        id: "urgent_repair_3",
        section: "Urgent Repairs",
        label: "Urgent repair photo 3",
        description: "Active leak, temporary repair needed, or safety concern. Note location and recommended immediate action.",
        requiredCount: 0,
        allowMultiple: false,
      },
      {
        id: "urgent_repair_4",
        section: "Urgent Repairs",
        label: "Urgent repair photo 4",
        description: "Active leak, temporary repair needed, or safety concern. Note location and recommended immediate action.",
        requiredCount: 0,
        allowMultiple: false,
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
