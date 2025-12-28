import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Permission } from "fhenixjs";
import hre, { ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export const getTokensFromFaucet = async (address: string) => {
  if (hre.network.name === "localfhenix") {
    if ((await hre.ethers.provider.getBalance(address)).toString() === "0") {
      await hre.fhenixjs.getFunds(address);
    }
  }
};

export const takeSnapshot = async (): Promise<string> => {
  return network.provider.send("evm_snapshot");
};

export const revertSnapshot = async (snapshot: string) => {
  return network.provider.send("evm_revert", [snapshot]);
};

export const withinSnapshot = async <T>(body: () => Promise<T>): Promise<T | undefined> => {
  const tmp = await takeSnapshot();
  try {
    const res = await body();
    return res;
  } finally {
    await revertSnapshot(tmp);
  }
};

export const createFhenixContractPermission = async (
  hre: HardhatRuntimeEnvironment,
  signer: SignerWithAddress,
  contractAddress: string,
): Promise<Permission> => {
  const provider = ethers.provider;

  const permit = await hre.fhenixjs.generatePermit(contractAddress, provider, signer);
  const permission = hre.fhenixjs.extractPermitPermission(permit);

  return permission;
};

export const unsealMockFheOpsSealed = (sealed: string): bigint => {
  const byteArray = new Uint8Array(sealed.split("").map(c => c.charCodeAt(0)));

  // Step 2: Convert the Uint8Array to BigInt
  let result = BigInt(0);
  for (let i = 0; i < byteArray.length; i++) {
    result = (result << BigInt(8)) + BigInt(byteArray[i]); // Shift and add each byte
  }

  return result;
};
