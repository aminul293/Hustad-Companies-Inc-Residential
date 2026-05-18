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
});

export type ResidentialRequestInput = z.infer<typeof ResidentialRequestSchema>;
