import { z } from "zod";

// Validates the rep's company creation request form.
// type and customerType are intentionally absent — the backend hardcodes them.
export const ResidentialRequestSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  salesStatus: z.enum(["Lead", "Sold", "Candidate", "Client"]),
  timezone: z.string().min(1, "Timezone is required"),
  streetAddress: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  manager: z.string().regex(/^\d+$/, "Manager ID must be numeric").optional().or(z.literal("")),
  homeownerEmail: z.email("Must be a valid email").optional().or(z.literal("")),
  homeownerPhone: z.string().optional(),
});

export type ResidentialRequestInput = z.infer<typeof ResidentialRequestSchema>;

// Validates a new inspection ticket request against an EXISTING CenterPoint
// company — no company fields here since the company already exists.
export const ExistingCompanyTicketSchema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  timezone: z.string().min(1, "Timezone is required"),
  streetAddress: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  manager: z.string().regex(/^\d+$/, "Manager ID must be numeric").optional().or(z.literal("")),
  homeownerEmail: z.email("Must be a valid email").optional().or(z.literal("")),
  homeownerPhone: z.string().optional(),
});

export type ExistingCompanyTicketInput = z.infer<typeof ExistingCompanyTicketSchema>;
