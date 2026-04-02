"use client";
import { useState, useEffect, useCallback } from "react";
import { SanitizedRoom } from "@/lib/types";

export function useRoom(code: string, playerId: string) {
  const [room, setRoom] = useState<SanitizedRoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!code || !playerId) return;
    try {
      const res = await fetch(`/api/room/${code}?playerId=${playerId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      const data = await res.json();
      setRoom(data);
      setError(null);
    } catch {
      setError("Erro de conexão");
    }
  }, [code, playerId]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 1500);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const sendAction = useCallback(
    async (action: string, data?: Record<string, unknown>) => {
      if (!code || !playerId) return;
      const res = await fetch(`/api/room/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, playerId, data }),
      });
      if (res.ok) {
        await fetchRoom();
      }
      return res;
    },
    [code, playerId, fetchRoom]
  );

  return { room, error, sendAction, refetch: fetchRoom };
}
