import { NextResponse } from "next/server";
import { parseInstrumentId, type InstrumentId } from "../../../../src/domain/market";
import type { Holding } from "../../../../src/domain/portfolio";
import { createReadOnlyBrokerConnection } from "../../../../src/modules/broker-connection";

export async function POST(request: Request) {
  const body = await readJson(request);
  const holdings = body ? parseHoldings(body) : null;

  if (!holdings) {
    return NextResponse.json({ error: "Malformed broker import body" }, { status: 400 });
  }

  const connection = createReadOnlyBrokerConnection({
    async fetchHoldings() {
      return holdings;
    },
  });

  const importedHoldings = await connection.importHoldings();

  return NextResponse.json({
    holdings: importedHoldings,
    capabilities: {
      readOnly: true,
      orderExecution: false,
    },
  });
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseHoldings(body: unknown): Holding[] | null {
  if (!isRecord(body) || !Array.isArray(body.holdings)) {
    return null;
  }

  const holdings: Holding[] = [];
  for (const holding of body.holdings) {
    const parsedHolding = parseHolding(holding);
    if (!parsedHolding) {
      return null;
    }
    holdings.push(parsedHolding);
  }
  return holdings;
}

function parseHolding(holding: unknown): Holding | null {
  if (
    !isRecord(holding) ||
    typeof holding.instrumentId !== "string" ||
    !isFiniteNumber(holding.quantity) ||
    !isFiniteNumber(holding.averageEntryPrice) ||
    !isFiniteNumber(holding.marketValue)
  ) {
    return null;
  }

  try {
    parseInstrumentId(holding.instrumentId as InstrumentId);
  } catch {
    return null;
  }

  return {
    instrumentId: holding.instrumentId as InstrumentId,
    quantity: holding.quantity,
    averageEntryPrice: holding.averageEntryPrice,
    marketValue: holding.marketValue,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
