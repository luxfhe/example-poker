import { useEffect, useRef, useState } from "react";
import { LuxFHEClient, Permit, getPermit as getPermitFn } from "~~/lib/luxfhe";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";

const useLuxFHE = () => {
  const luxfheClient = useRef<LuxFHEClient>();

  const initLuxFHEClient = async () => {
    if (luxfheClient.current != null) {
      return luxfheClient.current;
    }

    // LuxFHEClient constructor takes an optional config object
    luxfheClient.current = new LuxFHEClient({});
    await luxfheClient.current.initialize();
  };

  useEffect(() => {
    initLuxFHEClient();
  }, []);

  return {
    luxfheClient: luxfheClient.current,
  };
};

export default useLuxFHE;

export const useLuxFHEPermit = (contractAddress: `0x${string}` | undefined) => {
  const { luxfheClient } = useLuxFHE();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [permit, setPermit] = useState<Permit | undefined>(undefined);

  useEffect(() => {
    const getOrGeneratePermit = async () => {
      if (luxfheClient == null || contractAddress == null || address == null) return;

      // Use module-level getPermit which handles storage and generation
      const p = await getPermitFn(contractAddress, publicClient);
      setPermit(p);
    };

    getOrGeneratePermit();
  }, [address, contractAddress, luxfheClient, publicClient]);

  if (permit == null || luxfheClient == null) return { permit: undefined, permission: undefined };

  return {
    permit,
    permission: luxfheClient.extractPermitPermission(permit),
  };
};
