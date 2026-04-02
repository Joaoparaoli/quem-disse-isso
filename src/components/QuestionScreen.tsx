"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { Timer } from "./Timer";
import { QUESTIONS } from "@/lib/questions";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function QuestionScreen({ room, playerId, sendAction }: Props) {
  const [question, setQuestion] = useState("");
  const questioner = room.players[room.currentQuestionerIndex];
  const isQuestioner = playerId === questioner?.id;
  const suggestions = QUESTIONS[room.settings.theme] || QUESTIONS.free;

  function handleSubmit() {
    if (!question.trim()) return;
    sendAction("submit-question", { question: question.trim() });
  }

  if (!isQuestioner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-6xl"
        >
          🤔
        </motion.div>
        <p className="text-xl text-gray-300">
          <span className="font-bold text-white">{questioner?.name}</span> está pensando numa pergunta...
        </p>
        <Timer deadline={room.phaseDeadline} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Escreva sua pergunta</h2>
      <Timer deadline={room.phaseDeadline} />

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Sua pergunta..."
        rows={3}
        maxLength={200}
        className="text-xl"
      />

      <button
        onClick={handleSubmit}
        disabled={!question.trim()}
        className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors disabled:opacity-50"
      >
        Enviar pergunta
      </button>

      <div className="space-y-2">
        <p className="text-sm text-gray-500">Sugestões:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 4).map((s, i) => (
            <button
              key={i}
              onClick={() => setQuestion(s)}
              className="text-sm bg-card border border-gray-700 text-gray-300 px-3 py-2 rounded-lg hover:border-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
