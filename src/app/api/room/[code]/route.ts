import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/room";
import { sanitizeRoom } from "@/lib/sanitize";
import { handleDeadline } from "@/lib/transitions";
import { Room } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const playerId = req.nextUrl.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId obrigatório" }, { status: 400 });
  }

  const room = await getRoom(params.code.toUpperCase()) as Room | null;
  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }

  if (room.phaseDeadline && Date.now() > room.phaseDeadline) {
    await handleDeadline(room);
  }

  return NextResponse.json(sanitizeRoom(room, playerId));
}
