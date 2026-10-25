import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { seededDb } from "../helpers/db";
import { users, packages } from "@/db/schema";
import { publishedPackages, filterPackages, parseFilters, packageBySlug, applyOffer } from "@/lib/catalogue";
import { savePackage, setPackageStatus, publishProblems, ValidationError, duplicatePackage, saveDeparture } from "@/lib/admin-catalogue";

const manager = async () => {
  const db = await seededDb();
  return (await db.select().from(users).where(eq(users.email, "priya@safarscape.test")))[0];
};

describe("public catalogue", () => {
  it("lists only published packages and applies the early-bird offer", async () => {
    const db = await seededDb();
    const all = await publishedPackages(db);
    expect(all.every((p) => p.status === "published")).toBe(true);
    expect(all.find((p) => p.slug === "kashmir-autumn-chinar-5n")).toBeUndefined();
    const kashmir = all.find((p) => p.slug === "kashmir-5n6d")!;
    // Offer validity is date-bound; assert the maths rather than today's date.
    const { finalPrice } = applyOffer(kashmir, [
      { id: 1, name: "x", badge: "x", discountType: "flat", amount: 4000, packageIds: [kashmir.id], terms: "", validFrom: "2000-01-01", validTo: "2999-01-01", active: true, createdAt: new Date() } as never,
    ]);
    expect(finalPrice).toBe(28999);
  });

  it("filters by type, destination, price, duration and month; sorts and paginates", async () => {
    const db = await seededDb();
    const all = await publishedPackages(db);
    const honeymoon = filterPackages(all, parseFilters({ type: "honeymoon" }));
    expect(honeymoon.items.every((p) => p.tripType === "honeymoon")).toBe(true);
    const kerala = filterPackages(all, parseFilters({ dest: "kerala" }));
    expect(kerala.total).toBe(2);
    const mid = filterPackages(all, parseFilters({ dur: "mid", max: "30000" }));
    expect(mid.items.every((p) => p.nights >= 5 && p.nights <= 7 && p.finalPrice <= 30000)).toBe(true);
    const jan = filterPackages(all, parseFilters({ month: ["1"] }));
    expect(jan.items.every((p) => p.travelMonths.includes(1))).toBe(true);
    const cheap = filterPackages(all, parseFilters({ sort: "price-asc" }));
    const prices = cheap.items.map((p) => p.finalPrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    const p2 = filterPackages(all, parseFilters({ page: "2" }));
    expect(p2.page).toBe(2);
    expect(p2.items.length).toBe(all.length - 9);
    const search = filterPackages(all, parseFilters({ q: "houseboat kumarakom" }));
    expect(search.items.map((p) => p.slug)).toEqual(["kerala-kumarakom-honeymoon-6n"]);
    expect(filterPackages(all, parseFilters({ q: "antarctica" })).total).toBe(0);
  });
});

describe("package publishing", () => {
  it("blocks publishing an incomplete package and explains why", async () => {
    const db = await seededDb();
    const m = await manager();
    const [draft] = await db.select().from(packages).where(eq(packages.slug, "kashmir-autumn-chinar-5n"));
    expect(publishProblems(draft)).toEqual(expect.arrayContaining(["List what's included."]));
    await expect(setPackageStatus(db, m, draft.id, "published")).rejects.toBeInstanceOf(ValidationError);
  });

  it("creates, completes, publishes and unpublishes a package", async () => {
    const db = await seededDb();
    const m = await manager();
    const input = {
      title: "Sikkim monasteries and Gurudongmar",
      destinationId: 1,
      tripType: "adventure",
      nights: 6,
      summary: "High lakes and quiet monasteries.",
      priceFrom: 36000,
      photos: [{ color: "#C9D3D2", alt: "Gurudongmar lake" }],
      itinerary: [{ day: 1, title: "Arrive Bagdogra" }, { day: 1, title: "To Gangtok" }],
      inclusions: ["6 nights' stay"],
    };
    const created = await savePackage(db, m, null, input);
    expect(created.status).toBe("draft");
    expect(created.slug).toBe("kashmir-sikkim-monasteries-and-gurudongmar");
    expect(created.itinerary.map((d) => d.day)).toEqual([1, 2]);
    expect(await packageBySlug(db, created.slug)).toBeNull();

    const published = await setPackageStatus(db, m, created.id, "published");
    expect(published.publishedAt).not.toBeNull();
    expect((await packageBySlug(db, created.slug))?.title).toBe(input.title);

    await setPackageStatus(db, m, created.id, "unpublished");
    expect(await packageBySlug(db, created.slug)).toBeNull();

    // Saving a duplicate title gets a unique slug.
    const copy = await duplicatePackage(db, m, created.id);
    expect(copy.slug).not.toBe(created.slug);
    expect(copy.status).toBe("draft");
  });

  it("validates package and departure input", async () => {
    const db = await seededDb();
    const m = await manager();
    try {
      await savePackage(db, m, null, { title: "x", destinationId: 0, tripType: "cruise", nights: 0, priceFrom: -1 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(Object.keys((e as ValidationError).fieldErrors)).toEqual(
        expect.arrayContaining(["title", "destinationId", "tripType", "nights", "priceFrom"]),
      );
    }
    await expect(
      saveDeparture(db, m, 1, null, { startDate: "2027-03-10", endDate: "2027-03-01", price: 1000, seatsTotal: 10, seatsLeft: 12 }),
    ).rejects.toBeInstanceOf(ValidationError);
    const dep = await saveDeparture(db, m, 1, null, { startDate: "2027-03-10", endDate: "2027-03-15", price: 30000, seatsTotal: 10, seatsLeft: 0 });
    expect(dep.status).toBe("full");
  });
});
