import React from "react";
import { tv } from "tailwind-variants";
import { cardRankSymbol } from "./utils";
import { KuhnCard, PopulatedKuhnCard } from "~~/services/store/game";

const playingCard = tv({
  base: "w-24 h-36 min-h-[9rem] rounded-md flex items-center justify-center relative",
  variants: {
    color: {
      empty: "bg-gradient-to-br from-green-700 to-green-700 opacity-50",
      gold: "bg-gradient-to-br from-amber-300 to-yellow-500 shadow-md",
      blue: "bg-gradient-to-br from-sky-600 to-blue-800 shadow-md",
      white: "bg-gradient-to-br from-slate-50 to-gray-100 shadow-md",
    },
    wiggle: {
      true: "animate-wiggle",
    },
  },
});

const Card = ({
  children,
  card,
  wiggle = false,
  gold = false,
}: {
  children: React.ReactNode;
  card: KuhnCard;
  wiggle?: boolean;
  gold?: boolean;
}) => (
  <div
    className={playingCard({
      color: card === "empty" ? "empty" : gold ? "gold" : card === "hidden" ? "blue" : "white",
      wiggle: wiggle,
    })}
  >
    {children}
  </div>
);

const CardFace = ({ card: { suit, rank } }: { card: PopulatedKuhnCard }) => {
  const hexColor = suit === "red" ? "#EF4444" : "#1F2937";
  return (
    <svg className="w-full h-full" viewBox="0 0 100 150">
      <text x="10" y="25" fontSize="16" fill={hexColor} className="font-bold">
        {cardRankSymbol(rank)}
      </text>
      <text x="75" y="18" fontSize="16" fill={hexColor} className="font-bold">
        —
      </text>
      {(rank === 2 || rank === 1) && (
        <text x="75" y="23" fontSize="16" fill={hexColor} className="font-bold">
          —
        </text>
      )}
      {rank === 2 && (
        <text x="75" y="28" fontSize="16" fill={hexColor} className="font-bold">
          —
        </text>
      )}
      <text x="90" y="160" fontSize="16" fill={hexColor} className="font-bold" transform="rotate(180 90 145)">
        {rank}
      </text>
      {rank === 2 && (
        <g fill={hexColor}>
          <rect x="35" y="45" width="30" height="60" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="60" r="8" />
          <path d="M42 85 H58 M50 77 V93" strokeWidth="2" />
        </g>
      )}
      {rank === 1 && (
        <g fill={hexColor}>
          <circle cx="50" cy="65" r="15" fill={hexColor} />
          <path d="M42 90 Q50 100 58 90" strokeWidth="2" fill="none" />
        </g>
      )}
      {rank === 0 && (
        <g fill={hexColor}>
          <rect x="45" y="50" width="10" height="50" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="65" r="8" />
        </g>
      )}
    </svg>
  );
};

const CardBack = () => (
  <div className="w-full h-full rounded-md overflow-hidden">
    <svg className="w-full h-full" viewBox="0 0 100 150">
      <defs>
        <pattern id="plusPattern" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(15)">
          <path d="M10 5 V15 M5 10 H15" stroke="#4B8BF5" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100" height="150" fill="#1D4ED8" />
      <rect width="100" height="150" fill="url(#plusPattern)" />
      <rect width="100" height="150" rx="8" ry="8" fill="none" stroke="white" strokeWidth="8" />
    </svg>
  </div>
);

export const PlayingCard: React.FC<{
  card: KuhnCard;
  gold?: boolean;
  wiggle?: boolean;
  children?: React.ReactNode;
}> = ({ card, wiggle = false, gold = false, children }) => {
  return (
    <div className="w-24 min-w-[6rem] h-36 min-h-[9rem] rounded-md flex items-center justify-center m-2 relative">
      <div className="w-40 h-40 rounded-full absolute bg-gradient-to-br from-green-700 to-green-700 opacity-50" />
      {card != "empty" && (
        <Card wiggle={wiggle} gold={gold} card={card}>
          {card === "hidden" ? <CardBack /> : <CardFace card={card} />}
          {children}
        </Card>
      )}
    </div>
  );
};
