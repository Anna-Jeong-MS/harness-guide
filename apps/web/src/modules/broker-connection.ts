import type { Holding } from "../domain/portfolio";

export type BrokerConnection = {
  importHoldings(): Promise<Holding[]>;
};

export function createReadOnlyBrokerConnection(config: {
  fetchHoldings: () => Promise<Holding[]>;
}): BrokerConnection {
  return {
    async importHoldings() {
      return config.fetchHoldings();
    },
  };
}
