"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { useSound } from "@/hooks/useSound";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function RevealScreen({ room, playerId, sendAction }: Props) {
  const [showAuthor, setShowAuthor] = useState(false);
  const [prevRevealIndex, setPrevRevealIndex] = useState(-1);
  const isHost = playerId === room.hostId;
  const { play } = useSound();
  const revealed = room.revealedAnswer;

  useEffect(() => {
    if (room.revealIndex !== prevRevealIndex) {
      setShowAuthor(false);
      setPrevRevealIndex(room.revealIndex);
      play("drumroll");
      const timer = setTimeout(() => {
        setShowAuthor(true);
        const myVote = room.revealedVotes.find((v) => v.voterId === playerId);
        if (myVote && revealed && myVote.guessedPlayerId === revealed.playerId) {
          play("fanfare");
        } else {
          play("trombone");
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.revealIndex]);

  if (!revealed) return null;

  const myVote = room.revealedVotes.find((v) => v.voterId === playerId);
  const iCorrect = myVote && myVote.guessedPlayerId === revealed.playerId;

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-gray-400">
        Revelação {room.revealIndex + 1} de {room.answers.length}
      </div>

      <motion.div
        key={room.revealIndex}
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-card rounded-2xl p-6 min-h-[120px] flex items-center justify-center"
      >
        <p className="text-2xl font-bold text-center">&ldquo;{revealed.text}&rdquo;</p>
      </motion.div>

      <div className="space-y-2">
        {room.revealedVotes.map((v) => {
          const voter = room.players.find((p) => p.id === v.voterId);
          const guessed = room.players.find((p) => p.id === v.guessedPlayerId);
          return (
            <motion.div
              key={v.voterId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-gray-400 text-sm"
            >
              <span className="text-white font-semibold">{voter?.name}</span> votou em{" "}
              <span className="text-accent-light font-semibold">{guessed?.name}</span>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showAuthor && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 8, stiffness: 100 }}
            className="text-center space-y-3"
          >
            <p className="text-gray-400">Quem escreveu foi...</p>
            <p className="text-4xl font-bold text-accent">{revealed.playerName}</p>
            {myVote && (
              <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl">
                {iCorrect ? "🎉 +100" : "😅"}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isHost && showAuthor && (
        <button
          onClick={() => sendAction("next-reveal")}
          className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors"
        >
          {room.revealIndex < room.answers.length - 1 ? "Próxima revelação" : "Ver placar"}
        </button>
      )}
    </div>
  );
}
