import { z } from "zod";

export const ResidentialCompanySchema = z.object({
  name: z.string().min(1),
  salesStatus: z.enum(["Lead", "Sold", "Candidate", "Client"]),
  timezone: z.string().min(1),
  streetAddress: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  manager: z.string().optional(),
});

export type ResidentialCompanyInput = z.infer<typeof ResidentialCompanySchema>;
