"use client";
import { motion, AnimatePresence } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function VotingScreen({ room, playerId, sendAction }: Props) {
  const questioner = room.players[room.currentQuestionerIndex];
  const votablePlayers = room.players.filter((p) => p.id !== questioner?.id && p.connected);

  const myVotes = room.votes?.filter((v) => v.voterId === playerId) || [];
  const votedAnswerIds = new Set(myVotes.map((v) => v.answerId));

  const firstUnvotedIdx = room.answers.findIndex((a) => !votedAnswerIds.has(a.id));
  const activeIdx = firstUnvotedIdx >= 0 ? firstUnvotedIdx : 0;
  const activeAnswer = room.answers[activeIdx];

  const allVoted = room.answers.every((a) => votedAnswerIds.has(a.id));

  async function handleVote(guessedPlayerId: string) {
    if (!activeAnswer) return;
    await sendAction("submit-vote", {
      answerId: activeAnswer.id,
      guessedPlayerId,
    });
  }

  if (allVoted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-5xl"
        >
          ⏳
        </motion.div>
        <p className="text-xl text-gray-300">Aguardando os outros votarem...</p>
      </div>
    );
  }

  if (!activeAnswer) return null;

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-gray-400">
        Resposta {activeIdx + 1} de {room.answers.length}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeAnswer.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-card rounded-2xl p-6 min-h-[120px] flex items-center justify-center"
        >
          <p className="text-2xl font-bold text-center leading-relaxed">
            &ldquo;{activeAnswer.text}&rdquo;
          </p>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-gray-400">Quem escreveu isso?</p>

      <div className="grid grid-cols-2 gap-3">
        {votablePlayers.map((p) => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleVote(p.id)}
            className="bg-card border border-gray-700 hover:border-accent rounded-xl p-4 flex items-center gap-3 transition-colors"
          >
            <PlayerAvatar name={p.name} color={p.color} size="sm" />
            <span className="font-semibold truncate">{p.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
