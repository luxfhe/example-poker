"use client";

import { playerActionNumToName } from "~~/components/fhenix/utils";
import { Fragment } from "react";
import {
  PlayerActions,
  PlayerCard,
  PlayerChips,
  PlayerHighlight,
  PlayerIdentifier,
  PlayerSeat,
  RevealCardButton,
} from "~~/components/fhenix/PlayerSeat";
import {
  useChipJitters,
  useGamePlayerCardUpdater,
  useGamePotData,
  useGameStateUpdater,
  useGameStep,
  useInGameActionsData,
  useOpponentData,
  useOutOfGameActionsData,
  useUserPlayerData,
  useWriteDisabled,
} from "~~/services/store/game";
import {
  ResignButton,
  ActionButton,
  FindGameButton,
  RematchButton,
  CancelSearchButton,
  DealMeInButton,
} from "~~/components/fhenix/GameActionButtons";
import { motion } from "framer-motion";

const OpponentSeat = () => {
  const { isWinner, isLoser, isActive, address, chips, actions, card, outcome } = useOpponentData();

  return (
    <PlayerSeat
      position="opponent"
      loser={isLoser}
      active={isActive}
      highlight={<PlayerHighlight active={isActive} />}
      identifier={<PlayerIdentifier address={address} />}
      chips={<PlayerChips chips={chips} />}
      card={<PlayerCard card={card} active={isActive} winner={isWinner} />}
      actions={<PlayerActions position="opponent" actions={actions} winner={isWinner} outcome={outcome} />}
    />
  );
};

type ChipProps = {
  position: "player" | "player-pot" | "opponent" | "opponent-pot";
  owner: "player" | "opponent";
};

const chipPositionVariants = ({ x, y }: { x: number; y: number }): Record<ChipProps["position"], any> => ({
  player: { x: 65 + x, y: 168 + y },
  "player-pot": { x: 0 + x, y: 50 + y },
  opponent: { x: -65 + x, y: -168 + y },
  "opponent-pot": { x: 0 + x, y: -50 + y },
});

const Chip: React.FC<{ color: string; position?: string }> = ({ color, position }) => {
  return (
    <div
      className={`w-6 h-6 rounded-full bg-${color} flex items-center justify-center overflow-hidden shadow-md ${position}`}
    >
      <div className="absolute w-4 h-4 rounded-full bg-white flex items-center justify-center">
        <div className={`w-3 h-3 rounded-full bg-${color}`}></div>
      </div>
      <div className="absolute inset-0 border-[1px] border-white rounded-full"></div>
      <div className={`absolute inset-0 border-2 border-${color} rounded-full opacity-50`}></div>
    </div>
  );
};

const PlayableChip: React.FC<{
  owner: "player" | "opponent";
  potOwner: "none" | "player" | "opponent";
  inPot: boolean;
  jitter: { x: number; y: number };
}> = ({ owner, potOwner, inPot, jitter }) => {
  const color = owner === "player" ? "red-500" : "blue-500";
  const position = potOwner == "none" ? `${owner}${inPot ? "-pot" : ""}` : inPot ? potOwner : owner;
  return (
    <motion.div
      animate={position}
      variants={chipPositionVariants(jitter)}
      className="flex items-center justify-center absolute"
    >
      <Chip color={color} />
    </motion.div>
  );
};

const ChipStack: React.FC<{ owner: "player" | "opponent" }> = ({ owner }) => {
  const color = owner === "player" ? "red-500" : "blue-500";

  return (
    <div
      className={`flex absolute ${
        owner === "opponent"
          ? "flex-row translate-x-[-80px] translate-y-[-168px]"
          : "flex-row-reverse  translate-x-[80px] translate-y-[168px]"
      } items-center justify-center gap-10`}
    >
      <div className="flex items-center justify-center relative">
        <Chip color={color} position="absolute translate-y-[0px]" />
        <Chip color={color} position="absolute translate-y-[-4px]" />
        <Chip color={color} position="absolute translate-y-[-8px]" />
        <Chip color={color} position="absolute translate-y-[-12px]" />
        <Chip color={color} position="absolute translate-y-[-16px]" />
      </div>
      <div className="flex items-center justify-center relative">
        <Chip color={color} position="absolute translate-x-[-6px] translate-y-[-5px]" />
        <Chip color={color} position="absolute translate-x-[-4px] translate-y-[8px]" />
        <Chip color={color} position="absolute translate-x-[1px] translate-y-[6px]" />
        <Chip color={color} position="absolute translate-x-[5px] translate-y-[-4px]" />
      </div>
    </div>
  );
};

const GamePot = () => {
  const { gid, pot, potOwner, userChipsInPot, opponentChipsInPot } = useGamePotData();

  const [jitter1, jitter2, jitter3, jitter4] = useChipJitters();

  return (
    <div className="flex flex-col justify-center items-center text-white relative">
      <span className="text-sm">POT:</span>
      <code className="text-4xl">{pot ?? 0}</code>
      <ChipStack owner={"opponent"} />
      <ChipStack owner={"player"} />
      {gid !== 0n && (
        <>
          <PlayableChip owner="opponent" potOwner={potOwner} inPot={opponentChipsInPot > 0} jitter={jitter1} />
          <PlayableChip owner="opponent" potOwner={potOwner} inPot={opponentChipsInPot > 1} jitter={jitter2} />
          <PlayableChip owner="player" potOwner={potOwner} inPot={userChipsInPot > 0} jitter={jitter3} />
          <PlayableChip owner="player" potOwner={potOwner} inPot={userChipsInPot > 1} jitter={jitter4} />
        </>
      )}
    </div>
  );
};

const UserSeat: React.FC = () => {
  const { isWinner, isLoser, isActive, address, chips, actions, card, outcome, requiresReveal } = useUserPlayerData();

  return (
    <PlayerSeat
      position="player"
      loser={isLoser}
      active={isActive}
      highlight={<PlayerHighlight active={isActive} />}
      identifier={<PlayerIdentifier address={address} />}
      chips={<PlayerChips chips={chips} />}
      card={
        <PlayerCard card={card} active={isActive} winner={isWinner}>
          {requiresReveal && <RevealCardButton />}
        </PlayerCard>
      }
      actions={<PlayerActions position="player" actions={actions} winner={isWinner} outcome={outcome} />}
    />
  );
};

const InGameActions = () => {
  const { isPlayerActive, availableActions } = useInGameActionsData();

  return (
    <div className="flex flex-col justify-center items-center gap-4">
      {isPlayerActive && (
        <>
          <div>Its your turn:</div>
          <div className="flex flex-row gap-4 items-center">
            <ResignButton />/
            {availableActions.map((actionId, i) => (
              <Fragment key={actionId}>
                <ActionButton key={actionId} actionId={actionId} />
                {i < availableActions.length - 1 && " or "}
              </Fragment>
            ))}
          </div>
        </>
      )}
      {!isPlayerActive && (
        <>
          <div>
            Waiting for <b>Your Opponent</b> to{" "}
            {availableActions.map((actionId, i) => (
              <Fragment key={actionId}>
                <b>{playerActionNumToName(actionId)}</b>
                {i < availableActions.length - 1 && " or "}
              </Fragment>
            ))}
          </div>
          <ResignButton />
        </>
      )}
    </div>
  );
};

const OutOfGameActions = () => {
  const writeDisabled = useWriteDisabled();

  const {
    waitingForNewGameToBeAccepted,
    selfRequestedRematch,
    opponentHasLeft,
    opponentRequestedRematch,
    rematchRequestAvailable,
    waitingForOpponentToAcceptRematch,
    outcomeText,
  } = useOutOfGameActionsData();

  console.log({
    waitingForNewGameToBeAccepted,
  });

  return (
    <div className="flex flex-col justify-center items-center gap-4">
      {outcomeText != null && <div className="font-bold">{outcomeText}</div>}

      {waitingForNewGameToBeAccepted && (
        <div className="flex flex-row gap-4">
          Searching for another player
          <span className="loading loading-spinner loading-xs" />
        </div>
      )}
      {selfRequestedRematch && (
        <div className="flex flex-row gap-4">
          {opponentHasLeft ? (
            "Opponent has declined your rematch offer"
          ) : (
            <>
              Rematch offered
              <span className="loading loading-spinner loading-xs" />
            </>
          )}
        </div>
      )}
      {opponentRequestedRematch && (
        <div className="flex flex-row gap-4">
          Opponent offered rematch
          <span className="loading loading-spinner loading-xs" />
        </div>
      )}
      {opponentHasLeft && !selfRequestedRematch && (
        <div className="flex flex-row gap-4">Opponent has left the game</div>
      )}

      <div
        className={`flex flex-row gap-4 ${
          writeDisabled &&
          "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
        }`}
        data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
      >
        {!waitingForNewGameToBeAccepted && <FindGameButton disabled={writeDisabled} />}
        {rematchRequestAvailable && <RematchButton disabled={writeDisabled} text="Offer Rematch" />}
        {opponentRequestedRematch && <RematchButton disabled={writeDisabled} text="Accept Rematch" />}
        {waitingForOpponentToAcceptRematch && <CancelSearchButton disabled={writeDisabled} text="Cancel Rematch" />}
        {waitingForNewGameToBeAccepted && <CancelSearchButton disabled={writeDisabled} text="Cancel Search" />}
      </div>

      {waitingForOpponentToAcceptRematch && (
        <div className="flex flex-row gap-4 italic text-sm">
          Searching for a new game will cancel your rematch request and refund your Ante
        </div>
      )}
    </div>
  );
};

const ActionSection: React.FC = () => {
  const writeDisabled = useWriteDisabled();
  const gameStep = useGameStep();

  return (
    <div className="flex flex-col justify-start items-center h-36 gap-4">
      {/* Loading */}
      {gameStep === "loading" && <p>Loading ...</p>}

      {/* Not in a game */}
      {gameStep === "idle" && (
        <div className="flex flex-col justify-center items-center gap-4">
          <span>Welcome to Kuhn Poker, powered by Fhenix!</span>
          <div
            className={`flex flex-row gap-4 ${
              writeDisabled &&
              "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
            }`}
            data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
          >
            <DealMeInButton disabled={writeDisabled} />
            <FindGameButton disabled={writeDisabled} />
          </div>
        </div>
      )}

      {/* In a game */}
      {gameStep === "in-game" && <InGameActions />}

      {/* Game ended */}
      {gameStep === "out-of-game" && <OutOfGameActions />}
    </div>
  );
};

const Home = () => {
  useGameStateUpdater();
  useGamePlayerCardUpdater();

  return (
    <div className="flex gap-12 justify-center items-center flex-col flex-grow py-10">
      <div className="flex flex-row gap-20 justify-center items-center relative">
        <div className="absolute rounded-full bg-green-600 -inset-x-36 inset-y-12 -z-10 shadow-lg" />
        <OpponentSeat />
        <GamePot />
        <UserSeat />
      </div>
      <ActionSection />
    </div>
  );
};

export default Home;
