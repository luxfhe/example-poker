import { LuxFHEClient, Permit, getAllPermits, getPermit as getPermitFn } from "~~/lib/luxfhe";
import { useCallback, useEffect } from "react";
import { Chain, Client, Transport } from "viem";
import { useWalletClient } from "wagmi";
import create from "zustand";
import { immer } from "zustand/middleware/immer";

type ContractAccountKey = `0x${string}_0x${string}`;
type LuxFHEState = {
  initializedAccount: string | undefined;
  client: LuxFHEClient | undefined;
  contractAccountPermits: Record<ContractAccountKey, Permit>;
};

export const useLuxFHEState = create<LuxFHEState>()(
  immer(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (set, get): LuxFHEState => ({
      initializedAccount: undefined,
      client: undefined,
      contractAccountPermits: {},
    }),
  ),
);

export const initLuxFHEClient = async (walletClient: Client<Transport, Chain>) => {
  // Exit if account hasn't changed (no need to update)
  const account = walletClient.account?.address;
  if (account === useLuxFHEState.getState().initializedAccount) return;

  // LuxFHEClient uses constructor and initialize()
  const client = new LuxFHEClient({});
  await client.initialize();

  // Load existing permits from the module-level store
  const loadedPermits = getAllPermits();

  const loadedPermitsWithAccount: Record<ContractAccountKey, Permit> = {};
  if (account != null) {
    loadedPermits.forEach((permit, contractAddress) => {
      const key: ContractAccountKey = `${contractAddress as `0x${string}`}_${account}`;
      loadedPermitsWithAccount[key] = permit;
    });
  }

  useLuxFHEState.setState({
    initializedAccount: account,
    client,
    contractAccountPermits: loadedPermitsWithAccount,
  });
};

export const getOrCreateLuxFHEPermit = async (
  contractAddress?: `0x${string}`,
  account?: `0x${string}`,
  provider?: any,
) => {
  if (contractAddress == null || account == null) return;

  const client = useLuxFHEState.getState().client;
  if (client == null) return;

  // Use module-level getPermit which handles storage and generation
  const permit = await getPermitFn(contractAddress, provider);

  useLuxFHEState.setState(draft => {
    draft.contractAccountPermits[`${contractAddress}_${account}`] = permit;
  });
};

export const getLuxFHEPermit = (contractAddress: `0x${string}`, account: `0x${string}`) => {
  const key: ContractAccountKey = `${contractAddress}_${account}`;
  return useLuxFHEState.getState().contractAccountPermits[key];
};

// HOOKS

export const useInitLuxFHEClient = () => {
  return useCallback((client: Client<Transport, Chain>) => {
    initLuxFHEClient(client);
  }, []);
};
export const useCreateLuxFHEPermit = () => {
  return useCallback(getOrCreateLuxFHEPermit, []);
};

export const useLuxFHEClient = () => {
  return useLuxFHEState(state => state.client);
};
export const useLuxFHEPermit = (contractAddress: `0x${string}` | undefined, account: `0x${string}` | undefined) => {
  return useLuxFHEState(state => {
    if (contractAddress == null || account == null) return { permit: undefined, permission: undefined };

    const key: ContractAccountKey = `${contractAddress}_${account}`;
    const permit = state.contractAccountPermits[key];

    if (permit == null || state.client == null) return { permit: undefined, permission: undefined };

    return {
      permit,
      permission: state.client?.extractPermitPermission(permit),
    };
  });
};

// WAGMI hooks (useAccount)
export const useWagmiInitLuxFHEClient = () => {
  const initLuxFHEClient = useInitLuxFHEClient();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (walletClient == null) return;
    initLuxFHEClient(walletClient);
  }, [walletClient, initLuxFHEClient]);
};
