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

export function ScoreboardScreen({ room, playerId, sendAction }: Props) {
  const isHost = playerId === room.hostId;
  const { play } = useSound();
  const sorted = [...room.scores]
    .map((s) => ({ ...s, player: room.players.find((p) => p.id === s.playerId) }))
    .sort((a, b) => b.points - a.points);

  useEffect(() => {
    play("levelup");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Placar</h2>

      <div className="space-y-3">
        {sorted.map((s, i) => (
          <motion.div
            key={s.playerId}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="bg-card rounded-xl p-4 flex items-center gap-4"
          >
            <span className="text-2xl font-bold text-gray-500 w-8">{i + 1}</span>
            {s.player && <PlayerAvatar name={s.player.name} color={s.player.color} size="md" />}
            <div className="flex-1">
              <p className="font-bold">{s.player?.name}</p>
              {s.badges.length > 0 && (
                <p className="text-sm text-gray-400">{s.badges.join(" ")}</p>
              )}
            </div>
            <span className="text-accent font-bold text-xl">{s.points}</span>
          </motion.div>
        ))}
      </div>

      {isHost && (
        <button
          onClick={() => sendAction("next-round")}
          className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors"
        >
          {room.round >= room.settings.rounds ? "Ver resultado final" : "Próxima rodada"}
        </button>
      )}
    </div>
  );
}
