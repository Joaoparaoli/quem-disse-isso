"use client";
import { motion } from "framer-motion";

interface Props {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  isHost?: boolean;
}

const sizes = { sm: "w-8 h-8 text-sm", md: "w-12 h-12 text-lg", lg: "w-16 h-16 text-2xl" };

export function PlayerAvatar({ name, color, size = "md", showName = false, isHost = false }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white`}
        style={{ backgroundColor: color }}
      >
        {name[0]?.toUpperCase()}
      </motion.div>
      {showName && (
        <span className="text-sm text-gray-300 truncate max-w-[80px]">
          {name}
          {isHost && <span className="ml-1 text-xs text-accent">HOST</span>}
        </span>
      )}
    </div>
  );
}
