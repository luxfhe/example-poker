import { defineChain } from "viem";

export const luxfheFrontier = defineChain({
  id: 42069,
  name: "LuxFHE Frontier",
  network: "luxfheFrontier",
  nativeCurrency: { name: "tFHE", symbol: "tFHE", decimals: 18 },
  rpcUrls: {
    public: {
      http: ["https://api.testnet.luxfhe.zone:7747"],
    },
    default: {
      http: ["https://api.testnet.luxfhe.zone:7747"],
    },
  },
  blockExplorers: {
    default: { name: "LuxFHE Explorer", url: "https://explorer.testnet.luxfhe.zone" },
  },
});

export const luxfheLocal = defineChain({
  id: 412346,
  name: "LuxFHE Local",
  network: "luxfheLocal",
  nativeCurrency: { name: "tFHE", symbol: "tFHE", decimals: 18 },
  rpcUrls: {
    public: {
      http: ["http://127.0.0.1:42069"],
    },
    default: {
      http: ["http://127.0.0.1:42069"],
    },
  },
  blockExplorers: {
    default: { name: "LuxFHE Local Explorer", url: "http://localhost:3000/blockexplorer" },
  },
});
