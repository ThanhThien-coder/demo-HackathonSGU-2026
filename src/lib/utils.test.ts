import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("merges class names correctly", () => {
    expect(cn("px-2 py-1", "bg-white")).toBe("px-2 py-1 bg-white");
  });

  it("handles conditional classes and tailwind overrides", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });
});
