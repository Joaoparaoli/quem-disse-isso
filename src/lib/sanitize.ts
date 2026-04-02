import { Room, SanitizedRoom } from "./types";

export function sanitizeRoom(room: Room, playerId: string): SanitizedRoom {
  const connectedPlayers = room.players.filter((p) => p.connected);
  const questioner = room.players[room.currentQuestionerIndex];

  const base: SanitizedRoom = {
    code: room.code,
    hostId: room.hostId,
    players: room.players,
    phase: room.phase,
    currentQuestionerIndex: room.currentQuestionerIndex,
    round: room.round,
    settings: room.settings,
    question: room.question,
    answerCount: room.answers.length,
    totalPlayers: connectedPlayers.filter((p) => p.id !== questioner?.id).length,
    answers: [],
    votes: [],
    scores: room.scores,
    revealIndex: room.revealIndex,
    phaseDeadline: room.phaseDeadline,
    myAnswer: null,
    revealedAnswer: null,
    revealedVotes: [],
  };

  switch (room.phase) {
    case "answering": {
      const myAns = room.answers.find((a) => a.playerId === playerId);
      base.myAnswer = myAns?.text ?? null;
      break;
    }
    case "voting": {
      base.answers = room.answers.map((a) => ({ id: a.id, text: a.text }));
      break;
    }
    case "reveal":
    case "scoreboard": {
      base.answers = room.answers.map((a) => ({ id: a.id, text: a.text }));
      if (room.revealIndex >= 0 && room.revealIndex < room.answers.length) {
        const answer = room.answers[room.revealIndex];
        const author = room.players.find((p) => p.id === answer.playerId);
        base.revealedAnswer = {
          id: answer.id,
          text: answer.text,
          playerId: answer.playerId,
          playerName: author?.name ?? "???",
        };
        base.revealedVotes = room.votes.filter((v) => v.answerId === answer.id);
      }
      break;
    }
    case "final": {
      base.answers = room.answers.map((a) => ({ id: a.id, text: a.text }));
      base.votes = room.votes;
      break;
    }
  }

  return base;
}
