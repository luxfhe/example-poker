import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:getFunds")
  .addPositionalParam("address", "Wallet Address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { luxfhe } = hre;
    await luxfhe.getFunds(taskArguments.address);
    console.log(`Done!`);
  });
