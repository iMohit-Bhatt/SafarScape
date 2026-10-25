import { describe, it, expect } from "vitest";
import { normalisePhone } from "@/lib/phone";
import { whatsappLink, fillTemplate } from "@/lib/whatsapp";
import { formatINR, formatDateRange, durationLabel, slugify } from "@/lib/format";

describe("normalisePhone", () => {
  it.each([
    ["98110 45672", "+919811045672"],
    ["098110-45672", "+919811045672"],
    ["+91 98110 45672", "+919811045672"],
    ["919811045672", "+919811045672"],
    ["0091 9811045672", "+919811045672"],
  ])("normalises Indian mobile %s", (input, out) => {
    expect(normalisePhone(input)).toBe(out);
  });

  it("keeps international numbers with a country code", () => {
    expect(normalisePhone("+44 7700 900123")).toBe("+447700900123");
    expect(normalisePhone("7700 900123", "+44")).toBe("+447700900123");
  });

  it.each(["12345", "5811045672", "+91 12345 67890", "", "abc"])("rejects %s", (bad) => {
    expect(normalisePhone(bad)).toBeNull();
  });
});

describe("whatsapp links", () => {
  it("URL-encodes the prefilled message", () => {
    const link = whatsappLink("+91 98110 45672", "Hi Safarscape, I'm interested in Gulmarg & Dal Lake?");
    expect(link).toBe(
      "https://wa.me/919811045672?text=Hi%20Safarscape%2C%20I'm%20interested%20in%20Gulmarg%20%26%20Dal%20Lake%3F",
    );
  });
  it("returns null without a configured number", () => {
    expect(whatsappLink("", "hello")).toBeNull();
    expect(whatsappLink(undefined, "hello")).toBeNull();
  });
  it("fills templates and drops unknown tokens", () => {
    expect(fillTemplate("Hi {{ name }}, about {{package_name}} {{missing}}", { name: "Ananya", package_name: "Kashmir" })).toBe(
      "Hi Ananya, about Kashmir",
    );
  });
});

describe("formatting", () => {
  it("formats rupees Indian-style", () => {
    expect(formatINR(32999)).toBe("₹32,999");
    expect(formatINR(150000)).toBe("₹1,50,000");
  });
  it("formats departures", () => {
    expect(formatDateRange("2027-01-14", "2027-01-19")).toBe("14 – 19 Jan 2027");
    expect(formatDateRange("2027-01-30", "2027-02-04")).toBe("30 Jan – 4 Feb 2027");
    expect(durationLabel(5)).toBe("5N/6D");
  });
  it("slugifies", () => {
    expect(slugify("Kashmir: Gulmarg & Dal Lake!")).toBe("kashmir-gulmarg-dal-lake");
  });
});
