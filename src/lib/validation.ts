import { z } from "zod";

export const registerSchema = z.object({
  // Org/admin onboarding (B2B company or B2C individual).
  organizationName: z.string().min(2).max(120),
  organizationType: z.enum(["COMPANY", "INDIVIDUAL"]).default("COMPANY"),
  industry: z.string().max(120).optional(),
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().max(40).optional(),
  password: z.string().min(10).max(200),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
  // Optional org slug to disambiguate users who belong to multiple orgs.
  organizationSlug: z.string().optional(),
});

export const createEventSchema = z.object({
  name: z.string().min(2).max(160),
  type: z.enum(["WEDDING", "CORPORATE", "GALA", "CONFERENCE", "SOCIAL", "OTHER"]).default("OTHER"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  expectedGuests: z.number().int().positive().max(1_000_000).optional(),
  budget: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("USD"),
  location: z.string().max(200).optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z
    .enum(["DRAFT", "PLANNING", "CONFIRMED", "IN_PROGRESS", "CLOSED", "ARCHIVED"])
    .optional(),
  currentStep: z
    .enum(["VENUE", "FINANCIALS", "FLOOR_PLANS", "WORKSPACE", "RSVPS", "TABLE_PLANNING", "ITINERARY", "CLOSURE"])
    .optional(),
  venueId: z.string().nullable().optional(),
  wizardState: z.record(z.unknown()).optional(),
});

export const createVenueSchema = z.object({
  name: z.string().min(2).max(160),
  location: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  capacity: z.number().int().positive().optional(),
  basePrice: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("USD"),
  amenities: z.array(z.string().max(60)).max(50).default([]),
  description: z.string().max(2000).optional(),
});

export const suggestVenueSchema = z.object({
  budget: z.number().nonnegative().optional(),
  guestCount: z.number().int().positive().optional(),
  city: z.string().max(120).optional(),
  eventType: z.string().max(40).optional(),
  durationHours: z.number().positive().optional(),
  customPrompt: z.string().max(1000).optional(),
});

export const predictCostSchema = z.object({
  eventId: z.string(),
  eventType: z.string().max(40),
  budget: z.number().positive(),
  guestCount: z.number().int().positive().optional(),
  currency: z.string().length(3).default("USD"),
});

export const classifyRsvpSchema = z.object({
  guestId: z.string(),
  replyText: z.string().min(1).max(5000),
});

export const optimizeSeatingSchema = z.object({
  eventId: z.string(),
});

export const createTaskSchema = z.object({
  eventId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(1).max(3).default(2),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().optional(),
});

export const importGuestsSchema = z.object({
  eventId: z.string(),
  // Parsed CSV rows.
  guests: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(40).optional(),
        groupTag: z.string().max(80).optional(),
        seatRank: z.number().int().optional(),
      }),
    )
    .max(10_000),
});
