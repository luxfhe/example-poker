import { Abi, AbiFunction, ExtractAbiFunctionNames } from "abitype";
import { useState } from "react";
import { useContractWrite, useNetwork } from "wagmi";
import { useDeployedContractInfo, useTransactor } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import {
  ContractAbi,
  ContractName,
  UseFhenixScaffoldWriteConfig,
  UseScaffoldWriteConfig,
} from "~~/utils/scaffold-eth/contract";
import { useTargetNetwork } from "./useTargetNetwork";
import { Encryptable } from "~~/utils/fhenixUtils";
import { useFhenixClient } from "~~/services/fhenix/store";

type UpdatedArgs = Parameters<ReturnType<typeof useContractWrite<Abi, string, undefined>>["writeAsync"]>[0];

/**
 * Wrapper around wagmi's useContractWrite hook which automatically loads (by name) the contract ABI and address from
 * the contracts present in deployedContracts.ts & externalContracts.ts corresponding to targetNetworks configured in scaffold.config.ts
 * @param config - The config settings, including extra wagmi configuration
 * @param config.contractName - contract name
 * @param config.functionName - name of the function to be called
 * @param config.args - arguments for the function
 * @param config.value - value in ETH that will be sent with transaction
 * @param config.blockConfirmations - number of block confirmations to wait for (default: 1)
 * @param config.onBlockConfirmation - callback that will be called after blockConfirmations.
 */
export const useFhenixScaffoldContractWrite = <
  TContractName extends ContractName,
  TFunctionName extends ExtractAbiFunctionNames<ContractAbi<TContractName>, "nonpayable" | "payable">,
>({
  contractName,
  functionName,
  args,
  value,
  onBlockConfirmation,
  blockConfirmations,
  ...writeConfig
}: UseFhenixScaffoldWriteConfig<TContractName, TFunctionName>) => {
  const { data: deployedContractData } = useDeployedContractInfo(contractName);
  const { chain } = useNetwork();
  const writeTx = useTransactor();
  const [isMining, setIsMining] = useState(false);
  const { targetNetwork } = useTargetNetwork();
  const fhenixClient = useFhenixClient();

  const wagmiContractWrite = useContractWrite({
    chainId: targetNetwork.id,
    address: deployedContractData?.address,
    abi: deployedContractData?.abi as Abi,
    functionName: functionName as any,
    args: args as unknown[],
    value: value,
    ...writeConfig,
  });

  const sendContractWriteTx = async ({
    args: newArgs,
    value: newValue,
    ...otherConfig
  }: {
    args?: UseFhenixScaffoldWriteConfig<TContractName, TFunctionName>["args"];
    value?: UseFhenixScaffoldWriteConfig<TContractName, TFunctionName>["value"];
  } & UpdatedArgs = {}) => {
    if (!deployedContractData) {
      notification.error("Target Contract is not deployed, did you forget to run `yarn deploy`?");
      return;
    }
    if (!chain?.id) {
      notification.error("Please connect your wallet");
      return;
    }
    if (chain?.id !== targetNetwork.id) {
      notification.error("You are on the wrong network");
      return;
    }
    if (!fhenixClient) {
      notification.error("Fhenixjs Client not initialized");
      return;
    }

    const isAbiFunctionWithName = (item: any): item is AbiFunction => {
      if (item.type === "function" && item.name === functionName) return true;
      return false;
    };

    const functionAbi = deployedContractData.abi.find(isAbiFunctionWithName) as AbiFunction | undefined;
    console.log({
      functionAbi,
    });

    const unsealedArgs = newArgs ?? args;
    let sealedArgs: UseScaffoldWriteConfig<TContractName, TFunctionName>["args"] | undefined = undefined;
    if (unsealedArgs != null) {
      sealedArgs = Encryptable.encrypt(unsealedArgs, fhenixClient) as UseScaffoldWriteConfig<
        TContractName,
        TFunctionName
      >["args"];
    }

    if (wagmiContractWrite.writeAsync) {
      try {
        setIsMining(true);
        const writeTxResult = await writeTx(
          () =>
            wagmiContractWrite.writeAsync({
              args: sealedArgs,
              value: newValue ?? value,
              ...otherConfig,
            }),
          { onBlockConfirmation, blockConfirmations },
        );

        return writeTxResult;
      } catch (e: any) {
        throw e;
      } finally {
        setIsMining(false);
      }
    } else {
      notification.error("Contract writer error. Try again.");
      return;
    }
  };

  return {
    ...wagmiContractWrite,
    isMining,
    // Overwrite wagmi's write async
    writeAsync: sendContractWriteTx,
  };
};
