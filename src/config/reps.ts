/**
 * HUSTAD RESIDENTIAL TABLET PLATFORM
 * STATUS: PRODUCTION_HARDENED
 */
export interface RepIdentity {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

/**
 * GENERIC FIELD OPERATIVES (Sanitized for Demo)
 * These act as placeholders for production identities.
 */
export const FIELD_REPS: RepIdentity[] = [
  { 
    id: "rep_alpha_01", 
    name: "Field Operative Alpha", 
    role: "Senior Field Specialist", 
    active: true 
  },
  { 
    id: "rep_beta_02", 
    name: "Field Operative Beta", 
    role: "Project Coordinator", 
    active: true 
  },
  { 
    id: "rep_gamma_03", 
    name: "Field Operative Gamma", 
    role: "Regional Operations Lead", 
    active: true 
  },
];
