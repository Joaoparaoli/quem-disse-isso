import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ROOM_TTL = 7200;

export async function getRoom(code: string) {
  const data = await redis.get<string>(`room:${code}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function setRoom(code: string, room: object) {
  await redis.set(`room:${code}`, JSON.stringify(room), { ex: ROOM_TTL });
}

export async function roomExists(code: string) {
  return (await redis.exists(`room:${code}`)) === 1;
}
