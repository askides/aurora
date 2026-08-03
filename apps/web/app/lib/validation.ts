import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const setupSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const accountSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  email: z.email("Enter a valid email address"),
  // Blank means "leave the current password alone".
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
});

export const websiteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().min(1, "URL is required"),
  is_public: z.boolean(),
});

export const collectSchema = z.object({
  type: z.string().optional(),
  element: z.string().min(1),
  wid: z.string().min(1),
  language: z.string().optional(),
  referrer: z.string().optional(),

  uid: z.string().optional(),
  lastPageViewID: z.string().nullish(),
  isNewVisitor: z.boolean().optional(),
  isNewSession: z.boolean().optional(),
  lastVisitAt: z.number().optional(),
  expires: z.number().optional(),
});

export const durationSchema = z.object({
  wid: z.string().min(1),
  duration: z.number(),
});

export const metricsFiltersSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
});

export const timeseriesFiltersSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  unit: z.enum(["hour", "day", "month", "year"]),
  tz: z.string().min(1).default("UTC"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SetupInput = z.infer<typeof setupSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type WebsiteInput = z.infer<typeof websiteSchema>;
