import { NextRequest, NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/room";
import { Room } from "@/lib/types";
import { calculateRoundScores, calculateFinalBadges } from "@/lib/scoring";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const { action, playerId, data } = await req.json();
  const room = await getRoom(params.code.toUpperCase()) as Room | null;

  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }

  switch (action) {
    case "start": {
      if (playerId !== room.hostId) return NextResponse.json({ error: "Só o host pode iniciar" }, { status: 403 });
      if (room.players.filter((p) => p.connected).length < 3) {
        return NextResponse.json({ error: "Mínimo 3 jogadores" }, { status: 400 });
      }
      if (data?.settings) {
        room.settings = { ...room.settings, ...data.settings };
      }
      room.phase = "question";
      room.currentQuestionerIndex = 0;
      room.phaseDeadline = Date.now() + 30000;
      break;
    }

    case "submit-question": {
      const questioner = room.players[room.currentQuestionerIndex];
      if (playerId !== questioner?.id) return NextResponse.json({ error: "Não é sua vez" }, { status: 403 });
      room.question = data.question;
      room.answers = [];
      room.votes = [];
      room.phase = "answering";
      room.phaseDeadline = Date.now() + room.settings.answerTime * 1000;
      break;
    }

    case "submit-answer": {
      if (room.phase !== "answering") return NextResponse.json({ error: "Fase errada" }, { status: 400 });
      const questioner = room.players[room.currentQuestionerIndex];
      if (playerId === questioner?.id) return NextResponse.json({ error: "Quem pergunta não responde" }, { status: 403 });
      if (room.answers.find((a) => a.playerId === playerId)) {
        return NextResponse.json({ error: "Já respondeu" }, { status: 400 });
      }
      room.answers.push({ id: uuidv4(), playerId, text: data.answer });

      const expectedAnswers = room.players.filter(
        (p) => p.connected && p.id !== questioner?.id
      ).length;
      if (room.answers.length >= expectedAnswers) {
        room.phase = "voting";
        room.phaseDeadline = null;
      }
      break;
    }

    case "submit-vote": {
      if (room.phase !== "voting") return NextResponse.json({ error: "Fase errada" }, { status: 400 });
      if (room.votes.find((v) => v.voterId === playerId && v.answerId === data.answerId)) {
        return NextResponse.json({ error: "Já votou nessa resposta" }, { status: 400 });
      }
      room.votes.push({
        voterId: playerId,
        answerId: data.answerId,
        guessedPlayerId: data.guessedPlayerId,
      });

      const questioner = room.players[room.currentQuestionerIndex];
      const voters = room.players.filter((p) => p.connected && p.id !== questioner?.id);
      const totalExpectedVotes = voters.length * room.answers.length;
      if (room.votes.length >= totalExpectedVotes) {
        calculateRoundScores(room);
        room.revealIndex = 0;
        room.phase = "reveal";
        room.phaseDeadline = null;
      }
      break;
    }

    case "next-reveal": {
      if (playerId !== room.hostId) return NextResponse.json({ error: "Só o host" }, { status: 403 });
      if (room.revealIndex < room.answers.length - 1) {
        room.revealIndex++;
      } else {
        room.phase = "scoreboard";
      }
      break;
    }

    case "next-round": {
      if (playerId !== room.hostId) return NextResponse.json({ error: "Só o host" }, { status: 403 });
      if (room.round >= room.settings.rounds) {
        calculateFinalBadges(room);
        room.phase = "final";
      } else {
        room.round++;
        room.currentQuestionerIndex = (room.currentQuestionerIndex + 1) % room.players.length;
        room.question = null;
        room.answers = [];
        room.votes = [];
        room.revealIndex = -1;
        room.phase = "question";
        room.phaseDeadline = Date.now() + 30000;
      }
      break;
    }

    case "play-again": {
      room.phase = "lobby";
      room.round = 1;
      room.currentQuestionerIndex = 0;
      room.question = null;
      room.answers = [];
      room.votes = [];
      room.revealIndex = -1;
      room.phaseDeadline = null;
      for (const s of room.scores) {
        s.points = 0;
        s.badges = [];
      }
      break;
    }

    default:
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  await setRoom(room.code, room);
  return NextResponse.json({ success: true });
}
