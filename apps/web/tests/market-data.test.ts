import { describe, expect, it } from "vitest";
import { createSampleMarketDataProvider } from "../src/modules/market-data/sample-provider";
import { createKisProvider } from "../src/modules/market-data/kis-provider";
import { createPolygonProvider } from "../src/modules/market-data/polygon-provider";

describe("MarketDataProvider seam", () => {
  it("returns a confirmed sample snapshot with quality metadata", async () => {
    const provider = createSampleMarketDataProvider();

    const snapshot = await provider.fetchSnapshot({
      instruments: ["KR:XKRX:005930"],
      asOf: "2026-06-18",
      finality: "confirmed",
    });

    expect(snapshot.finality).toBe("confirmed");
    expect(snapshot.bars).toHaveLength(1);
    expect(snapshot.bars[0].instrumentId).toBe("KR:XKRX:005930");
    expect(snapshot.qualityFlags).toContain("confirmed_end_of_day_data");
  });

  it("keeps KIS provider details behind the same Interface", async () => {
    const provider = createKisProvider({
      baseUrl: "https://example.test/kis",
      appKey: "key",
      appSecret: "secret",
      fetchJson: async () => ({
        output: {
          stck_oprc: "70000",
          stck_hgpr: "73000",
          stck_lwpr: "69000",
          stck_prpr: "72000",
          acml_vol: "1000000",
        },
      }),
    });

    const snapshot = await provider.fetchSnapshot({
      instruments: ["KR:XKRX:005930"],
      asOf: "2026-06-18T10:00:00+09:00",
      finality: "provisional",
    });

    expect(snapshot.bars[0].close).toBe(72000);
    expect(snapshot.qualityFlags).toContain("delayed_intraday_data");
  });

  it("keeps Polygon provider details behind the same Interface", async () => {
    const provider = createPolygonProvider({
      baseUrl: "https://example.test/polygon",
      apiKey: "key",
      fetchJson: async () => ({
        results: [
          {
            o: 190,
            h: 195,
            l: 188,
            c: 193,
            v: 50000000,
          },
        ],
      }),
    });

    const snapshot = await provider.fetchSnapshot({
      instruments: ["US:XNAS:AAPL"],
      asOf: "2026-06-18",
      finality: "confirmed",
    });

    expect(snapshot.bars[0].close).toBe(193);
    expect(snapshot.qualityFlags).toContain("confirmed_end_of_day_data");
  });

  it("encodes KIS request parameters and keeps credentials in headers", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const provider = createKisProvider({
      baseUrl: "https://example.test/kis",
      appKey: "key",
      appSecret: "secret",
      fetchJson: async (url, init) => {
        requestedUrl = url;
        requestedInit = init;
        return {
          output: {
            stck_oprc: "100",
            stck_hgpr: "101",
            stck_lwpr: "99",
            stck_prpr: "100",
            acml_vol: "1000",
          },
        };
      },
    });

    await provider.fetchSnapshot({
      instruments: ["US:XNYS:BRK/B"],
      asOf: "2026-06-18",
      finality: "confirmed",
    });

    expect(requestedUrl).toBe(
      "https://example.test/kis/price?exchange=XNYS&symbol=BRK%2FB",
    );
    expect(requestedInit?.headers).toEqual({
      appkey: "key",
      appsecret: "secret",
    });
  });

  it("encodes Polygon path and query parameters", async () => {
    let requestedUrl = "";
    const provider = createPolygonProvider({
      baseUrl: "https://example.test/polygon",
      apiKey: "key value",
      fetchJson: async (url) => {
        requestedUrl = url;
        return {
          results: [
            {
              o: 190,
              h: 195,
              l: 188,
              c: 193,
              v: 50000000,
            },
          ],
        };
      },
    });

    await provider.fetchSnapshot({
      instruments: ["US:XNYS:BRK/B"],
      asOf: "2026-06-18",
      finality: "confirmed",
    });

    expect(requestedUrl).toBe(
      "https://example.test/polygon/v2/aggs/ticker/BRK%2FB/prev?apiKey=key+value",
    );
  });

  it("throws a provider error when Polygon omits aggregate results", async () => {
    const provider = createPolygonProvider({
      baseUrl: "https://example.test/polygon",
      apiKey: "key",
      fetchJson: async () => ({}),
    });

    await expect(
      provider.fetchSnapshot({
        instruments: ["US:XNAS:AAPL"],
        asOf: "2026-06-18",
        finality: "confirmed",
      }),
    ).rejects.toThrow("Polygon returned no aggregate for US:XNAS:AAPL");
  });

});
