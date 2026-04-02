"use client";
import { motion } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { useSound } from "@/hooks/useSound";
import { useEffect } from "react";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

const BADGE_MAP: Record<string, { emoji: string; label: string }> = {
  Detetive: { emoji: "🔍", label: "Detetive" },
  "Mestre do Anonimato": { emoji: "🕵️", label: "Mestre do Anonimato" },
  Transparente: { emoji: "😂", label: "Transparente" },
  Criativo: { emoji: "🎭", label: "Criativo" },
};

export function FinalScreen({ room, playerId, sendAction }: Props) {
  const { play } = useSound();
  const sorted = [...room.scores]
    .map((s) => ({ ...s, player: room.players.find((p) => p.id === s.playerId) }))
    .sort((a, b) => b.points - a.points);

  const podium = sorted.slice(0, 3);

  useEffect(() => {
    play("fanfare");
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">Resultado Final!</h2>

      <div className="flex items-end justify-center gap-4 h-64">
        {podium[1] && <PodiumPlace player={podium[1]} place={2} height="h-32" />}
        {podium[0] && <PodiumPlace player={podium[0]} place={1} height="h-44" />}
        {podium[2] && <PodiumPlace player={podium[2]} place={3} height="h-24" />}
      </div>

      <div className="space-y-3">
        {sorted.map((s, i) => (
          <motion.div
            key={s.playerId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 + i * 0.1 }}
            className="bg-card rounded-xl p-3 flex items-center gap-3"
          >
            <span className="text-lg font-bold text-gray-500 w-6">{i + 1}</span>
            {s.player && <PlayerAvatar name={s.player.name} color={s.player.color} size="sm" />}
            <span className="flex-1 font-semibold">{s.player?.name}</span>
            <span className="text-accent font-bold">{s.points}</span>
            <span className="text-sm">
              {s.badges.map((b) => BADGE_MAP[b]?.emoji || "").join(" ")}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="space-y-2">
        {sorted
          .filter((s) => s.badges.length > 0)
          .map((s) =>
            s.badges.map((b) => (
              <motion.div
                key={`${s.playerId}-${b}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-lg p-3 flex items-center gap-2 text-sm"
              >
                <span className="text-xl">{BADGE_MAP[b]?.emoji}</span>
                <span className="text-gray-400">{BADGE_MAP[b]?.label}:</span>
                <span className="font-bold">{s.player?.name}</span>
              </motion.div>
            ))
          )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => sendAction("play-again")}
          className="flex-1 bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          Jogar de novo
        </button>
        <a
          href="/"
          className="flex-1 bg-card border border-gray-700 hover:bg-gray-700 text-white font-bold py-4 rounded-xl text-lg transition-colors text-center"
        >
          Nova sala
        </a>
      </div>
    </div>
  );
}

function PodiumPlace({
  player,
  place,
  height,
}: {
  player: { points: number; player?: { name: string; color: string } };
  place: number;
  height: string;
}) {
  const medals = ["", "🥇", "🥈", "🥉"];
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={{ delay: 0.3 * place, type: "spring" }}
      className="flex flex-col items-center"
    >
      {player.player && (
        <PlayerAvatar name={player.player.name} color={player.player.color} size="lg" />
      )}
      <span className="text-2xl mt-1">{medals[place]}</span>
      <span className="font-bold text-sm mt-1">{player.player?.name}</span>
      <div className={`${height} w-20 bg-accent/30 border-t-2 border-accent rounded-t-lg mt-2 flex items-start justify-center pt-2`}>
        <span className="text-accent font-bold">{player.points}</span>
      </div>
    </motion.div>
  );
}
