export const INQ_STATUS = ["new", "costing", "quoted", "won", "lost"];
export const STYLE_STATUS = ["development", "costing", "sampling", "approved"];
export const COSTING_STATUS = ["draft", "submitted", "approved", "rejected"];

export type CostInputs = {
  fabric_cost: number; trims_cost: number; cm_cost: number; washing_cost: number; other_cost: number;
  commercial_pct: number; profit_pct: number;
};

/** FOB per piece — must match the database's generated fob_price column. */
export function calcFob(c: CostInputs) {
  const base = c.fabric_cost + c.trims_cost + c.cm_cost + c.washing_cost + c.other_cost;
  return Math.round(base * (1 + c.commercial_pct / 100) * (1 + c.profit_pct / 100) * 1000) / 1000;
}
