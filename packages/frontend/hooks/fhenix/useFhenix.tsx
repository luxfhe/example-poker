import { BrowserProvider, Eip1193Provider, JsonRpcProvider } from "ethers";
import { useEffect, useRef, useState } from "react";
import { FhenixClientSync, Permit } from "fhenixjs";
import { useAccount } from "wagmi";

const useFhenix = () => {
  const fhenixProvider = useRef<JsonRpcProvider | BrowserProvider>();
  const fhenixClient = useRef<FhenixClientSync>();

  const initFhenixProvider = () => {
    if (fhenixProvider.current != null) {
      return fhenixProvider.current;
    }

    // Initialize the provider.
    // @todo: Find a way not to use ethers.BrowserProvider because we already have viem and wagmi here.
    fhenixProvider.current = new BrowserProvider(window.ethereum as Eip1193Provider);
    // fhenixProvider.current = new JsonRpcProvider(connectedChain?.rpcUrls.default.http[0]);
  };

  const initFhenixClient = async () => {
    if (fhenixClient.current != null) {
      return fhenixClient.current;
    }

    initFhenixProvider();

    if (fhenixProvider.current != null) {
      // @ts-expect-error Type mismatch on `provider.send`
      fhenixClient.current = await FhenixClientSync.create({ provider: fhenixProvider.current });
    }
  };

  useEffect(() => {
    initFhenixProvider();
    initFhenixClient();
  }, []);

  return {
    fhenixClient: fhenixClient.current,
    fhenixProvider: fhenixProvider.current,
  };
};

export default useFhenix;

export const useFhenixPermit = (contractAddress: `0x${string}` | undefined) => {
  const { fhenixClient } = useFhenix();
  const { address } = useAccount();
  const [permit, setPermit] = useState<Permit | undefined>(undefined);

  useEffect(() => {
    const getOrGeneratePermit = async () => {
      if (fhenixClient == null || contractAddress == null || address == null) return;

      let permit = fhenixClient.getPermit(contractAddress, undefined as any);
      if (permit == null) {
        permit = await fhenixClient.generatePermit(contractAddress);
      }

      setPermit(permit);
    };

    getOrGeneratePermit();
  }, [address, contractAddress, fhenixClient]);

  if (permit == null || fhenixClient == null) return { permit: undefined, permission: undefined };

  return {
    permit,
    permission: fhenixClient?.extractPermitPermission(permit),
  };
};
