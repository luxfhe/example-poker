import type { ExtractAbiFunctionNames } from "abitype";
import { useAccount, useContractRead } from "wagmi";
import { useDeployedContractInfo, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { useLuxFHEClient, useLuxFHEPermit } from "~~/services/LuxFHE/store";
import {
  AbiFunctionReturnType,
  ContractAbi,
  ContractName,
  UseLuxFHEScaffoldReadConfig,
  UseScaffoldReadConfig,
} from "~~/utils/scaffold-eth/contract";
import { unsealLuxFHESealedItems } from "~~/utils/LuxFHEUtils";
import { InjectLuxFHEPermission } from "~~/utils/LuxFHEUtilsTypes";

/**
 * Wrapper around wagmi's useContractRead hook which automatically loads (by name) the contract ABI and address from
 * the contracts present in deployedContracts.ts & externalContracts.ts corresponding to targetNetworks configured in scaffold.config.ts
 * @param config - The config settings, including extra wagmi configuration
 * @param config.contractName - deployed contract name
 * @param config.functionName - name of the function to be called
 * @param config.args - args to be passed to the function call
 */
export const useLuxFHEScaffoldContractRead = <
  TContractName extends ContractName,
  TFunctionName extends ExtractAbiFunctionNames<ContractAbi<TContractName>, "pure" | "view">,
>(
  config: UseLuxFHEScaffoldReadConfig<TContractName, TFunctionName>,
) => {
  const LuxFHEClient = useLuxFHEClient();
  const { data: deployedContract } = useDeployedContractInfo(config.contractName);
  const { address } = useAccount();
  const { permission } = useLuxFHEPermit(deployedContract?.address, address);

  const injectedConfig = {
    ...config,
    args:
      config.args == null
        ? undefined
        : (config.args as any[]).map(arg => (arg === InjectLuxFHEPermission ? permission : arg)),
    account: address,
  } as UseScaffoldReadConfig<TContractName, TFunctionName>;

  const { data, ...rest } = useScaffoldContractRead(injectedConfig);

  // // Unseal any sealed output types in the result data
  const unsealedData =
    deployedContract?.address == null || address == null || LuxFHEClient == null
      ? undefined
      : unsealLuxFHESealedItems(data, deployedContract?.address, address, LuxFHEClient);

  return {
    data: unsealedData,
    ...rest,
  } as Omit<ReturnType<typeof useContractRead>, "data" | "refetch"> & {
    data: AbiFunctionReturnType<ContractAbi, TFunctionName, "LuxFHE-utils-modified"> | undefined;
    refetch: (options?: {
      throwOnError: boolean;
      cancelRefetch: boolean;
    }) => Promise<AbiFunctionReturnType<ContractAbi, TFunctionName, "LuxFHE-utils-modified">>;
  };
};
