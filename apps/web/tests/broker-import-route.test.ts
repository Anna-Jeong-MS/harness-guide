import { describe, expect, it } from "vitest";
import { POST } from "../app/api/broker/import/route";

describe("Broker import route", () => {
  it("rejects non-canonical InstrumentId values", async () => {
    const response = await POST(
      new Request("http://localhost/api/broker/import", {
        method: "POST",
        body: JSON.stringify({
          holdings: [
            {
              instrumentId: "ZZ:BAD:XXX",
              quantity: 10,
              averageEntryPrice: 100,
              marketValue: 1_000,
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("accepts valid holdings", async () => {
    const response = await POST(
      new Request("http://localhost/api/broker/import", {
        method: "POST",
        body: JSON.stringify({
          holdings: [
            {
              instrumentId: "KR:XKRX:005930",
              quantity: 10,
              averageEntryPrice: 70_000,
              marketValue: 720_000,
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      holdings: [
        {
          instrumentId: "KR:XKRX:005930",
          quantity: 10,
          averageEntryPrice: 70_000,
          marketValue: 720_000,
        },
      ],
      capabilities: {
        readOnly: true,
        orderExecution: false,
      },
    });
  });
});
