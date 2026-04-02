"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/hooks/usePlayer";
import { motion } from "framer-motion";

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const playerId = usePlayer();

  async function handleCreate() {
    if (!name.trim() || !playerId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim(), playerId }),
      });
      const data = await res.json();
      if (data.code) {
        localStorage.setItem("qdi-player-name", name.trim());
        router.push(`/sala/${data.code}`);
      } else {
        setError(data.error || "Erro ao criar sala");
      }
    } catch {
      setError("Erro de conexão");
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!name.trim() || !roomCode.trim() || !playerId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/room/${roomCode.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim(), playerId }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("qdi-player-name", name.trim());
        router.push(`/sala/${roomCode.toUpperCase()}`);
      } else {
        setError(data.error || "Sala não encontrada");
      }
    } catch {
      setError("Erro de conexão");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div>
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-accent">Quem</span> Disse Isso?
          </h1>
          <p className="text-gray-400 text-lg">Party game de anonimato e dedução</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="text-center text-xl"
          />

          <div className="space-y-3">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 px-6 rounded-xl text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Criando..." : "Criar Sala"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-gray-500 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Código da sala"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-xl uppercase tracking-widest flex-1"
              />
              <button
                onClick={handleJoin}
                disabled={!name.trim() || !roomCode.trim() || loading}
                className="bg-card hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
              >
                Entrar
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm"
            >
              {error}
            </motion.p>
          )}
        </div>
      </motion.div>
    </main>
  );
}
