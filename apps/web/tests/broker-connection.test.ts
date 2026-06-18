import { describe, expect, it } from "vitest";
import { createReadOnlyBrokerConnection } from "../src/modules/broker-connection";

describe("BrokerConnection", () => {
  it("imports holdings without exposing order operations", async () => {
    const connection = createReadOnlyBrokerConnection({
      fetchHoldings: async () => [
        {
          instrumentId: "KR:XKRX:005930",
          quantity: 10,
          averageEntryPrice: 70000,
          marketValue: 720000,
        },
      ],
    });

    const holdings = await connection.importHoldings();

    expect(holdings).toHaveLength(1);
    expect("placeOrder" in connection).toBe(false);
    expect("cancelOrder" in connection).toBe(false);
  });
});
