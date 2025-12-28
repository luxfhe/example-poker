import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  createFhenixContractPermission,
  getTokensFromFaucet,
  revertSnapshot,
  takeSnapshot,
  unsealMockFheOpsSealed,
  withinSnapshot,
} from "./utils";
import { ZeroAddress } from "ethers";

import {
  AllPlayerActions,
  ExhaustiveGameBranch,
  Expectation,
  GameOutcome,
  getAvailableActions,
  PlayerAction,
  playerActionFromContractAction,
  playerActionNumToName,
  PokerGameBranch,
} from "./kuhnPokerUtils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FHEKuhnPoker, FHEKuhnPoker__factory } from "../types";

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

describe("FHEKuhnPoker", function () {
  let fheKuhnPokerFactory: FHEKuhnPoker__factory;
  let fheKuhnPoker: FHEKuhnPoker;
  let fheKuhnPokerAddress: string;
  let signer: SignerWithAddress;
  let bob: SignerWithAddress;
  let ada: SignerWithAddress;
  let snapshotId: string;

  before(async () => {
    signer = (await ethers.getSigners())[0];
    bob = (await ethers.getSigners())[1];
    ada = (await ethers.getSigners())[2];

    await getTokensFromFaucet(signer.address);
    await getTokensFromFaucet(bob.address);
    await getTokensFromFaucet(ada.address);

    fheKuhnPokerFactory = (await ethers.getContractFactory("FHEKuhnPoker")) as FHEKuhnPoker__factory;
    fheKuhnPoker = await fheKuhnPokerFactory.deploy();
    await fheKuhnPoker.waitForDeployment();
    fheKuhnPokerAddress = await fheKuhnPoker.getAddress();
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await revertSnapshot(snapshotId);
  });

  const createGame = async () => {
    await fheKuhnPoker.connect(bob).dealMeIn(100);
    await fheKuhnPoker.connect(ada).dealMeIn(100);
    await fheKuhnPoker.connect(bob).findGame();
    await fheKuhnPoker.connect(ada).findGame();
    return Number(await fheKuhnPoker.gid());
  };

  const getValidGamePlayerAndAction = async (gid: number) => {
    const game = await fheKuhnPoker.getGame(gid);
    const player = game.state.activePlayer === bob.address ? bob : ada;

    const availableActions = getAvailableActions(
      playerActionFromContractAction(game.state.action1),
      playerActionFromContractAction(game.state.action2),
    );
    if (availableActions.length === 0) return { player: null, action: null };

    const action = availableActions[0];

    return {
      player,
      action,
    };
  };

  const playValidGameAction = async (gid: number) => {
    const { player, action } = await getValidGamePlayerAndAction(gid);
    if (player == null) return null;
    await fheKuhnPoker.connect(player).performAction(action);
  };

  const playoutGame = async (gid: number) => {
    while (true) {
      await playValidGameAction(gid);
      const game = await fheKuhnPoker.getGame(gid);
      if (Number(game.outcome.outcome) !== GameOutcome.EMPTY) return;
    }
  };

  it("dealMeIn should succeed", async () => {
    const bobTokensInit = await fheKuhnPoker.chips(bob.address);
    await expect(fheKuhnPoker.connect(bob).dealMeIn(100))
      .to.emit(fheKuhnPoker, "PlayerDealtIn")
      .withArgs(bob.address, 100);
    const bobTokensFinal = await fheKuhnPoker.chips(bob.address);
    expect(bobTokensFinal - bobTokensInit).to.eq(100, "Bob receives correct amount of chips");
  });

  it("findGame should revert if not enough chips", async () => {
    // Bob doesn't have chips
    await expect(fheKuhnPoker.connect(bob).findGame()).to.be.revertedWithCustomError(fheKuhnPoker, "NotEnoughChips");
  });

  it("findGame should create a new game if none open", async () => {
    const gid = 1;

    await fheKuhnPoker.connect(bob).dealMeIn(100);
    await expect(fheKuhnPoker.connect(bob).findGame()).to.emit(fheKuhnPoker, "GameCreated").withArgs(bob.address, gid);

    const game = await fheKuhnPoker.games(gid);

    expect(game.gid).to.eq(gid, "game id is 0");
    expect(game.playerA).to.eq(bob.address, "playerA is bob");
    expect(game.playerB).to.eq(ZeroAddress, "playerB is unset");
    expect(game.state.pot).to.eq(1, "pot includes bob's ante");
    expect(await fheKuhnPoker.chips(bob.address)).to.eq(99, "bob's ante taken");

    const bobActiveGame = await fheKuhnPoker.userActiveGame(bob.address);
    expect(bobActiveGame).to.eq(game.gid, "Bobs active game is correct");

    const openGameId = await fheKuhnPoker.openGameId();
    expect(openGameId).to.eq(game.gid, "Created game is the open game");
  });

  it("findGame should join open game if exists", async () => {
    const gid = 1;

    // Create game
    await fheKuhnPoker.connect(bob).dealMeIn(100);
    await fheKuhnPoker.connect(bob).findGame();

    // Invalid playerB
    await expect(fheKuhnPoker.connect(bob).findGame()).to.be.revertedWithCustomError(fheKuhnPoker, "InvalidPlayerB");

    // Not enough chips
    await expect(fheKuhnPoker.connect(ada).findGame()).to.be.revertedWithCustomError(fheKuhnPoker, "NotEnoughChips");

    await fheKuhnPoker.connect(ada).dealMeIn(100);
    await expect(fheKuhnPoker.connect(ada).findGame()).to.emit(fheKuhnPoker, "GameJoined").withArgs(ada.address, gid);

    const game = await fheKuhnPoker.games(gid);

    expect(game.state.accepted).to.eq(true, "ada accepted game");
    expect(game.playerB).to.eq(ada.address, "Ada is playerB");
    expect([bob.address, ada.address].includes(game.state.activePlayer)).to.eq(
      true,
      "Active player should be bob or ada",
    );
    expect(game.state.pot).to.eq(2, "ada's ante should be added");
    expect(await fheKuhnPoker.chips(ada.address)).to.eq(99, "ada's ante should be taken");

    const openGameId = await fheKuhnPoker.openGameId();
    expect(openGameId).to.eq(0, "Open game should be empty");

    const adaActiveGame = await fheKuhnPoker.userActiveGame(bob.address);
    expect(adaActiveGame).to.eq(game.gid, "Adas active game is correct");
  });

  it("randomizations look good", async () => {
    const gid = 1;

    await fheKuhnPoker.connect(bob).dealMeIn(100);
    await fheKuhnPoker.connect(ada).dealMeIn(100);
    await fheKuhnPoker.connect(bob).findGame();

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

    for (let i = 0; i < 100; i++) {
      await withinSnapshot(async () => {
        await time.increase(i + 1);
        await fheKuhnPoker.connect(ada).findGame();
        const game = await fheKuhnPoker.games(gid);

        if (game.state.activePlayer == bob.address) startingPlayer.A += 1;
        else startingPlayer.B += 1;
        startingPlayer.total += 1;

        const eCardA = await fheKuhnPoker.eGameCardA(gid);
        const eCardB = await fheKuhnPoker.eGameCardB(gid);

        expect(eCardA).not.eq(eCardB, "Players cards shouldn't match");
        playerACards[cardToLetter(eCardA)] += 1;
        playerACards.total += 1;
        playerBCards[cardToLetter(eCardB)] += 1;
        playerBCards.total += 1;

        cardPairs[`${cardToLetter(eCardA)}-${cardToLetter(eCardB)}`] += 1;
        cardPairs.total += 1;

        if (eCardA > eCardB) wins.A += 1;
        else wins.B += 1;
        wins.total += 1;
      });
    }

    console.log({
      startingPlayer,
      playerACards,
      playerBCards,
      cardPairs,
      wins,
    });
  });

  it("getGameCard should revert on invalid params", async () => {
    const gid = await createGame();

    // Revert if invalid gid
    let permission = await createFhenixContractPermission(hre, bob, fheKuhnPokerAddress);
    await expect(fheKuhnPoker.connect(bob).getGameCard(permission, gid + 1)).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "InvalidGame",
    );

    // Revert if not player
    permission = await createFhenixContractPermission(hre, signer, fheKuhnPokerAddress);
    await expect(fheKuhnPoker.connect(signer).getGameCard(permission, gid)).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "NotPlayerInGame",
    );

    // Revert if not sender
    permission = await createFhenixContractPermission(hre, ada, fheKuhnPokerAddress);
    await expect(fheKuhnPoker.connect(bob).getGameCard(permission, gid)).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "SignerNotMessageSender",
    );
  });

  it("getGameCard should return sealed card", async () => {
    const gid = await createGame();

    let permission = await createFhenixContractPermission(hre, bob, fheKuhnPokerAddress);
    const bobSealedCard = await fheKuhnPoker.connect(bob).getGameCard(permission, gid);
    const bobUnsealedCard = unsealMockFheOpsSealed(bobSealedCard.data);

    permission = await createFhenixContractPermission(hre, ada, fheKuhnPokerAddress);
    const adaSealedCard = await fheKuhnPoker.connect(ada).getGameCard(permission, gid);
    const adaUnsealedCard = unsealMockFheOpsSealed(adaSealedCard.data);

    const eCardA = await fheKuhnPoker.eGameCardA(gid);
    const eCardB = await fheKuhnPoker.eGameCardB(gid);
    expect(bobUnsealedCard).to.eq(eCardA, "bob's unsealed card should match");
    expect(adaUnsealedCard).to.eq(eCardB, "ada's unsealed card should match");
  });

  it("performAction should revert on invalid params", async () => {
    const gid = 1;

    await fheKuhnPoker.connect(bob).dealMeIn(1);
    await fheKuhnPoker.connect(ada).dealMeIn(1);
    await fheKuhnPoker.connect(bob).findGame();

    // Game not yet started
    await expect(fheKuhnPoker.connect(bob).performAction(PlayerAction.BET)).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "GameNotStarted",
    );

    await fheKuhnPoker.connect(ada).findGame();
    let game = await fheKuhnPoker.games(gid);

    // Cannot perform action if not in an active game
    await expect(fheKuhnPoker.connect(signer).performAction(PlayerAction.BET)).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "NotInGame",
    );

    // Not enough chips
    const startingSigner = game.state.activePlayer === bob.address ? bob : ada;
    await expect(fheKuhnPoker.connect(startingSigner).performAction(PlayerAction.BET)).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "NotEnoughChips",
    );

    await fheKuhnPoker.connect(startingSigner).performAction(PlayerAction.CHECK);
    const oppositeSigner = startingSigner.address === bob.address ? ada : bob;
    await fheKuhnPoker.connect(oppositeSigner).performAction(PlayerAction.CHECK);

    game = await fheKuhnPoker.games(gid);
    expect(game.outcome.winner).not.eq(ZeroAddress, "Game has ended");

    // Game Ended
    await expect(fheKuhnPoker.connect(startingSigner).performAction(PlayerAction.BET)).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "GameEnded",
    );
  });

  it("all gameplay branches should succeed", async () => {
    const gid = await createGame();

    const game = await fheKuhnPoker.games(gid);
    const startingPlayer = game.state.activePlayer === bob.address ? bob : ada;
    const oppositePlayer = game.state.activePlayer === bob.address ? ada : bob;
    const actionPlayers = {
      1: { player: startingPlayer, opposite: oppositePlayer },
      2: { player: oppositePlayer, opposite: startingPlayer },
      3: { player: startingPlayer, opposite: oppositePlayer },
    };

    const processBranch = async (branch: PokerGameBranch) => {
      const game = await fheKuhnPoker.games(gid);
      const { player, opposite } = actionPlayers[branch.actionIndex];

      const indent = "  ".repeat(branch.actionIndex);

      // Should revert if other player tries to play
      await expect(fheKuhnPoker.connect(opposite).performAction(PlayerAction.BET)).to.be.revertedWithCustomError(
        fheKuhnPoker,
        "NotYourTurn",
      );

      // Iterate through actions
      for (let i = 0; i < AllPlayerActions.length; i++) {
        await withinSnapshot(async () => {
          const ACTION = AllPlayerActions[i];
          const outcome = branch.actions[ACTION];
          console.log(`${indent}${playerActionNumToName(ACTION)} - ${outcome.expect.join(" & ")}`);

          // Handle reversions
          if (outcome.revert) {
            for (let j = 0; j < outcome.expect.length; j++) {
              if (outcome.expect[j] === Expectation.InvalidAction) {
                await expect(fheKuhnPoker.connect(player).performAction(ACTION)).to.be.revertedWithCustomError(
                  fheKuhnPoker,
                  "InvalidAction",
                );
              }
            }
            return;
          }

          // Should always emit PerformedGameAction
          await withinSnapshot(async () => {
            await expect(fheKuhnPoker.connect(player).performAction(ACTION))
              .to.emit(fheKuhnPoker, "PerformedGameAction")
              .withArgs(player.address, gid, ACTION);
          });

          // Calculate expected values and states

          const includesBet = outcome.expect.includes(Expectation.TakeBet);
          const includesShowdown = outcome.expect.includes(Expectation.Showdown);
          const includesFold = outcome.expect.includes(Expectation.Fold);
          const includesReveal = includesShowdown || includesFold;

          let expectedPlayerChipChange = 0n;
          let expectedOppositeChipChange = 0n;
          let expectedPot = game.state.pot;
          let expectedCardA = 0n;
          let expectedCardB = 0n;
          let expectedWinner = ZeroAddress;
          let expectedOutcome: number = GameOutcome.EMPTY;

          // Take bet if this action includes a bet step
          if (includesBet) {
            expectedPlayerChipChange -= 1n;
            expectedPot += 1n;
          }

          // Action will ultimately reveal cards
          if (includesReveal) {
            expectedCardA = await fheKuhnPoker.eGameCardA(gid);
            expectedCardB = await fheKuhnPoker.eGameCardB(gid);
          }

          // Winner is decided by highest card
          if (includesShowdown) {
            expectedWinner = expectedCardA > expectedCardB ? bob.address : ada.address;
            expectedOutcome = GameOutcome.SHOWDOWN;
          }

          // Player folds, winner is opposite
          if (includesFold) {
            expectedWinner = opposite.address;
            expectedOutcome = GameOutcome.FOLD;
          }

          // Allocate chips to winner
          if (includesReveal) {
            const currentPlayerIsWinner = expectedWinner === player.address;
            if (currentPlayerIsWinner) expectedPlayerChipChange += expectedPot;
            else expectedOppositeChipChange += expectedPot;
          }

          // Get current values
          const playerChips = await fheKuhnPoker.chips(player.address);
          const oppositeChips = await fheKuhnPoker.chips(opposite.address);

          // Ensure correct events emitted
          for (let j = 0; j < outcome.expect.length; j++) {
            const expectation = outcome.expect[j];
            await withinSnapshot(async () => {
              if (expectation === Expectation.TakeBet) {
                await expect(fheKuhnPoker.connect(player).performAction(ACTION))
                  .to.emit(fheKuhnPoker, "ChipTaken")
                  .withArgs(player.address, gid);
              }
              if (expectation === Expectation.Showdown) {
                await expect(fheKuhnPoker.connect(player).performAction(ACTION))
                  .to.emit(fheKuhnPoker, "WonByShowdown")
                  .withArgs(expectedWinner, gid, expectedPot);
              }
              if (expectation === Expectation.Fold) {
                await expect(fheKuhnPoker.connect(player).performAction(ACTION))
                  .to.emit(fheKuhnPoker, "WonByFold")
                  .withArgs(expectedWinner, gid, expectedPot);
              }
            });
          }

          // Perform action outside of snapshot
          await fheKuhnPoker.connect(player).performAction(ACTION);
          const gameFinal = await fheKuhnPoker.games(gid);

          // Check outcome matches expected
          expect(gameFinal.state.pot).to.eq(expectedPot, "Pot is updated correctly");

          expect((await fheKuhnPoker.chips(player.address)) - playerChips).to.eq(
            expectedPlayerChipChange,
            "Players chips updated correctly",
          );
          expect((await fheKuhnPoker.chips(opposite.address)) - oppositeChips).to.eq(
            expectedOppositeChipChange,
            "Opposite chips updated correctly",
          );

          expect(gameFinal.state[`action${branch.actionIndex}`]).to.eq(
            ACTION,
            "Action should be stored to correct field",
          );

          expect(gameFinal.outcome.cardA).to.eq(
            expectedCardA,
            includesReveal ? "Card A matches encrypted" : "Card A still hidden",
          );
          expect(gameFinal.outcome.cardB).to.eq(
            expectedCardB,
            includesReveal ? "Card B matches encrypted" : "Card B still hidden",
          );
          expect(gameFinal.outcome.winner).to.eq(
            expectedWinner,
            includesReveal ? "Correct player has won" : "Winner not yet decided",
          );
          expect(gameFinal.outcome.outcome).to.eq(
            expectedOutcome,
            includesReveal ? "Correct outcome set" : "Outcome not yet decided",
          );

          // If action outcome has nested branches, perform it and process branches
          if (outcome.branch != null) {
            await processBranch(outcome.branch);
          }
        });
      }
    };

    await processBranch(ExhaustiveGameBranch);
  });

  it("timeout opponent reversions", async () => {
    // Revert if user doesn't have an active game
    await expect(fheKuhnPoker.connect(bob).timeoutOpponent()).to.be.revertedWithCustomError(fheKuhnPoker, "NotInGame");

    const gid = 1;

    await fheKuhnPoker.connect(bob).dealMeIn(100);
    await fheKuhnPoker.connect(ada).dealMeIn(100);
    await fheKuhnPoker.connect(bob).findGame();

    // Revert if game not started
    await expect(fheKuhnPoker.connect(bob).timeoutOpponent()).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "GameNotStarted",
    );

    await fheKuhnPoker.connect(ada).findGame();

    const game = await fheKuhnPoker.getGame(gid);

    // Cannot timeout opponent in a game that has ended
    await withinSnapshot(async () => {
      await playoutGame(gid);
      await expect(fheKuhnPoker.connect(bob).timeoutOpponent()).to.be.revertedWithCustomError(
        fheKuhnPoker,
        "GameEnded",
      );
    });

    // Cannot timeout opponent that still has time
    const waitingPlayer = game.state.activePlayer === bob.address ? ada : bob;
    await expect(fheKuhnPoker.connect(waitingPlayer).timeoutOpponent()).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "OpponentStillHasTime",
    );

    // Cannot timeout opponent on your turn
    const activePlayer = game.state.activePlayer === bob.address ? bob : ada;
    await expect(fheKuhnPoker.connect(activePlayer).timeoutOpponent()).to.be.revertedWithCustomError(
      fheKuhnPoker,
      "ItsYourTurn",
    );
  });

  it("users can win by timeout", async () => {
    const gid = await createGame();
    let game = await fheKuhnPoker.getGame(gid);

    const waitingPlayer = game.state.activePlayer === bob.address ? ada : bob;

    await withinSnapshot(async () => {
      await expect(fheKuhnPoker.connect(waitingPlayer).timeoutOpponent()).to.be.revertedWithCustomError(
        fheKuhnPoker,
        "OpponentStillHasTime",
      );
    });

    const waitingPlayerChipsInit = await fheKuhnPoker.chips(waitingPlayer.address);

    await time.increaseTo(game.state.timeout + 1n);
    await expect(fheKuhnPoker.connect(waitingPlayer).timeoutOpponent())
      .to.emit(fheKuhnPoker, "WonByTimeout")
      .withArgs(waitingPlayer.address, gid, game.state.pot);

    game = await fheKuhnPoker.getGame(gid);
    const waitingPlayerChipsFinal = await fheKuhnPoker.chips(waitingPlayer.address);

    expect(waitingPlayerChipsFinal).to.eq(
      waitingPlayerChipsInit + game.state.pot,
      "WaitingPlayer given pot by timeout",
    );
    expect(game.outcome.outcome).to.eq(GameOutcome.TIMEOUT, "Game ended by timeout");
    expect(game.outcome.winner).to.eq(waitingPlayer.address, "WaitingPlayer marked as winner");
  });

  it("cancel search reversions", async () => {
    // Revert if user doesn't have an active game
    await expect(fheKuhnPoker.connect(bob).cancelSearch()).to.be.revertedWithCustomError(fheKuhnPoker, "NotInGame");

    await createGame();

    // Revert if game started
    await expect(fheKuhnPoker.connect(bob).cancelSearch()).to.be.revertedWithCustomError(fheKuhnPoker, "GameStarted");
  });

  it("user can cancel game that hasn't been accepted", async () => {
    const gid = 1;

    await fheKuhnPoker.connect(bob).dealMeIn(100);
    await fheKuhnPoker.connect(bob).findGame();

    let bobGames = await fheKuhnPoker.getUserGames(bob.address);
    let bobGameIds = bobGames.map(game => game.gid);
    expect(bobGameIds).includes(BigInt(gid), "Game included in bob's games");

    let openGameId = await fheKuhnPoker.openGameId();
    expect(openGameId).to.eq(gid, "Bobs game is the open game");

    const bobChipsInit = await fheKuhnPoker.chips(bob.address);

    await expect(fheKuhnPoker.connect(bob).cancelSearch())
      .to.emit(fheKuhnPoker, "GameCancelled")
      .withArgs(bob.address, gid);

    const game = await fheKuhnPoker.getGame(gid);
    const bobChipsFinal = await fheKuhnPoker.chips(bob.address);

    expect(bobChipsFinal).to.eq(bobChipsInit + game.state.pot, "Bob given his ante back");
    expect(game.outcome.outcome).to.eq(GameOutcome.CANCEL, "Game cancelled");
    expect(game.outcome.winner).to.eq(ZeroAddress, "Cancelled game has no winner");

    bobGames = await fheKuhnPoker.getUserGames(bob.address);
    bobGameIds = bobGames.map(game => game.gid);

    expect(bobGameIds).not.includes(BigInt(gid), "Game removed from bob's games");

    openGameId = await fheKuhnPoker.openGameId();
    expect(openGameId).to.eq(0, "No active open game (bobs game removed)");
  });

  it("rematch reversions", async () => {
    // Revert if user doesn't have an active game
    await expect(fheKuhnPoker.connect(bob).rematch()).to.be.revertedWithCustomError(fheKuhnPoker, "NotInGame");

    const gid = await createGame();
    const rematchGid = gid + 1;

    await playoutGame(gid);

    // Opponent has already left and started a new game
    await withinSnapshot(async () => {
      await fheKuhnPoker.connect(ada).findGame();
      await expect(fheKuhnPoker.connect(bob).rematch()).to.be.revertedWithCustomError(fheKuhnPoker, "OpponentHasLeft");
    });

    await fheKuhnPoker.connect(bob).rematch();

    // Rematch has been cancelled
    await withinSnapshot(async () => {
      await fheKuhnPoker.connect(bob).cancelSearch();
      expect((await fheKuhnPoker.getGame(rematchGid)).outcome.outcome).to.eq(
        GameOutcome.CANCEL,
        "Bob cancelled the rematch",
      );
      await expect(fheKuhnPoker.connect(ada).rematch()).to.be.revertedWithCustomError(fheKuhnPoker, "RematchCancelled");
    });

    // PlayerA - Already requested rematch
    await expect(fheKuhnPoker.connect(bob).rematch()).to.be.revertedWithCustomError(fheKuhnPoker, "GameNotEnded");

    // PlayerB - Already accepted rematch
    await fheKuhnPoker.connect(ada).rematch();
    expect((await fheKuhnPoker.getGame(rematchGid)).state.accepted).to.eq(true, "Ada accepted rematch");
    await expect(fheKuhnPoker.connect(ada).rematch()).to.be.revertedWithCustomError(fheKuhnPoker, "GameNotEnded");
  });

  it("user can request a rematch after the game ends", async () => {
    const gid = await createGame();
    const rematchGid = gid + 1;

    await playoutGame(gid);

    const bobChipsInit = await fheKuhnPoker.chips(bob.address);

    await expect(fheKuhnPoker.connect(bob).rematch())
      .to.emit(fheKuhnPoker, "RematchCreated")
      .withArgs(bob.address, rematchGid);

    const originalGame = await fheKuhnPoker.getGame(gid);
    const rematchGame = await fheKuhnPoker.getGame(rematchGid);
    const openGameId = await fheKuhnPoker.openGameId();
    const bobChipsFinal = await fheKuhnPoker.chips(bob.address);
    const bobActiveGame = await fheKuhnPoker.userActiveGame(bob.address);

    expect(originalGame.outcome.rematchGid).to.eq(rematchGame.gid, "Rematch GID set correctly");
    expect(rematchGame.rematchingGid).to.eq(originalGame.gid, "Rematching from previous game gid");

    expect(rematchGame.playerA).to.eq(bob.address, "Bob rematched, so bob is playerA");
    expect(rematchGame.playerB).to.eq(ada.address, "Ada is remaining player from original game, so ada is playerB");

    expect(openGameId).to.eq(0, "Rematch should not be considered an open game");

    expect(bobChipsFinal).to.eq(bobChipsInit - 1n, "Bob anted in on rematch");

    expect(bobActiveGame).to.eq(rematchGame.gid, "Bobs active game is correct");
  });

  it("user can cancel their rematch request", async () => {
    const gid = await createGame();
    const rematchGid = gid + 1;

    await playoutGame(gid);

    await fheKuhnPoker.connect(bob).rematch();

    // Bob can cancel his rematch request
    await expect(fheKuhnPoker.connect(bob).cancelSearch())
      .to.emit(fheKuhnPoker, "GameCancelled")
      .withArgs(bob.address, rematchGid);
  });

  it("rematch requests are cancelled automatically when the user finds a new game", async () => {
    const gid = await createGame();
    const rematchGid = gid + 1;

    await playoutGame(gid);

    await fheKuhnPoker.connect(bob).rematch();

    const bobChipsInit = await fheKuhnPoker.chips(bob.address);

    await expect(fheKuhnPoker.connect(bob).findGame())
      .to.emit(fheKuhnPoker, "GameCancelled")
      .withArgs(bob.address, rematchGid);

    await expect(fheKuhnPoker.connect(ada).rematch()).to.be.revertedWithCustomError(fheKuhnPoker, "RematchCancelled");

    const bobChipsFinal = await fheKuhnPoker.chips(bob.address);
    expect(bobChipsInit).to.eq(bobChipsFinal, "One chip returned from rematch request, then anted into new game");
  });

  it("user can accept a rematch and start a new game", async () => {
    const gid = await createGame();
    const rematchGid = gid + 1;

    await playoutGame(gid);

    let bobGameIds = (await fheKuhnPoker.getUserGames(bob.address)).map(game => game.gid);
    expect(bobGameIds).to.deep.eq([1n], "Bob only played game 1");

    await fheKuhnPoker.connect(bob).rematch();

    bobGameIds = (await fheKuhnPoker.getUserGames(bob.address)).map(game => game.gid);
    expect(bobGameIds).to.deep.eq([1n], "Requesting a rematch does not add it to the users games");

    await expect(fheKuhnPoker.connect(ada).rematch())
      .to.emit(fheKuhnPoker, "RematchAccepted")
      .withArgs(ada.address, rematchGid);

    bobGameIds = (await fheKuhnPoker.getUserGames(bob.address)).map(game => game.gid);
    expect(bobGameIds).to.deep.eq([1n, 2n], "Ada accepting rematch adds it to bobs games");

    const adaActiveGame = await fheKuhnPoker.userActiveGame(bob.address);
    expect(adaActiveGame).to.eq(rematchGid, "Adas active game is the rematch");

    // Rematch can be played
    await playoutGame(rematchGid);
  });

  it("all games between to players are added to pairGames", async () => {
    let gid = await createGame();

    await playoutGame(gid);

    let pairGames = await fheKuhnPoker.getPairGames(bob.address, ada.address);
    let pairGameIds = pairGames.map(game => game.gid);
    const pairGames2 = await fheKuhnPoker.getPairGames(ada.address, bob.address);
    expect(pairGameIds).to.deep.eq(
      pairGames2.map(game => game.gid),
      "Pair games users order shouldn't matter",
    );
    expect(pairGameIds).to.deep.eq([1n], "Pair has played games: [1]");

    await fheKuhnPoker.connect(bob).rematch();
    await fheKuhnPoker.connect(ada).rematch();

    gid += 1;
    await playoutGame(gid);

    pairGames = await fheKuhnPoker.getPairGames(bob.address, ada.address);
    pairGameIds = pairGames.map(game => game.gid);
    expect(pairGameIds).to.deep.eq([1n, 2n], "Pair has played games: [1, 2]");

    // Reversed order
    await fheKuhnPoker.connect(ada).rematch();
    await fheKuhnPoker.connect(bob).rematch();

    gid += 1;
    await playoutGame(gid);

    // Reversed order here
    pairGames = await fheKuhnPoker.getPairGames(ada.address, bob.address);
    pairGameIds = pairGames.map(game => game.gid);
    expect(pairGameIds).to.deep.eq([1n, 2n, 3n], "Pair has played games: [1, 2, 3]");
  });

  it("users can resign", async () => {
    // Revert if user doesn't have an active game
    await expect(fheKuhnPoker.connect(bob).resign()).to.be.revertedWithCustomError(fheKuhnPoker, "NotInGame");

    const gid = 1;

    await fheKuhnPoker.connect(bob).dealMeIn(100);
    await fheKuhnPoker.connect(ada).dealMeIn(100);
    await fheKuhnPoker.connect(bob).findGame();

    // Game not started
    await expect(fheKuhnPoker.connect(bob).resign()).to.be.revertedWithCustomError(fheKuhnPoker, "GameNotStarted");

    await fheKuhnPoker.connect(ada).findGame();

    // Game ended
    await withinSnapshot(async () => {
      await playoutGame(gid);
      await expect(fheKuhnPoker.connect(bob).resign()).to.be.revertedWithCustomError(fheKuhnPoker, "GameEnded");
    });

    // Valid Resignation
    let game = await fheKuhnPoker.getGame(gid);
    const adaChipsInit = await fheKuhnPoker.chips(ada.address);

    await expect(fheKuhnPoker.connect(bob).resign())
      .to.emit(fheKuhnPoker, "WonByResignation")
      .withArgs(ada.address, gid, game.state.pot);

    game = await fheKuhnPoker.getGame(gid);
    const adaChipsFinal = await fheKuhnPoker.chips(ada.address);

    expect(game.outcome.outcome).to.eq(GameOutcome.RESIGN, "Bob resigned");
    expect(game.outcome.winner).to.eq(ada.address, "Bob resigned so ada wins");
    expect(adaChipsFinal).to.eq(adaChipsInit + game.state.pot, "Ada gets pot");
  });

  it("finding a new game will resign the user from their existing game", async () => {
    const gid = await createGame();

    await expect(fheKuhnPoker.connect(bob).findGame())
      .to.emit(fheKuhnPoker, "WonByResignation")
      .withArgs(ada.address, gid, 2);
  });

  it("finding a new game will resign the user from their existing rematch", async () => {
    const gid = await createGame();
    const rematchGid = gid + 1;

    await playoutGame(gid);

    await fheKuhnPoker.connect(bob).rematch();
    await fheKuhnPoker.connect(ada).rematch();

    await expect(fheKuhnPoker.connect(ada).findGame())
      .to.emit(fheKuhnPoker, "WonByResignation")
      .withArgs(bob.address, rematchGid, 2);
  });

  it("user gids state updates correctly over time", async () => {
    const gid = 1;

    await fheKuhnPoker.connect(bob).dealMeIn(100);
    await fheKuhnPoker.connect(ada).dealMeIn(100);

    const expectGidsState = (
      actual: FHEKuhnPoker.UserGameStateStructOutput,
      expected: { active: number; rematch: number; self: number; opponent: number },
    ) => {
      expect(actual.activeGid).to.eq(expected.active, "Active should match");
      expect(actual.rematchGid).to.eq(expected.rematch, "Rematch should match");
      expect(actual.selfGid).to.eq(expected.self, "Self should match");
      expect(actual.opponentGid).to.eq(expected.opponent, "Opponent should match");
    };

    let bobGids = await fheKuhnPoker.getUserGameState(bob.address);
    expectGidsState(bobGids, { active: 0, rematch: 0, self: 0, opponent: 0 });

    await fheKuhnPoker.connect(bob).findGame();

    bobGids = await fheKuhnPoker.getUserGameState(bob.address);
    expectGidsState(bobGids, { active: 0, rematch: 0, self: 1, opponent: 0 });

    await fheKuhnPoker.connect(ada).findGame();

    bobGids = await fheKuhnPoker.getUserGameState(bob.address);
    expectGidsState(bobGids, { active: 1, rematch: 0, self: 1, opponent: 1 });

    await playoutGame(gid);

    // Bob finds new game
    await withinSnapshot(async () => {
      await fheKuhnPoker.connect(bob).findGame();

      bobGids = await fheKuhnPoker.getUserGameState(bob.address);
      expectGidsState(bobGids, { active: 0, rematch: 0, self: 2, opponent: 0 });

      const adaGids = await fheKuhnPoker.getUserGameState(ada.address);
      expectGidsState(adaGids, { active: 1, rematch: 0, self: 1, opponent: 2 });
    });

    // Bob requests rematch
    await withinSnapshot(async () => {
      await fheKuhnPoker.connect(bob).rematch();

      bobGids = await fheKuhnPoker.getUserGameState(bob.address);
      expectGidsState(bobGids, { active: 1, rematch: 2, self: 2, opponent: 1 });

      const adaGids = await fheKuhnPoker.getUserGameState(ada.address);
      expectGidsState(adaGids, { active: 1, rematch: 2, self: 1, opponent: 2 });
    });
  });
});
