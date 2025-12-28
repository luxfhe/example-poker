import { zeroAddress } from "viem";
import { useEffect } from "react";
import { useInterval } from "usehooks-ts";
import { useAccount, useNetwork } from "wagmi";
import create from "zustand";
import { useFhenixScaffoldContractRead } from "~~/hooks/scaffold-eth/useFhenixScaffoldContractRead";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { InjectFhenixPermission } from "~~/utils/fhenixUtilsTypes";
import { AbiFunctionReturnType, ContractAbi } from "~~/utils/scaffold-eth/contract";

export type ContractUserGameState = AbiFunctionReturnType<ContractAbi<"FHEKuhnPoker">, "getUserGameState">;

type GameState = {
  address: string | null;
  gameState: ContractUserGameState | null;
  playerCard: number | null;
};

export enum GameOutcome {
  EMPTY,
  SHOWDOWN,
  FOLD,
  TIMEOUT,
  CANCEL,
  RESIGN,
}

export const outcomeToText = (outcome: GameOutcome) => {
  switch (outcome) {
    case GameOutcome.EMPTY:
      return "NONE";
    case GameOutcome.SHOWDOWN:
      return "SHOWDOWN";
    case GameOutcome.FOLD:
      return "FOLD";
    case GameOutcome.TIMEOUT:
      return "TIMEOUT";
    case GameOutcome.CANCEL:
      return "CANCEL";
    case GameOutcome.RESIGN:
      return "RESIGNATION";
    default:
      return "UNKNOWN";
  }
};

export enum PlayerAction {
  EMPTY,
  CHECK,
  BET,
  FOLD,
  CALL,
}

export type GameInfo = AbiFunctionReturnType<ContractAbi<"FHEKuhnPoker">, "getGame">;
export type GidsState = AbiFunctionReturnType<ContractAbi<"FHEKuhnPoker">, "getUserGameState">;

export const EmptyGameInfo: GameInfo = {
  gid: 0n,
  rematchingGid: 0n,
  playerA: zeroAddress,
  playerB: zeroAddress,
  state: {
    accepted: false,
    eCardA: 0n,
    eCardB: 0n,
    pot: 0,
    startingPlayer: zeroAddress,
    activePlayer: zeroAddress,
    timeout: 0n,
    action1: 0,
    action2: 0,
    action3: 0,
  },
  outcome: {
    gid: 0n,
    cardA: 0,
    cardB: 0,
    winner: zeroAddress,
    outcome: GameOutcome.EMPTY,
    rematchGid: 0n,
  },
};

export type PopulatedKuhnCard = { suit: "red" | "black"; rank: number };
export type KuhnCard = "empty" | "hidden" | PopulatedKuhnCard;

const AllPlayerActions = [
  PlayerAction.EMPTY,
  PlayerAction.CHECK,
  PlayerAction.BET,
  PlayerAction.FOLD,
  PlayerAction.CALL,
] as ActionOption[];

const isBettingAction = (action: ActionOption) => action === PlayerAction.BET || action === PlayerAction.CALL;

type keys = keyof typeof PlayerAction;
export type ActionOption = (typeof PlayerAction)[keys];

export const Expectation = {
  InvalidAction: "invalid-action",
  TakeBet: "take-bet",
  Fold: "fold",
  Showdown: "showdown",
};

const revertInvalidAction = {
  revert: true,
  expect: [Expectation.InvalidAction],
};

type ActionOutcome = {
  revert?: boolean;
  expect: string[];
  branch?: PokerGameBranch;
};

export type PokerGameBranch = {
  actionIndex: 1 | 2 | 3;
  actions: Record<ActionOption, ActionOutcome>;
};

export const getAvailableActions = (a1: ActionOption, a2: ActionOption): ActionOption[] => {
  if (a1 == PlayerAction.EMPTY) {
    return AllPlayerActions.filter(key => {
      return !ExhaustiveGameBranch.actions[key as ActionOption].revert;
    });
  }
  if (a2 == PlayerAction.EMPTY) {
    return AllPlayerActions.filter(key => {
      const leaf = ExhaustiveGameBranch.actions[a1].branch?.actions[key];
      return leaf != null && !leaf.revert;
    });
  }
  return AllPlayerActions.filter(key => {
    const leaf = ExhaustiveGameBranch.actions[a1].branch?.actions[a2].branch?.actions[key];
    return leaf != null && !leaf.revert;
  });
};

export const ExhaustiveGameBranch: PokerGameBranch = {
  // P1
  actionIndex: 1,
  actions: {
    [PlayerAction.EMPTY]: revertInvalidAction,
    [PlayerAction.CHECK]: {
      expect: [],
      branch: {
        // P2
        actionIndex: 2,
        actions: {
          [PlayerAction.EMPTY]: revertInvalidAction,
          [PlayerAction.CHECK]: {
            expect: [Expectation.Showdown],
          },
          [PlayerAction.BET]: {
            expect: [Expectation.TakeBet],
            branch: {
              // P1
              actionIndex: 3,
              actions: {
                [PlayerAction.EMPTY]: revertInvalidAction,
                [PlayerAction.CHECK]: revertInvalidAction,
                [PlayerAction.BET]: revertInvalidAction,
                [PlayerAction.FOLD]: {
                  expect: [Expectation.Fold],
                },
                [PlayerAction.CALL]: {
                  expect: [Expectation.TakeBet, Expectation.Showdown],
                },
              },
            },
          },
          [PlayerAction.FOLD]: revertInvalidAction,
          [PlayerAction.CALL]: revertInvalidAction,
        },
      },
    },
    [PlayerAction.BET]: {
      expect: [Expectation.TakeBet],
      branch: {
        // P2
        actionIndex: 2,
        actions: {
          [PlayerAction.EMPTY]: revertInvalidAction,
          [PlayerAction.CHECK]: revertInvalidAction,
          [PlayerAction.BET]: revertInvalidAction,
          [PlayerAction.FOLD]: {
            expect: [Expectation.Fold],
          },
          [PlayerAction.CALL]: {
            expect: [Expectation.TakeBet, Expectation.Showdown],
          },
        },
      },
    },
    [PlayerAction.FOLD]: revertInvalidAction,
    [PlayerAction.CALL]: revertInvalidAction,
  },
};

// STORE

type GameUserData = {
  address: string;
  isWinner: boolean;
  isLoser: boolean;
  isActive: boolean;
  chips: bigint | undefined;
  actions: { index: 1 | 2 | 3; action: ActionOption }[];
  card: KuhnCard;
  outcome: GameOutcome;
};

const EmptyGameUserData: GameUserData = {
  address: zeroAddress,
  isWinner: false,
  isLoser: false,
  isActive: false,
  chips: undefined,
  actions: [],
  card: "empty",
  outcome: GameOutcome.EMPTY,
};

export const useGameState = create<GameState>(() => ({
  address: null,
  gameState: null,
  playerCard: null,
}));

export const useWriteDisabled = () => {
  const { chain: connectedChain } = useNetwork();
  const { targetNetwork } = useTargetNetwork();

  return !connectedChain || connectedChain?.id !== targetNetwork.id;
};

export const useGameStateUpdater = () => {
  const { address } = useAccount();

  const { data: gameState, refetch } = useFhenixScaffoldContractRead({
    contractName: "FHEKuhnPoker",
    functionName: "getUserGameState",
    args: [address],
  });

  useInterval(refetch, 2000);

  useEffect(() => {
    useGameState.setState({ address, gameState: gameState });
  }, [address, gameState]);
};

export const useGamePotData = () => {
  return useGameState(({ gameState, address }) => {
    if (gameState?.game == null || address == null)
      return { gid: 0n, pot: 0, userChipsInPot: 0, opponentChipsInPot: 0, potOwner: "none" } as const;
    const { game } = gameState;
    let player1Chips = 0;
    let player2Chips = 0;

    const userStarted = address === game.state.startingPlayer;
    if (isBettingAction(game.state.action1)) player1Chips += 1;
    if (isBettingAction(game.state.action2)) player2Chips += 1;
    if (isBettingAction(game.state.action3)) player1Chips += 1;

    const potOwner =
      game.outcome.winner === zeroAddress ? "none" : game.outcome.winner === address ? "player" : "opponent";

    const userAnteChips = game.state.accepted ? 1 : 0;
    const opponentAnteChips = game.state.accepted ? 1 : 0;

    return {
      gid: gameState.game.gid,
      pot: gameState.game.state.pot,
      userChipsInPot: userAnteChips + (userStarted ? player1Chips : player2Chips),
      opponentChipsInPot: opponentAnteChips + (userStarted ? player2Chips : player1Chips),
      potOwner,
    } as const;
  });
};

const jitters = [
  { x: 3, y: -2 },
  { x: -4, y: 6 },
  { x: -1, y: 5 },
  { x: 3, y: -5 },
  { x: -1, y: -3 },
  { x: -2, y: -4 },
  { x: 6, y: 5 },
  { x: -5, y: 3 },
];

// GPT
const fnv1aHash = (str: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24); // FNV prime: 16777619
  }
  return hash >>> 0;
};

// GPT
const generateNumbersFromGID = (gid: bigint): number[] => {
  const hash = fnv1aHash(gid.toString());

  const numbers = [];
  for (let i = 0; i < 4; i++) {
    const num = (hash >> (i * 8)) & 0x07;
    numbers.push(num);
  }

  return numbers;
};

export const useChipJitters = () => {
  return useGameState(state => {
    const gid = state.gameState?.game?.gid ?? 0n;
    const rands = generateNumbersFromGID(gid);
    return rands.map(rand => jitters[rand]);
  });
};

export const useActiveGid = () => {
  return useGameState(state => state.gameState?.game?.gid);
};

export const useUserChips = () => {
  return useGameState(({ gameState }) => gameState?.selfChips ?? 0n);
};

export const useGamePlayerCardUpdater = () => {
  const gid = useActiveGid();

  const { data: playerCard } = useFhenixScaffoldContractRead({
    contractName: "FHEKuhnPoker",
    functionName: "getGameCard",
    args: [InjectFhenixPermission, gid == null || gid === 0n ? undefined : gid],
  });

  useEffect(() => {
    useGameState.setState({ playerCard: playerCard == null ? playerCard : Number(playerCard) });
  }, [playerCard]);
};

export const generateSuitsFromGid = (gid: bigint): ["red" | "black", "red" | "black"] => {
  const num = Number(gid);
  // Convert the number to a 32-bit integer using bitwise OR with 0.
  const hash = num | 0;

  // Crate two booleans based on specific bits from the hashed number.
  const bool1 = (hash & 1) !== 0; // Check the least significant bit.
  const bool2 = (hash & 2) !== 0; // Check the second least significant bit.

  return [bool1 ? "red" : "black", bool2 ? "red" : "black"];
};

export const useOpponentAddress = () => {
  return useGameState(({ gameState: game, address }) => {
    if (address == null || game == null) return zeroAddress;
    return game.game.playerA === address ? game.game.playerB : game.game.playerA;
  });
};

export const useUserPlayerData = () => {
  return useGameState(({ gameState, address, playerCard }): GameUserData & { requiresReveal: boolean } => {
    if (gameState == null || address == null) return { ...EmptyGameUserData, requiresReveal: false };

    const { game, selfChips } = gameState;

    const gameEnded = game.outcome.winner !== zeroAddress;

    return {
      address,
      isWinner: gameEnded && address === game.outcome.winner,
      isLoser: gameEnded && address !== game.outcome.winner,
      isActive: game.gid !== 0n && address === game.state.activePlayer,
      chips: selfChips,
      actions:
        address === game.state.startingPlayer
          ? [
              { index: 1, action: game.state.action1 },
              { index: 3, action: game.state.action3 },
            ]
          : [{ index: 2, action: game.state.action2 }],
      card:
        game == null || game.gid === 0n
          ? "empty"
          : playerCard == null
          ? "hidden"
          : {
              rank: playerCard,
              suit: generateSuitsFromGid(game.gid)[1],
            },
      outcome: game.outcome.outcome,
      requiresReveal: game.state.accepted && playerCard == null,
    };
  });
};

export const useOpponentData = () => {
  return useGameState(({ gameState, address }): GameUserData => {
    if (gameState == null || address == null) return EmptyGameUserData;

    const { game, opponentChips } = gameState;

    const gameEnded = game.outcome.winner !== zeroAddress;
    const userIsPlayerA = game.playerA === address;
    const opponent = userIsPlayerA ? game.playerB : game.playerA;

    return {
      address: opponent,
      isWinner: gameEnded && opponent === game.outcome.winner,
      isLoser: gameEnded && opponent !== game.outcome.winner,
      isActive: game.gid !== 0n && opponent === game.state.activePlayer,
      chips: opponentChips,
      actions:
        opponent === game.state.startingPlayer
          ? [
              { index: 1, action: game.state.action1 },
              { index: 3, action: game.state.action3 },
            ]
          : [{ index: 2, action: game.state.action2 }],
      card:
        game == null || game.gid === 0n
          ? "empty"
          : game.outcome.winner === zeroAddress
          ? "hidden"
          : {
              rank: userIsPlayerA ? game.outcome.cardB : game.outcome.cardA,
              suit: generateSuitsFromGid(game.gid)[0],
            },
      outcome: game.outcome.outcome,
    };
  });
};

export const useGameStep = () => {
  return useGameState(({ gameState }) => {
    if (gameState == null) return "loading";
    const { game } = gameState;
    if (game == null) return "loading";
    if (game.gid === 0n && gameState.selfGid === 0n) return "idle";
    if (game.state.accepted && game.outcome.outcome === GameOutcome.EMPTY) return "in-game";
    return "out-of-game";
  });
};

export const useInGameActionsData = () => {
  return useGameState(({ gameState, address }) => {
    if (gameState == null || address == null) return { isPlayerActive: false, availableActions: [] };

    const { game } = gameState;

    return {
      isPlayerActive: game.state.activePlayer !== zeroAddress && game.state.activePlayer === address,
      availableActions: getAvailableActions(game.state.action1, game.state.action2),
    };
  });
};

export const useOutOfGameActionsData = () => {
  return useGameState(({ gameState, address }) => {
    if (gameState == null || address == null)
      return {
        waitingForNewGameToBeAccepted: false,
        selfRequestedRematch: false,
        opponentHasLeft: false,
        opponentRequestedRematch: false,
        rematchRequestAvailable: false,
        waitingForOpponentToAcceptRematch: false,
        outcomeText: null,
      };

    const { game, rematchGid, selfGid, activeGid, opponentGid } = gameState;

    const gameHasEnded = game?.outcome.outcome !== GameOutcome.EMPTY;
    const waitingForGameAccepted = !game.state.accepted && selfGid !== 0n;
    const rematchExists = rematchGid !== 0n && rematchGid !== activeGid;

    const waitingForNewGameToBeAccepted = waitingForGameAccepted && !rematchExists;

    const opponentHasLeft = opponentGid !== activeGid && opponentGid !== rematchGid;

    const waitingForOpponentToAcceptRematch = waitingForGameAccepted && rematchExists;
    const rematchRequestAvailable = gameHasEnded && !rematchExists && !opponentHasLeft;
    const selfRequestedRematch = rematchExists && selfGid === rematchGid;
    const opponentRequestedRematch = rematchExists && opponentGid === rematchGid;

    const playerIsWinner = game.outcome.winner !== zeroAddress && game.outcome.winner === address;
    const outcome = game.outcome.outcome;

    const outcomeText =
      game.outcome.winner === zeroAddress
        ? null
        : `${playerIsWinner ? "You have" : "Your opponent has"} won ${game.state.pot} chips by ${outcomeToText(
            outcome,
          )}!`;

    return {
      waitingForNewGameToBeAccepted,
      selfRequestedRematch,
      opponentHasLeft,
      opponentRequestedRematch,
      rematchRequestAvailable,
      waitingForOpponentToAcceptRematch,
      outcomeText,
    };
  });
};
