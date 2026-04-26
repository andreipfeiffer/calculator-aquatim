export interface MeterInput {
  meterId: number;
  name: string;
  rainWater: boolean;
  submeterOf: number | null;
  currentReading: number;
  previousReading: number;
}

export interface BillInput {
  waterCost: number;
  totalVolume: number;
  sewageCost: number;
  rainWaterCost: number;
}

export interface MeterCharge {
  meterId: number;
  name: string;
  consumption: number;
  waterAmount: number;
  sewageAmount: number;
  rainWaterAmount: number;
  totalAmount: number;
}

export interface CalculationResult {
  charges: MeterCharge[];
  totalMeteredConsumption: number;
  volumeDifference: number;
  waterCost: number;
}

/**
 * Calculates each apartment's share of the water bill.
 *
 * - Only root meters (submeterOf === null) participate in proportional distribution.
 * - A root meter's consumption includes its sub-meters' consumption.
 * - After the root gets its share, it's split between parent and sub-meter(s)
 *   proportionally by their individual consumption.
 * - water cost → proportional by consumption
 * - sewage cost → proportional by consumption
 * - rain water cost → equal split among apartments flagged for rain water
 */
export function calculate(
  bill: BillInput,
  meters: MeterInput[],
): CalculationResult {
  const withConsumption = meters.map((m) => ({
    ...m,
    consumption: Math.max(0, m.currentReading - m.previousReading),
  }));

  const roots = withConsumption.filter((a) => a.submeterOf === null);
  const subs = withConsumption.filter((a) => a.submeterOf !== null);

  // Build map: parentMeterId → sub-meter entries
  const subsByParent = new Map<number, typeof withConsumption>();
  for (const sub of subs) {
    const list = subsByParent.get(sub.submeterOf!) ?? [];
    list.push(sub);
    subsByParent.set(sub.submeterOf!, list);
  }

  // Total metered consumption = sum of root meter consumptions only
  // (sub-meters are already included in the parent's reading)
  const totalMeteredConsumption = roots.reduce(
    (sum, r) => sum + r.consumption,
    0,
  );

  const volumeDifference = bill.totalVolume - totalMeteredConsumption;
  const totalAmount = bill.waterCost + bill.sewageCost + bill.rainWaterCost;

  const rainWaterApartments = withConsumption.filter((c) => c.rainWater);
  const rainWaterRecipients =
    rainWaterApartments.length > 0 ? rainWaterApartments : withConsumption;
  const rainWaterRecipientIds = new Set(
    rainWaterRecipients.map((m) => m.meterId),
  );
  const rainWaterPerApartment =
    rainWaterRecipients.length > 0
      ? bill.rainWaterCost / rainWaterRecipients.length
      : 0;

  const charges: MeterCharge[] = [];

  for (const root of roots) {
    const proportion =
      totalMeteredConsumption > 0
        ? root.consumption / totalMeteredConsumption
        : 1 / roots.length;

    const rootWaterTotal = round2(bill.waterCost * proportion);
    const rootSewageTotal = round2(bill.sewageCost * proportion);

    const children = subsByParent.get(root.meterId) ?? [];
    const childConsumption = children.reduce((s, c) => s + c.consumption, 0);
    const parentNetConsumption = Math.max(
      0,
      root.consumption - childConsumption,
    );

    // Split the root's share between parent and sub-meters
    for (const child of children) {
      const childProportion =
        root.consumption > 0 ? child.consumption / root.consumption : 0;

      const childWater = round2(rootWaterTotal * childProportion);
      const childSewage = round2(rootSewageTotal * childProportion);
      const childRain = rainWaterRecipientIds.has(child.meterId)
        ? round2(rainWaterPerApartment)
        : 0;

      charges.push({
        meterId: child.meterId,
        name: child.name,
        consumption: child.consumption,
        waterAmount: childWater,
        sewageAmount: childSewage,
        rainWaterAmount: childRain,
        totalAmount: round2(childWater + childSewage + childRain),
      });
    }

    const parentProportion =
      root.consumption > 0 ? parentNetConsumption / root.consumption : 1;

    const parentWater = round2(rootWaterTotal * parentProportion);
    const parentSewage = round2(rootSewageTotal * parentProportion);
    const parentRain = rainWaterRecipientIds.has(root.meterId)
      ? round2(rainWaterPerApartment)
      : 0;

    charges.push({
      meterId: root.meterId,
      name: root.name,
      consumption: parentNetConsumption,
      waterAmount: parentWater,
      sewageAmount: parentSewage,
      rainWaterAmount: parentRain,
      totalAmount: round2(parentWater + parentSewage + parentRain),
    });
  }

  // Adjust rounding errors so the sum of charges matches the bill total exactly.
  const chargesTotal = charges.reduce((sum, c) => sum + c.totalAmount, 0);
  const roundingError = round2(totalAmount - chargesTotal);

  if (roundingError !== 0 && charges.length > 0) {
    const largest = charges.reduce((max, c) =>
      c.consumption > max.consumption ? c : max,
    );
    largest.waterAmount = round2(largest.waterAmount + roundingError);
    largest.totalAmount = round2(largest.totalAmount + roundingError);
  }

  return {
    charges,
    totalMeteredConsumption,
    volumeDifference,
    waterCost: bill.waterCost,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
