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

  const mainMeters = withConsumption.filter((a) => a.submeterOf === null);
  const subMeters = withConsumption.filter((a) => a.submeterOf !== null);

  // Build map: parentMeterId → sub-meter entries
  const subMetersByParent = new Map<number, typeof withConsumption>();
  for (const sub of subMeters) {
    const list = subMetersByParent.get(sub.submeterOf!) ?? [];
    list.push(sub);
    subMetersByParent.set(sub.submeterOf!, list);
  }

  // Total metered consumption = sum of main meters consumptions only
  // (sub-meters are already included in the parent's reading)
  const totalMeteredConsumption = mainMeters.reduce(
    (sum, r) => sum + r.consumption,
    0,
  );

  const volumeDifference = bill.totalVolume - totalMeteredConsumption;
  const totalCost = bill.waterCost + bill.sewageCost + bill.rainWaterCost;

  const rainWaterApartments = withConsumption.filter((c) => c.rainWater);
  // Fallback to all apartments for rain water distribution if there are non set in settings
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

  for (const mainMeter of mainMeters) {
    const proportion =
      totalMeteredConsumption > 0
        ? mainMeter.consumption / totalMeteredConsumption
        : 1 / mainMeters.length;

    const meterWaterTotal = round2(bill.waterCost * proportion);
    const meterSewageTotal = round2(bill.sewageCost * proportion);

    const subMeters = subMetersByParent.get(mainMeter.meterId) ?? [];
    const subMeterConsumption = subMeters.reduce(
      (s, c) => s + c.consumption,
      0,
    );
    const parentNetConsumption = Math.max(
      0,
      mainMeter.consumption - subMeterConsumption,
    );

    // Split the main meter share between parent and sub-meters
    for (const subMeter of subMeters) {
      const subMeterProportion =
        mainMeter.consumption > 0
          ? subMeter.consumption / mainMeter.consumption
          : 0;

      const subMeterWaterCost = round2(meterWaterTotal * subMeterProportion);
      const subMeterSewageCost = round2(meterSewageTotal * subMeterProportion);
      const subMeterRainCost = rainWaterRecipientIds.has(subMeter.meterId)
        ? round2(rainWaterPerApartment)
        : 0;

      charges.push({
        meterId: subMeter.meterId,
        name: subMeter.name,
        consumption: subMeter.consumption,
        waterAmount: subMeterWaterCost,
        sewageAmount: subMeterSewageCost,
        rainWaterAmount: subMeterRainCost,
        totalAmount: round2(
          subMeterWaterCost + subMeterSewageCost + subMeterRainCost,
        ),
      });
    }

    const parentProportion =
      mainMeter.consumption > 0
        ? parentNetConsumption / mainMeter.consumption
        : 1;

    const parentWater = round2(meterWaterTotal * parentProportion);
    const parentSewage = round2(meterSewageTotal * parentProportion);
    const parentRain = rainWaterRecipientIds.has(mainMeter.meterId)
      ? round2(rainWaterPerApartment)
      : 0;

    charges.push({
      meterId: mainMeter.meterId,
      name: mainMeter.name,
      consumption: parentNetConsumption,
      waterAmount: parentWater,
      sewageAmount: parentSewage,
      rainWaterAmount: parentRain,
      totalAmount: round2(parentWater + parentSewage + parentRain),
    });
  }

  // Adjust rounding errors so the sum of charges matches the bill total exactly.
  const chargesTotal = charges.reduce((sum, c) => sum + c.totalAmount, 0);
  const roundingError = round2(totalCost - chargesTotal);

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
