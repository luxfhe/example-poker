import type { ExtractAbiFunctionNames } from "abitype";
import { useAccount, useContractRead } from "wagmi";
import { useDeployedContractInfo, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { useFhenixClient, useFhenixPermit } from "~~/services/fhenix/store";
import {
  AbiFunctionReturnType,
  ContractAbi,
  ContractName,
  UseFhenixScaffoldReadConfig,
  UseScaffoldReadConfig,
} from "~~/utils/scaffold-eth/contract";
import { unsealFhenixSealedItems } from "~~/utils/fhenixUtils";
import { InjectFhenixPermission } from "~~/utils/fhenixUtilsTypes";

/**
 * Wrapper around wagmi's useContractRead hook which automatically loads (by name) the contract ABI and address from
 * the contracts present in deployedContracts.ts & externalContracts.ts corresponding to targetNetworks configured in scaffold.config.ts
 * @param config - The config settings, including extra wagmi configuration
 * @param config.contractName - deployed contract name
 * @param config.functionName - name of the function to be called
 * @param config.args - args to be passed to the function call
 */
export const useFhenixScaffoldContractRead = <
  TContractName extends ContractName,
  TFunctionName extends ExtractAbiFunctionNames<ContractAbi<TContractName>, "pure" | "view">,
>(
  config: UseFhenixScaffoldReadConfig<TContractName, TFunctionName>,
) => {
  const fhenixClient = useFhenixClient();
  const { data: deployedContract } = useDeployedContractInfo(config.contractName);
  const { address } = useAccount();
  const { permission } = useFhenixPermit(deployedContract?.address, address);

  const injectedConfig = {
    ...config,
    args:
      config.args == null
        ? undefined
        : (config.args as any[]).map(arg => (arg === InjectFhenixPermission ? permission : arg)),
    account: address,
  } as UseScaffoldReadConfig<TContractName, TFunctionName>;

  const { data, ...rest } = useScaffoldContractRead(injectedConfig);

  // // Unseal any sealed output types in the result data
  const unsealedData =
    deployedContract?.address == null || address == null || fhenixClient == null
      ? undefined
      : unsealFhenixSealedItems(data, deployedContract?.address, address, fhenixClient);

  return {
    data: unsealedData,
    ...rest,
  } as Omit<ReturnType<typeof useContractRead>, "data" | "refetch"> & {
    data: AbiFunctionReturnType<ContractAbi, TFunctionName, "fhenix-utils-modified"> | undefined;
    refetch: (options?: {
      throwOnError: boolean;
      cancelRefetch: boolean;
    }) => Promise<AbiFunctionReturnType<ContractAbi, TFunctionName, "fhenix-utils-modified">>;
  };
};
