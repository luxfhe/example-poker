import { BrowserProvider, Eip1193Provider, JsonRpcProvider } from "ethers";
import { useEffect, useRef, useState } from "react";
import { LuxFHEClientSync, Permit } from "luxfhejs";
import { useAccount } from "wagmi";

const useLuxFHE = () => {
  const luxfheProvider = useRef<JsonRpcProvider | BrowserProvider>();
  const luxfheClient = useRef<LuxFHEClientSync>();

  const initLuxFHEProvider = () => {
    if (luxfheProvider.current != null) {
      return luxfheProvider.current;
    }

    // Initialize the provider.
    // @todo: Find a way not to use ethers.BrowserProvider because we already have viem and wagmi here.
    luxfheProvider.current = new BrowserProvider(window.ethereum as Eip1193Provider);
    // luxfheProvider.current = new JsonRpcProvider(connectedChain?.rpcUrls.default.http[0]);
  };

  const initLuxFHEClient = async () => {
    if (luxfheClient.current != null) {
      return luxfheClient.current;
    }

    initLuxFHEProvider();

    if (luxfheProvider.current != null) {
      // @ts-expect-error Type mismatch on `provider.send`
      luxfheClient.current = await LuxFHEClientSync.create({ provider: luxfheProvider.current });
    }
  };

  useEffect(() => {
    initLuxFHEProvider();
    initLuxFHEClient();
  }, []);

  return {
    luxfheClient: luxfheClient.current,
    luxfheProvider: luxfheProvider.current,
  };
};

export default useLuxFHE;

export const useLuxFHEPermit = (contractAddress: `0x${string}` | undefined) => {
  const { luxfheClient } = useLuxFHE();
  const { address } = useAccount();
  const [permit, setPermit] = useState<Permit | undefined>(undefined);

  useEffect(() => {
    const getOrGeneratePermit = async () => {
      if (luxfheClient == null || contractAddress == null || address == null) return;

      let permit = luxfheClient.getPermit(contractAddress, undefined as any);
      if (permit == null) {
        permit = await luxfheClient.generatePermit(contractAddress);
      }

      setPermit(permit);
    };

    getOrGeneratePermit();
  }, [address, contractAddress, luxfheClient]);

  if (permit == null || luxfheClient == null) return { permit: undefined, permission: undefined };

  return {
    permit,
    permission: luxfheClient?.extractPermitPermission(permit),
  };
};
