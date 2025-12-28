import { BrowserProvider, Eip1193Provider } from "ethers";
import { LuxFHEClientSync, Permit } from "LuxFHEjs";
import { useCallback, useEffect } from "react";
import { Chain, Client, Transport } from "viem";
import { useWalletClient } from "wagmi";
import create from "zustand";
import { immer } from "zustand/middleware/immer";

type ContractAccountKey = `0x${string}_0x${string}`;
type LuxFHEState = {
  initializedAccount: string | undefined;
  client: LuxFHEClientSync | undefined;
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

  // const wagmiToEthersProvider = clientToProvider(walletClient);
  const provider = new BrowserProvider(window.ethereum as Eip1193Provider);

  // @ts-expect-error Type mismatch on `provider.send`
  const client = await LuxFHEClientSync.create({ provider });

  const loadedPermits = account == null ? null : client.loadAllPermitsFromLocalStorage(account);

  const loadedPermitsWithAccount: Record<ContractAccountKey, Permit> = {};
  if (loadedPermits != null && account != null) {
    Object.entries(loadedPermits).forEach(([contractAddress, permit]) => {
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

export const getOrCreateLuxFHEPermit = async (contractAddress?: `0x${string}`, account?: `0x${string}`) => {
  if (contractAddress == null || account == null) return;

  const client = useLuxFHEState.getState().client;
  if (client == null || contractAddress == null || account == null) return;

  let permit = client.getPermit(contractAddress, account);
  if (permit == null) {
    permit = await client.generatePermit(contractAddress);
  }

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
