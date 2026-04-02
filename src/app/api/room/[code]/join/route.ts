import { NextRequest, NextResponse } from "next/server";
import { joinRoom } from "@/lib/room";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const { playerName, playerId } = await req.json();

  if (!playerName || !playerId) {
    return NextResponse.json({ error: "Nome e ID obrigatórios" }, { status: 400 });
  }

  const room = await joinRoom(params.code.toUpperCase(), playerName.trim(), playerId);
  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada ou jogo já começou" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
