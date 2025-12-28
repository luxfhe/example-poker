import { GameInfo, PlayerAction, ActionOption } from "~~/services/store/game";

export const getGameActionIndex = (game?: GameInfo) => {
  if (game == null) return 1;
  if (game.state.action1 === PlayerAction.EMPTY) return 1;
  if (game.state.action2 === PlayerAction.EMPTY) return 2;
  return 3;
};

export const cardRankSymbol = (rank: number) => {
  switch (rank) {
    case 0:
      return "J";
    case 1:
      return "Q";
    case 2:
      return "K";
    default:
      return "X";
  }
};

export const cardSymbol = (card?: number) => {
  switch (card) {
    case 0:
      return { symbol: "J", hidden: false } as const;
    case 1:
      return { symbol: "Q", hidden: false } as const;
    case 2:
      return { symbol: "K", hidden: false } as const;
    default:
    case undefined:
      return { symbol: undefined, hidden: true };
  }
};

export const displayGameId = (gid: bigint) => {
  return `GAME # ${`00${gid.toString()}`.slice(-3)}`;
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

export const ellipseAddress = (address: string) => {
  return address.slice(0, 6) + "..." + address.slice(-4);
};

export const playerActionNumToName = (n: ActionOption) => {
  switch (n) {
    case 0:
      return "EMPTY";
    case 1:
      return "CHECK";
    case 2:
      return "BET";
    case 3:
      return "FOLD";
    case 4:
      return "CALL";
  }
};

export const playerActionNameToNum = (n: string) => {
  switch (n) {
    case "EMPTY":
      return 0;
    case "CHECK":
      return 1;
    case "BET":
      return 2;
    case "FOLD":
      return 3;
    case "CALL":
      return 4;
    default:
      return -1;
  }
};
