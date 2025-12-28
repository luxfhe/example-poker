import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import inquirer from "inquirer";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Permission, Permit } from "fhenixjs";
import {
  ActionOption,
  GameOutcome,
  getAvailableActions,
  playerActionNameToNum,
  playerActionNumToName,
} from "../test/kuhnPokerUtils";
import { ContractTransactionResponse } from "ethers";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const cardToLetter = (n: bigint) => {
  switch (n) {
    case 0n:
      return "J";
    case 1n:
      return "Q";
    case 2n:
      return "K";
    default:
      return "X";
  }
};

task("task:playPoker").setAction(async function (taskArguments: TaskArguments, hre) {
  const { ethers, deployments, fhenixjs } = hre;
  const [signer, player, computer] = await ethers.getSigners();

  // Localfhenix
  console.log("getting deployed contract");
  const kuhnPokerDeployment = await deployments.get("FHEKuhnPoker");
  const kuhnPokerAddress = kuhnPokerDeployment.address;
  const kuhnPoker = await ethers.getContractAt("FHEKuhnPoker", kuhnPokerDeployment.address);

  console.log("give signer funds");
  await fhenixjs.getFunds(signer.address);
  console.log("give player funds");
  await fhenixjs.getFunds(player.address);
  console.log("give computer funds");
  await fhenixjs.getFunds(computer.address);

  // Hardhat

  // try {
  //   await hre.fhenixjs.encrypt(0);
  // } catch (e) {
  //   console.log("Fhenix threw expected startup error");
  // }

  // if (hre.network.name === HARDHAT_NETWORK_NAME) {
  //   async function deployTokenFixture() {
  //     const mockFheCode = MockFheOps.deployedBytecode;

  //     await hre.network.provider.send("hardhat_setCode", [
  //       "0x0000000000000000000000000000000000000080",
  //       mockFheCode,
  //     ]);
  //   }

  //   await deployTokenFixture();

  //   console.info(
  //     chalk.green(
  //       "Successfully deployed Fhenix mock contracts (solc 0.8.20) on hardhat network",
  //     ),
  //   );
  // }

  // const rngPokerFactory = await ethers.getContractFactory("RNGPoker");
  // const rngPoker = await rngPokerFactory.deploy();
  // await rngPoker.waitForDeployment();
  // const rngPokerAddress = await rngPoker.getAddress();

  // End

  async function createFhenixContractPermission(
    signer: SignerWithAddress,
    contractAddress: string,
  ): Promise<[Permit, Permission]> {
    const provider = ethers.provider;

    const permit = await hre.fhenixjs.generatePermit(contractAddress, provider, signer);
    const permission = hre.fhenixjs.extractPermitPermission(permit);

    return [permit, permission];
  }

  let tx: ContractTransactionResponse;

  console.log("deal in player");
  tx = await kuhnPoker.connect(player).dealMeIn(10);
  await tx.wait();
  console.log("deal in computer");
  tx = await kuhnPoker.connect(computer).dealMeIn(10);
  await tx.wait();

  let sessionEnded = false;

  console.log(
    `

    Welcome to Kuhn Poker!

    -----

    You and the computer have been given 10 chips. Each round starts with
    an ante of 1 chip. The deck is 3 cards, K/Q/J, you and the computer will each be dealt 
    one card and a random player will be selected to start. You can either CHECK / BET to start.

    -----
    `,
  );

  const { ready } = await inquirer.prompt([
    {
      type: "list",
      name: "ready",
      message: "Ready to play?",
      choices: ["Yes", "No"],
    },
  ]);

  if (ready === "No") {
    console.log("Bye!");
    return;
  }

  while (!sessionEnded) {
    tx = await kuhnPoker.connect(computer).findGame();
    await tx.wait();
    const gid = await kuhnPoker.gid();
    tx = await kuhnPoker.connect(player).findGame();
    await tx.wait();
    let game = await kuhnPoker.games(gid);

    const computerChips = await kuhnPoker.chips(computer.address);
    const playerChips = await kuhnPoker.chips(player.address);

    const [computerPermit, computerPermission] = await createFhenixContractPermission(computer, kuhnPokerAddress);
    const computerCardSealed = await kuhnPoker.connect(computer).getGameCard(computerPermission, gid);

    const [playerPermit, playerPermission] = await createFhenixContractPermission(player, kuhnPokerAddress);
    const playerCardSealed = await kuhnPoker.connect(player).getGameCard(playerPermission, gid);

    const playerCard = playerPermit.sealingKey.unseal(playerCardSealed.data);

    const playerCardSymbol = cardToLetter(playerCard);

    const startingPlayer = game.state.startingPlayer === computer.address ? computer : player;
    const oppositePlayer = game.state.startingPlayer === computer.address ? player : computer;
    const roundPlayers = [startingPlayer, oppositePlayer, startingPlayer];

    console.log(`Game ${gid + 1n} created!

      Heres the board:
      (dont worry, the computer can't see your card!)

      +---------------------------------------------------------+
      |     KUHN POKER 
      +---------------------------------------------------------+
      | 
      |     Computer's Card (Face Down):
      |     +---------+
      |     |         |
      |     |  ?????  |
      |     | ??????? |           Chips:         
      |     |  ?????  |           ${computerChips}
      |     | ??????? |
      |     |  ?????  |
      |     |         |
      |     +---------+
      |
      |
      |     Your Card:
      |     +---------+
      |     | ${playerCardSymbol}       |
      |     |         |
      |     |         |           Chips:
      |     |    ${playerCardSymbol}    |           ${playerChips}
      |     |         |
      |     |         |
      |     |       ${playerCardSymbol} |
      |     +---------+
      |
      |`);

    await sleep(1000);

    let round = 1;
    let gameEnded = false;

    while (!gameEnded) {
      game = await kuhnPoker.games(gid);

      const roundPlayer = roundPlayers[round - 1];
      const isPlayersTurn = roundPlayer.address === player.address;

      const availableActionIds = getAvailableActions(
        Number(game.state.action1) as ActionOption,
        Number(game.state.action2) as ActionOption,
      );
      const availableActions = availableActionIds.map(opt => playerActionNumToName(opt));

      console.log(`
      | -- round ${round} --
      |
      |     POT:      ${game.state.pot} Chips
      |     
      |     ${isPlayersTurn ? "Your Turn!" : "Computer's Turn"}
      |     ${availableActions.join(" or ")}
      |`);

      let roundAction = 0n;

      if (isPlayersTurn) {
        const { action } = await inquirer.prompt([
          {
            type: "list",
            name: "action",
            message: "What do you want to do?",
            choices: availableActions,
          },
        ]);
        roundAction = BigInt(playerActionNameToNum(action));
      } else {
        sleep(1000);
        console.log("Computer is thinking ...");
        sleep(1000);
        // Computer chooses randomly
        roundAction = BigInt(availableActionIds[Math.round(Math.random())]);
        console.log(`Computer picked: ${playerActionNumToName(Number(roundAction) as ActionOption)}`);
        sleep(1000);
      }

      tx = await kuhnPoker.connect(roundPlayer).performAction(roundAction);
      await tx.wait();
      await sleep(1000);

      game = await kuhnPoker.games(gid);
      const gameOutcome = Number(game.outcome.outcome);

      // Handle Showdown
      if (gameOutcome === GameOutcome.SHOWDOWN) {
        const computerCardSymbol = cardToLetter(game.outcome.cardA);

        const isPlayerWinner = game.outcome.winner === player.address;
        const winningCard = isPlayerWinner ? playerCardSymbol : computerCardSymbol;
        const losingCard = isPlayerWinner ? computerCardSymbol : playerCardSymbol;
        console.log(`
      | -- showdown --
      |
      |     The computers card is:
      |     +---------+
      |     | ${computerCardSymbol}       |
      |     |         |
      |     |         |
      |     |    ${computerCardSymbol}    |
      |     |         |
      |     |         |
      |     |       ${computerCardSymbol} |
      |     +---------+
      |
      |
      |     ${winningCard} > ${losingCard}: ${isPlayerWinner ? "YOU WIN" : "THE COMPUTER WINS"} ${
          game.state.pot
        } CHIPS BY SHOWDOWN
      |`);
        gameEnded = true;
      }

      // Handle Fold
      if (gameOutcome === GameOutcome.FOLD) {
        const isPlayerWinner = game.outcome.winner === player.address;
        const message = isPlayerWinner
          ? `The computer folds, you win ${game.state.pot} chips.`
          : `You fold, the computer wins ${game.state.pot} chips.`;
        console.log(`
      | -- fold --
      |
      |     ${message} 
      |
      |`);
        gameEnded = true;
      }
      round += 1;
    }

    const { again } = await inquirer.prompt([
      {
        type: "list",
        name: "again",
        message: "Good Game! Do you want to play again?",
        choices: ["Yes", "No"],
      },
    ]);

    if (again === "No") sessionEnded = true;
  }

  console.log("Bye!");
});
