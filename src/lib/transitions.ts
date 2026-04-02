import { Room } from "./types";
import { setRoom } from "./redis";

export async function handleDeadline(room: Room): Promise<void> {
  if (room.phase === "answering") {
    const questioner = room.players[room.currentQuestionerIndex];
    for (const player of room.players) {
      if (!player.connected || player.id === questioner?.id) continue;
      if (!room.answers.find((a) => a.playerId === player.id)) {
        room.answers.push({
          id: `auto-${player.id}`,
          playerId: player.id,
          text: "...",
        });
      }
    }
    room.phase = "voting";
    room.phaseDeadline = null;
  } else if (room.phase === "question") {
    room.question = "Pergunta pulada!";
    room.answers = [];
    room.votes = [];
    room.phase = "answering";
    room.phaseDeadline = Date.now() + room.settings.answerTime * 1000;
  }

  await setRoom(room.code, room);
}
