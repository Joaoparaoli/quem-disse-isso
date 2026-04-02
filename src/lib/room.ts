import { Room, Player } from "./types";
import { generateCode } from "./code";
import { colorFromName } from "./colors";
import { getRoom, setRoom, roomExists } from "./redis";

export async function createRoom(hostName: string, hostId: string): Promise<Room> {
  let code = generateCode();
  while (await roomExists(code)) {
    code = generateCode();
  }

  const host: Player = {
    id: hostId,
    name: hostName,
    color: colorFromName(hostName),
    isHost: true,
    connected: true,
  };

  const room: Room = {
    code,
    hostId: hostId,
    players: [host],
    phase: "lobby",
    currentQuestionerIndex: 0,
    round: 1,
    settings: { rounds: 5, answerTime: 30, adultMode: false, theme: "free" },
    question: null,
    answers: [],
    votes: [],
    scores: [{ playerId: hostId, points: 0, badges: [] }],
    revealIndex: -1,
    phaseDeadline: null,
  };

  await setRoom(code, room);
  return room;
}

export async function joinRoom(code: string, playerName: string, playerId: string): Promise<Room | null> {
  const room = await getRoom(code) as Room | null;
  if (!room) return null;

  const existing = room.players.find((p) => p.id === playerId);
  if (existing) {
    existing.connected = true;
    existing.name = playerName;
    await setRoom(code, room);
    return room;
  }

  if (room.phase !== "lobby") return null;

  room.players.push({
    id: playerId,
    name: playerName,
    color: colorFromName(playerName),
    isHost: false,
    connected: true,
  });
  room.scores.push({ playerId, points: 0, badges: [] });

  await setRoom(code, room);
  return room;
}

export { getRoom, setRoom };
