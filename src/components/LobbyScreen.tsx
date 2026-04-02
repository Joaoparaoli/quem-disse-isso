"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function LobbyScreen({ room, playerId, sendAction }: Props) {
  const isHost = playerId === room.hostId;
  const [rounds, setRounds] = useState(room.settings.rounds);
  const [answerTime, setAnswerTime] = useState(room.settings.answerTime);
  const [theme, setTheme] = useState(room.settings.theme);

  function handleStart() {
    sendAction("start", { settings: { rounds, answerTime, theme } });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-gray-400"
        >
          Aguardando jogadores...
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AnimatePresence>
          {room.players.map((p) => (
            <motion.div
              key={p.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center"
            >
              <PlayerAvatar name={p.name} color={p.color} size="lg" showName isHost={p.isHost} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isHost && (
        <div className="space-y-4 bg-card rounded-xl p-4">
          <h3 className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Configurações</h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Rodadas</span>
            <div className="flex gap-2">
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setRounds(n)}
                  className={`px-3 py-1 rounded-lg text-sm font-bold ${rounds === n ? "bg-accent text-white" : "bg-gray-700 text-gray-400"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Tempo de resposta</span>
            <div className="flex gap-2">
              {[15, 30, 60].map((n) => (
                <button
                  key={n}
                  onClick={() => setAnswerTime(n)}
                  className={`px-3 py-1 rounded-lg text-sm font-bold ${answerTime === n ? "bg-accent text-white" : "bg-gray-700 text-gray-400"}`}
                >
                  {n}s
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Tema</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as typeof theme)}
              className="bg-gray-700 text-white rounded-lg px-3 py-1 text-sm border-none"
            >
              <option value="free">Livre</option>
              <option value="confessions">Confissões</option>
              <option value="dilemmas">Dilemas</option>
              <option value="most-likely">Quem mais provavelmente</option>
            </select>
          </div>

          <button
            onClick={handleStart}
            disabled={room.players.filter((p) => p.connected).length < 3}
            className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            Começar Jogo
          </button>
          {room.players.filter((p) => p.connected).length < 3 && (
            <p className="text-center text-sm text-gray-500">Mínimo 3 jogadores</p>
          )}
        </div>
      )}
    </div>
  );
}
