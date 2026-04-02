import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/room";

export async function POST(req: NextRequest) {
  const { playerName, playerId } = await req.json();

  if (!playerName || !playerId) {
    return NextResponse.json({ error: "Nome e ID obrigatórios" }, { status: 400 });
  }

  const room = await createRoom(playerName.trim(), playerId);
  return NextResponse.json({ code: room.code });
}
