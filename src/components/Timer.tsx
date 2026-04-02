"use client";
import { useState, useEffect } from "react";

interface Props {
  deadline: number | null;
  onExpired?: () => void;
}

export function Timer({ deadline, onExpired }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);

  useEffect(() => {
    if (!deadline) return;

    const initial = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    setTotalSeconds(initial);

    function tick() {
      const left = Math.max(0, Math.ceil((deadline! - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && onExpired) onExpired();
    }

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [deadline, onExpired]);

  if (!deadline) return null;

  const percent = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const color = secondsLeft > 10 ? "bg-green-500" : secondsLeft > 5 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-sm text-gray-400">
        <span>{secondsLeft}s</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
