import { NextResponse } from "next/server";
import { createReadOnlyBrokerConnection } from "../../../../src/modules/broker-connection";

export async function POST(request: Request) {
  const body = await request.json();
  const connection = createReadOnlyBrokerConnection({
    async fetchHoldings() {
      return body.holdings;
    },
  });

  const holdings = await connection.importHoldings();

  return NextResponse.json({
    holdings,
    capabilities: {
      readOnly: true,
      orderExecution: false,
    },
  });
}
