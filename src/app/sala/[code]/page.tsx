"use client";
import { useParams } from "next/navigation";
import { usePlayer } from "@/hooks/usePlayer";
import { useRoom } from "@/hooks/useRoom";
import { LobbyScreen } from "@/components/LobbyScreen";
import { QuestionScreen } from "@/components/QuestionScreen";
import { AnsweringScreen } from "@/components/AnsweringScreen";
import { VotingScreen } from "@/components/VotingScreen";
import { RevealScreen } from "@/components/RevealScreen";
import { ScoreboardScreen } from "@/components/ScoreboardScreen";
import { FinalScreen } from "@/components/FinalScreen";
import { motion } from "framer-motion";

export default function SalaPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const playerId = usePlayer();
  const { room, error, sendAction } = useRoom(code, playerId);

  if (!playerId) return <Loading text="Carregando..." />;
  if (error) return <ErrorScreen message={error} />;
  if (!room) return <Loading text="Conectando à sala..." />;

  const props = { room, playerId, sendAction };

  return (
    <main className="min-h-screen flex flex-col items-center p-4 max-w-lg mx-auto">
      <div className="w-full flex justify-between items-center mb-4">
        <span className="text-gray-500 text-sm">Sala</span>
        <span className="font-mono text-accent font-bold tracking-widest text-lg">{code}</span>
        <span className="text-gray-500 text-sm">R{room.round}/{room.settings.rounds}</span>
      </div>
      <div className="w-full flex-1">
        {room.phase === "lobby" && <LobbyScreen {...props} />}
        {room.phase === "question" && <QuestionScreen {...props} />}
        {room.phase === "answering" && <AnsweringScreen {...props} />}
        {room.phase === "voting" && <VotingScreen {...props} />}
        {room.phase === "reveal" && <RevealScreen {...props} />}
        {room.phase === "scoreboard" && <ScoreboardScreen {...props} />}
        {room.phase === "final" && <FinalScreen {...props} />}
      </div>
    </main>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-gray-400 text-xl"
      >
        {text}
      </motion.p>
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400 text-xl">{message}</p>
      <a href="/" className="text-accent underline">Voltar ao início</a>
    </main>
  );
}
