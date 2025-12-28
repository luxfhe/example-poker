/* eslint-disable @typescript-eslint/no-unused-vars */
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import {
  GameOutcome,
  getAvailableActions,
  playerActionFromContractAction,
  playerActionNumToName,
} from "../test/kuhnPokerUtils";

task("task:kuhnPokerRandomness").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { fhenixjs, ethers, deployments } = hre;
  const [signer, bob, ada] = await ethers.getSigners();

  const getTokensFromFaucet = async (address: string) => {
    if ((await hre.ethers.provider.getBalance(address)).toString() === "0") {
      await hre.fhenixjs.getFunds(address);
    }
  };

  await getTokensFromFaucet(bob.address);
  await getTokensFromFaucet(ada.address);

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

  const getValidGamePlayerAndAction = async (gid: number) => {
    const game = await fheKuhnPoker.getGame(gid);
    const player = game.state.activePlayer === bob.address ? bob : ada;

    const availableActions = getAvailableActions(
      playerActionFromContractAction(game.state.action1),
      playerActionFromContractAction(game.state.action2),
    );
    if (availableActions.length === 0) return { player: null, action: null };

    const action = availableActions[Math.floor(Math.random() * availableActions.length)];

    return {
      player,
      action,
    };
  };

  const playValidGameAction = async (gid: number) => {
    const { player, action } = await getValidGamePlayerAndAction(gid);
    console.log(player?.address, "-", action == null ? "NULL" : playerActionNumToName(action));
    if (player == null) return null;
    const res = await fheKuhnPoker.connect(player).performAction(action, {
      gasLimit: "0x15de90",
      gasPrice: "0x7270e00",
    });
    await res.wait(1);
  };

  const playoutGame = async (gid: number) => {
    while (true) {
      await playValidGameAction(gid);
      const game = await fheKuhnPoker.getGame(gid);
      console.log("outcome", game.outcome.outcome);
      if (Number(game.outcome.outcome) !== GameOutcome.EMPTY) return;
    }
  };

  const FHEKuhnPoker = await deployments.get("FHEKuhnPoker");

  const fheKuhnPoker = await ethers.getContractAt("FHEKuhnPoker", FHEKuhnPoker.address);

  console.log({
    fheKuhnPoker,
  });

  const startingPlayer = {
    A: 0,
    B: 0,
    total: 0,
  };
  const playerACards: Record<string, number> = {
    K: 0,
    Q: 0,
    J: 0,
    total: 0,
  };
  const playerBCards: Record<string, number> = {
    K: 0,
    Q: 0,
    J: 0,
    total: 0,
  };
  const cardPairs: Record<string, number> = {
    "K-J": 0,
    "K-Q": 0,
    "Q-K": 0,
    "Q-J": 0,
    "J-K": 0,
    "J-Q": 0,
    total: 0,
  };
  const wins = {
    A: 0,
    B: 0,
    total: 0,
  };

  // TESTING

  let res = await fheKuhnPoker.connect(bob).dealMeIn(100);
  await res.wait(1);
  res = await fheKuhnPoker.connect(ada).dealMeIn(100);
  await res.wait(1);
  res = await fheKuhnPoker.connect(bob).findGame();
  await res.wait(1);
  res = await fheKuhnPoker.connect(ada).findGame();
  await res.wait(1);

  for (let i = 0; i < 100; i++) {
    const gid = Number(await fheKuhnPoker.gid());
    console.log("Playing Game ", gid);
    await playoutGame(gid);
    const game = await fheKuhnPoker.games(gid);

    if (game.state.activePlayer == bob.address) startingPlayer.A += 1;
    else startingPlayer.B += 1;
    startingPlayer.total += 1;

    playerACards[cardToLetter(game.outcome.cardA)] += 1;
    playerACards.total += 1;
    playerBCards[cardToLetter(game.outcome.cardB)] += 1;
    playerBCards.total += 1;

    cardPairs[`${cardToLetter(game.outcome.cardA)}-${cardToLetter(game.outcome.cardB)}`] += 1;
    cardPairs.total += 1;

    if (game.outcome.cardA > game.outcome.cardB) wins.A += 1;
    else wins.B += 1;
    wins.total += 1;

    console.log("PlayerA card", game.outcome.cardA, "PlayerB card", game.outcome.cardB);

    res = await fheKuhnPoker.connect(bob).rematch({
      gasLimit: "0x15de90",
      gasPrice: "0x7270e00",
    });
    await res.wait(1);
    res = await fheKuhnPoker.connect(ada).rematch({
      gasLimit: "0x15de90",
      gasPrice: "0x7270e00",
    });
    await res.wait(1);
  }

  console.log({
    startingPlayer,
    playerACards,
    playerBCards,
    cardPairs,
    wins,
  });
});
