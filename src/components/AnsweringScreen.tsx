"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { Timer } from "./Timer";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function AnsweringScreen({ room, playerId, sendAction }: Props) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(!!room.myAnswer);
  const questioner = room.players[room.currentQuestionerIndex];
  const isQuestioner = playerId === questioner?.id;

  async function handleSubmit() {
    if (!answer.trim()) return;
    await sendAction("submit-answer", { answer: answer.trim() });
    setSubmitted(true);
  }

  if (isQuestioner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl p-6 text-center"
        >
          <p className="text-2xl font-bold mb-4">{room.question}</p>
          <p className="text-gray-400">Aguardando respostas...</p>
          <p className="text-accent font-bold text-xl mt-2">{room.answerCount}/{room.totalPlayers}</p>
        </motion.div>
        <Timer deadline={room.phaseDeadline} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl">
          ✅
        </motion.div>
        <p className="text-xl text-gray-300">Resposta enviada!</p>
        <p className="text-accent font-bold">{room.answerCount}/{room.totalPlayers} responderam</p>
        <Timer deadline={room.phaseDeadline} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-6 text-center"
      >
        <p className="text-2xl font-bold">{room.question}</p>
      </motion.div>

      <Timer deadline={room.phaseDeadline} />

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Sua resposta anônima..."
        rows={3}
        maxLength={200}
        className="text-xl"
      />

      <button
        onClick={handleSubmit}
        disabled={!answer.trim()}
        className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors disabled:opacity-50"
      >
        Enviar resposta
      </button>

      <p className="text-center text-sm text-gray-500">{room.answerCount}/{room.totalPlayers} responderam</p>
    </div>
  );
}
