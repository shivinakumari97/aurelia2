import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptField } from "../src/lib/crypto/field-encryption";
import { SYSTEM_ROLES } from "../src/lib/auth/rbac";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Aurelia demo data…");

  // Clean prior demo org (idempotent re-seed).
  const existing = await prisma.organization.findUnique({ where: { slug: "acme-events" } });
  if (existing) {
    await prisma.organization.delete({ where: { id: existing.id } });
  }

  const org = await prisma.organization.create({
    data: {
      name: "Acme Events",
      slug: "acme-events",
      type: "COMPANY",
      industry: "Corporate & Weddings",
      tier: "PROFESSIONAL",
      aiCreditsLimit: 5000,
    },
  });

  const roles = await Promise.all(
    Object.entries(SYSTEM_ROLES).map(([name, def]) =>
      prisma.role.create({
        data: {
          organizationId: org.id,
          name,
          description: def.description,
          isSystem: true,
          permissions: def.permissions as object,
        },
      }),
    ),
  );
  const adminRole = roles.find((r) => r.name === "Event Manager")!;
  const opsRole = roles.find((r) => r.name === "Operations")!;

  const passwordHash = await bcrypt.hash("Password123", 12);

  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "admin@acme.events",
      name: "Avery Stone",
      phoneEnc: encryptField("+1 555 010 2000"),
      passwordHash,
      roleId: adminRole.id,
      isOrgAdmin: true,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "ops@acme.events",
      name: "Riley Chen",
      passwordHash,
      roleId: opsRole.id,
      isOrgAdmin: false,
    },
  });

  await prisma.venue.createMany({
    data: [
      { organizationId: org.id, name: "The Grand Ballroom", city: "San Francisco", capacity: 300, basePrice: 42000, amenities: ["Catering kitchen", "AV", "Parking", "Outdoor terrace"], description: "Elegant downtown ballroom with skyline views." },
      { organizationId: org.id, name: "Bayview Loft", city: "San Francisco", capacity: 150, basePrice: 24000, amenities: ["AV", "Bar", "Bridal suite"], description: "Industrial-chic waterfront loft." },
      { organizationId: org.id, name: "Vineyard Estate", city: "Napa", capacity: 220, basePrice: 56000, amenities: ["Outdoor", "Catering kitchen", "Parking", "On-site lodging", "Vineyard views"], description: "Romantic vineyard estate for destination events." },
    ],
  });

  await prisma.vendor.createMany({
    data: [
      { organizationId: org.id, name: "Saffron Catering", type: "CATERING", typicalPrice: 38000, rating: 4.7, contactEnc: encryptField("hello@saffron.co"), description: "Full-service catering, strong on dietary accommodations." },
      { organizationId: org.id, name: "Lumen Photography", type: "PHOTOGRAPHY", typicalPrice: 8500, rating: 4.9, description: "Editorial event photography." },
      { organizationId: org.id, name: "Apex AV", type: "AV", typicalPrice: 15000, rating: 4.5, description: "Stage, sound, and lighting production." },
    ],
  });

  const venue = await prisma.venue.findFirst({ where: { organizationId: org.id, name: "The Grand Ballroom" } });
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      name: "Acme Annual Gala 2026",
      type: "GALA",
      status: "PLANNING",
      currentStep: "FINANCIALS",
      expectedGuests: 180,
      budget: 150000,
      currency: "USD",
      location: "San Francisco, CA",
      venueId: venue?.id ?? null,
      startDate: new Date("2026-10-17T18:00:00Z"),
      endDate: new Date("2026-10-17T23:00:00Z"),
    },
  });

  // A few guests (PII encrypted).
  await prisma.guest.createMany({
    data: [
      { organizationId: org.id, eventId: event.id, name: "Dana Wright", emailEnc: encryptField("dana@x.com"), rsvpStatus: "YES", dietaryEnc: encryptField("vegetarian"), groupTag: "leadership", seatRank: 1, plusOnes: 1 },
      { organizationId: org.id, eventId: event.id, name: "Sam Park", emailEnc: encryptField("sam@x.com"), rsvpStatus: "YES", groupTag: "engineering", seatRank: 3 },
      { organizationId: org.id, eventId: event.id, name: "Jordan Lee", emailEnc: encryptField("jordan@x.com"), rsvpStatus: "MAYBE", groupTag: "engineering", seatRank: 3 },
      { organizationId: org.id, eventId: event.id, name: "Casey Kim", emailEnc: encryptField("casey@x.com"), rsvpStatus: "PENDING", groupTag: "partners" },
    ],
  });

  console.log("Seed complete.");
  console.log("  Org:    Acme Events (slug: acme-events)");
  console.log("  Admin:  admin@acme.events / Password123");
  console.log("  Assoc:  ops@acme.events / Password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
