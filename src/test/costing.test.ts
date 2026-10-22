import { describe, expect, it } from "vitest";
import { calcFob } from "@/lib/rmg";
import { canApprove, canWriteMerch } from "@/lib/roles";

describe("costing", () => {
  it("FOB = base cost + commercial % then profit %", () => {
    // 1.04+0.09+0.55+0+0.06 = 1.74 → ×1.03 ×1.08 = 1.9356
    expect(calcFob({ fabric_cost: 1.04, trims_cost: 0.09, cm_cost: 0.55, washing_cost: 0, other_cost: 0.06, commercial_pct: 3, profit_pct: 8 })).toBe(1.936);
  });
  it("only owner/admin approve costings", () => {
    expect(canApprove(["merchandiser"])).toBe(false);
    expect(canApprove(["admin"])).toBe(true);
  });
  it("QC officers cannot edit merchandising records", () => {
    expect(canWriteMerch(["qc_officer"])).toBe(false);
    expect(canWriteMerch(["merchandiser"])).toBe(true);
  });
});
