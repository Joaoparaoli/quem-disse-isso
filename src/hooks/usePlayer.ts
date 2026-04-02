"use client";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export function usePlayer() {
  const [playerId, setPlayerId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem("qdi-player-id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("qdi-player-id", id);
    }
    setPlayerId(id);
  }, []);

  return playerId;
}
