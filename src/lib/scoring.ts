import { Room } from "./types";

export function calculateRoundScores(room: Room): Room {
  const questioner = room.players[room.currentQuestionerIndex];

  for (const answer of room.answers) {
    const authorId = answer.playerId;
    const votesForThisAnswer = room.votes.filter((v) => v.answerId === answer.id);
    const connectedVoters = room.players.filter(
      (p) => p.connected && p.id !== questioner?.id && p.id !== authorId
    );

    for (const vote of votesForThisAnswer) {
      if (vote.guessedPlayerId === authorId) {
        const voterScore = room.scores.find((s) => s.playerId === vote.voterId);
        if (voterScore) voterScore.points += 100;
      }
    }

    const guessedCorrectly = votesForThisAnswer.filter(
      (v) => v.guessedPlayerId === authorId
    ).length;

    const authorScore = room.scores.find((s) => s.playerId === authorId);
    if (!authorScore) continue;

    if (guessedCorrectly === 0) {
      authorScore.points += 50;
    }

    if (guessedCorrectly === connectedVoters.length && connectedVoters.length > 0) {
      if (!authorScore.badges.includes("Transparente")) {
        authorScore.badges.push("Transparente");
      }
    }
  }

  return room;
}

export function calculateFinalBadges(room: Room): Room {
  for (const score of room.scores) {
    score.badges = [];
  }

  const sorted = [...room.scores].sort((a, b) => b.points - a.points);
  if (sorted[0]) {
    const best = room.scores.find((s) => s.playerId === sorted[0].playerId);
    if (best && !best.badges.includes("Detetive")) best.badges.push("Detetive");
  }

  return room;
}
