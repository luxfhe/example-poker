import { EyeIcon } from "@heroicons/react/24/outline";
import { zeroAddress } from "viem";

import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useCreateFhenixPermit } from "~~/services/fhenix/store";
import { ellipseAddress, playerActionNumToName } from "./utils";
import { tv } from "tailwind-variants";
import { ActionOption, GameOutcome, KuhnCard, outcomeToText, PlayerAction } from "~~/services/store/game";
import { PlayingCard } from "./PlayingCard";

export const RevealCardButton = () => {
  const createFhenixPermit = useCreateFhenixPermit();
  const { address } = useAccount();
  const { data: deployedContractData } = useDeployedContractInfo("FHEKuhnPoker");

  return (
    <button className="btn absolute" onClick={() => createFhenixPermit(deployedContractData?.address, address)}>
      <EyeIcon className="h-6 w-6" />
    </button>
  );
};

const seatVariants = tv({
  slots: {
    container: "flex h-[260px] w-[112px]  justify-start text-sm relative",
    activeHighlight: "absolute -inset-x-8 -inset-y-6 transition-opacity -z-10 opacity-0",
    playerAddress: "text-sm",
    playerAction: "text-white font-bold text-nowrap w-[160px] text-lg mx-4 tracking-wider my-1",
  },
  variants: {
    position: {
      player: {
        container: "flex-col-reverse items-end mt-60 text-right",
      },
      opponent: {
        container: "flex-col items-start mb-60 text-left",
      },
    },
    active: {
      true: {
        activeHighlight: "opacity-100",
        playerAddress: "font-bold",
      },
    },
    loser: {
      true: {
        container: "opacity-40",
      },
    },
  },
});

export const PlayerIdentifier: React.FC<{ address?: string }> = ({ address }) => {
  return <>{ellipseAddress(address ?? zeroAddress)}</>;
};

export const PlayerChips: React.FC<{ chips?: bigint }> = ({ chips }) => {
  return (
    <div className="text-white m-2 text-sm">
      CHIPS: <code className="text-lg">{chips == null ? "..." : chips.toString()}</code>
    </div>
  );
};

export const PlayerCard: React.FC<{ card: KuhnCard; active: boolean; winner: boolean; children?: React.ReactNode }> = ({
  card,
  active,
  winner,
  children,
}) => {
  return (
    <PlayingCard card={card} gold={winner} wiggle={active || winner}>
      {children}
    </PlayingCard>
  );
};

export const PlayerActions: React.FC<{
  position: "player" | "opponent";
  actions: { index: number; action: ActionOption }[];
  winner: boolean;
  outcome: GameOutcome;
}> = ({ position, actions, winner, outcome }) => {
  const { playerAction } = seatVariants({ position });
  const actionYOffset = position === "player" ? -10 : 10;
  const outcomeText = outcomeToText(outcome);

  return (
    <AnimatePresence>
      {actions
        .filter(({ action }) => action !== PlayerAction.EMPTY)
        .map(({ index, action }) => (
          <motion.div
            initial={{ opacity: 0, y: actionYOffset, rotate: "0deg" }}
            animate={{ opacity: 1, y: 0, rotate: "6deg" }}
            exit={{ opacity: 0, y: actionYOffset, rotate: "0deg" }}
            className={playerAction()}
            key={index}
          >
            {index}. {playerActionNumToName(action)}!
          </motion.div>
        ))}
      {winner && (
        <motion.div
          initial={{ opacity: 0, y: actionYOffset, rotate: "0deg" }}
          animate={{ opacity: 1, y: 0, rotate: "6deg" }}
          exit={{ opacity: 0, y: actionYOffset, rotate: "0deg" }}
          className={`${playerAction()} my-4`}
          key="winner"
        >
          WINNER BY
          <br />
          {outcomeText}!
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const PlayerHighlight: React.FC<{
  active: boolean;
}> = ({ active }) => {
  const { activeHighlight } = seatVariants({ active });

  return (
    <div className={activeHighlight()}>
      <div className="absolute inset-0 rounded-3xl bg-black opacity-10" />
      <div className="absolute inset-0 rounded-3xl border-4 border-white shadow-md animate-pulse" />
    </div>
  );
};

type SeatProps = {
  position: "player" | "opponent";
  loser: boolean;
  active: boolean;
  highlight: React.ReactNode;
  identifier: React.ReactNode;
  chips: React.ReactNode;
  card: React.ReactNode;
  actions: React.ReactNode;
};

export const PlayerSeat: React.FC<SeatProps> = ({
  position,
  loser,
  active,
  highlight,
  identifier,
  card,
  chips,
  actions,
}) => {
  const { container, activeHighlight, playerAddress } = seatVariants({ position, active, loser });

  return (
    <div className={container()}>
      {highlight}
      <div className={activeHighlight()}>
        <div className="absolute inset-0 rounded-3xl bg-black opacity-10" />
        <div className="absolute inset-0 rounded-3xl border-4 border-white shadow-md animate-pulse" />
      </div>
      <div>
        <code className={playerAddress()}>
          {position === "player" ? "YOU" : "OPPONENT"}:
          <br />
          {identifier}
        </code>
      </div>
      <br />
      {chips}
      {card}
      <br />
      <br />
      {actions}
    </div>
  );
};
