# Quem Disse Isso? — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time multiplayer party game where players answer questions anonymously and vote on who wrote what.

**Architecture:** Next.js 14 App Router with API routes for game state management, Upstash Redis as ephemeral key-value store, client-side polling at 1.5s intervals. Single page `/sala/[code]` renders the correct phase component based on server state.

**Tech Stack:** Next.js 14, Tailwind CSS, Framer Motion, Howler.js, Upstash Redis, Vercel

---

## File Structure

```
quem-disse-isso/
  src/
    app/
      layout.tsx                  # Root layout (dark theme, fonts)
      page.tsx                    # Home — create/join room
      sala/[code]/page.tsx        # Game page — renders phase component
      api/
        room/
          route.ts                # POST: create room
          [code]/
            route.ts              # GET: poll room state (sanitized)
            join/route.ts         # POST: join room
            action/route.ts       # POST: game actions
    lib/
      types.ts                    # All shared TypeScript types
      redis.ts                    # Upstash Redis client
      room.ts                     # Room CRUD operations
      sanitize.ts                 # Sanitize room state per phase/player
      scoring.ts                  # Calculate scores and badges
      questions.ts                # Suggested questions by theme
      colors.ts                   # Generate avatar color from name
      code.ts                     # Room code generation
    hooks/
      useRoom.ts                  # Polling hook — fetches room state every 1.5s
      useSound.ts                 # Howler.js wrapper hook
      usePlayer.ts                # Player ID from localStorage
    components/
      PlayerAvatar.tsx            # Colored circle + initial
      Timer.tsx                   # Countdown bar (green→yellow→red)
      LobbyScreen.tsx             # Phase: lobby
      QuestionScreen.tsx          # Phase: question (host writes)
      AnsweringScreen.tsx         # Phase: answering (all respond)
      VotingScreen.tsx            # Phase: voting
      RevealScreen.tsx            # Phase: reveal + confetti/trombone
      ScoreboardScreen.tsx        # Phase: scoreboard between rounds
      FinalScreen.tsx             # Phase: final podium + badges
  public/
    sounds/                       # .mp3 files (join, whoosh, tick, drumroll, fanfare, trombone, levelup)
  tailwind.config.ts
  .env.local                      # UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`, `.gitignore`

- [ ] **Step 1: Create Next.js project with dependencies**

```bash
cd C:\Users\jp881\Desktop\quem-disse-isso
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-git
```

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @upstash/redis framer-motion howler uuid
npm install -D @types/howler @types/uuid
```

- [ ] **Step 3: Configure Tailwind with custom theme**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f0f1a",
        card: "#1e1e2e",
        accent: "#7c3aed",
        "accent-light": "#a78bfa",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Set up root layout with dark theme**

Write `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quem Disse Isso?",
  description: "Party game de anonimato e dedução social",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-white min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Update globals.css**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0f0f1a;
}

input, textarea {
  background-color: #1e1e2e;
  color: white;
  border: 1px solid #2e2e3e;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 1.125rem;
  width: 100%;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
}
```

- [ ] **Step 6: Create .env.local template**

Write `.env.local`:

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 7: Verify it runs**

```bash
npm run dev
```

Expected: App starts on localhost:3000 with dark background.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind dark theme"
```

---

## Task 2: Core Types and Lib Utilities

**Files:**
- Create: `src/lib/types.ts`, `src/lib/colors.ts`, `src/lib/code.ts`, `src/lib/questions.ts`

- [ ] **Step 1: Write shared types**

Write `src/lib/types.ts`:

```typescript
export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  currentQuestionerIndex: number;
  round: number;
  settings: RoomSettings;
  question: string | null;
  answers: Answer[];
  votes: Vote[];
  scores: Score[];
  revealIndex: number;
  phaseDeadline: number | null;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  connected: boolean;
}

export type Phase = 'lobby' | 'question' | 'answering' | 'voting' | 'reveal' | 'scoreboard' | 'final';

export interface RoomSettings {
  rounds: number;
  answerTime: number;
  adultMode: boolean;
  theme: 'free' | 'confessions' | 'dilemmas' | 'most-likely';
}

export interface Answer {
  id: string;
  playerId: string;
  text: string;
}

export interface Vote {
  voterId: string;
  answerId: string;
  guessedPlayerId: string;
}

export interface Score {
  playerId: string;
  points: number;
  badges: string[];
}

export interface SanitizedRoom {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  currentQuestionerIndex: number;
  round: number;
  settings: RoomSettings;
  question: string | null;
  answerCount: number;
  totalPlayers: number;
  answers: { id: string; text: string }[];
  votes: Vote[];
  scores: Score[];
  revealIndex: number;
  phaseDeadline: number | null;
  myAnswer: string | null;
  revealedAnswer: { id: string; text: string; playerId: string; playerName: string } | null;
  revealedVotes: Vote[];
}
```

- [ ] **Step 2: Write color generator**

Write `src/lib/colors.ts`:

```typescript
const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#14b8a6",
];

export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
```

- [ ] **Step 3: Write room code generator**

Write `src/lib/code.ts`:

```typescript
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // excludes 0/O, 1/I/L

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
```

- [ ] **Step 4: Write suggested questions**

Write `src/lib/questions.ts`:

```typescript
export const QUESTIONS: Record<string, string[]> = {
  free: [
    "Quem aqui chora em filme?",
    "Quem mentiria pra sair de uma festa?",
    "Quem gastaria tudo numa viagem impulsiva?",
    "Quem já fingiu que não viu alguém na rua?",
    "Quem tem o pior senso de direção?",
    "Quem mais demoraria pra responder uma mensagem?",
    "Quem aqui já stalkeou um ex?",
    "Quem seria o primeiro a sobreviver num apocalipse zumbi?",
  ],
  confessions: [
    "Qual sua maior vergonha em público?",
    "Qual mentira você conta com mais frequência?",
    "O que você faz escondido que ninguém sabe?",
    "Qual foi a coisa mais ridícula que você já fez por crush?",
    "Qual é o seu guilty pleasure mais vergonhoso?",
    "O que você deletaria do seu histórico agora?",
  ],
  dilemmas: [
    "Você prefere saber a data da sua morte ou a causa?",
    "Você trairia seu melhor amigo por 1 milhão?",
    "Prefere nunca mais comer doce ou nunca mais comer salgado?",
    "Você voltaria no tempo e mudaria uma decisão? Qual?",
    "Prefere ser famoso e infeliz ou desconhecido e feliz?",
  ],
  "most-likely": [
    "Quem mais provavelmente ficaria preso num reality show?",
    "Quem choraria primeiro assistindo Divertida Mente?",
    "Quem mais provavelmente viraria influencer?",
    "Quem seria cancelado primeiro no Twitter?",
    "Quem mais provavelmente largaria tudo e iria morar na praia?",
  ],
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/colors.ts src/lib/code.ts src/lib/questions.ts
git commit -m "feat: add core types, color generator, room codes, and question bank"
```

---

## Task 3: Redis Client and Room Operations

**Files:**
- Create: `src/lib/redis.ts`, `src/lib/room.ts`, `src/lib/sanitize.ts`, `src/lib/scoring.ts`

- [ ] **Step 1: Write Redis client**

Write `src/lib/redis.ts`:

```typescript
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ROOM_TTL = 7200; // 2 hours

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
```

- [ ] **Step 2: Write room operations**

Write `src/lib/room.ts`:

```typescript
import { Room, Player, Score } from "./types";
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
```

- [ ] **Step 3: Write state sanitizer**

Write `src/lib/sanitize.ts`:

```typescript
import { Room, SanitizedRoom } from "./types";

export function sanitizeRoom(room: Room, playerId: string): SanitizedRoom {
  const connectedPlayers = room.players.filter((p) => p.connected);
  const questioner = room.players[room.currentQuestionerIndex];

  // Base sanitized state
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

  // Phase-specific sanitization
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
      // Also include all previously revealed answers
      for (let i = 0; i < room.revealIndex; i++) {
        const prev = room.answers[i];
        if (prev) {
          const prevVotes = room.votes.filter((v) => v.answerId === prev.id);
          // These are already revealed, client can cache
        }
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
```

- [ ] **Step 4: Write scoring logic**

Write `src/lib/scoring.ts`:

```typescript
import { Room } from "./types";

export function calculateRoundScores(room: Room): Room {
  const questioner = room.players[room.currentQuestionerIndex];

  for (const answer of room.answers) {
    const authorId = answer.playerId;
    const votesForThisAnswer = room.votes.filter((v) => v.answerId === answer.id);
    const connectedVoters = room.players.filter(
      (p) => p.connected && p.id !== questioner?.id && p.id !== authorId
    );

    // Score voters who guessed correctly
    for (const vote of votesForThisAnswer) {
      if (vote.guessedPlayerId === authorId) {
        const voterScore = room.scores.find((s) => s.playerId === vote.voterId);
        if (voterScore) voterScore.points += 100;
      }
    }

    // Anonymity bonus: nobody guessed the author
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
  // Track stats across all rounds
  const playerStats: Record<string, { timesGuessed: number; correctVotes: number; timesAnonymous: number }> = {};

  for (const p of room.players) {
    playerStats[p.id] = { timesGuessed: 0, correctVotes: 0, timesAnonymous: 0 };
  }

  // We calculate from current scores badges
  for (const score of room.scores) {
    score.badges = [];
  }

  // Detetive: most points (most correct votes)
  const sorted = [...room.scores].sort((a, b) => b.points - a.points);
  if (sorted[0]) {
    const best = room.scores.find((s) => s.playerId === sorted[0].playerId);
    if (best && !best.badges.includes("Detetive")) best.badges.push("Detetive");
  }

  // Mestre do Anonimato: fewest times guessed correctly (most anonymity bonuses)
  // Transparente: most times everyone guessed them

  return room;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/redis.ts src/lib/room.ts src/lib/sanitize.ts src/lib/scoring.ts
git commit -m "feat: add Redis client, room operations, sanitization, and scoring"
```

---

## Task 4: API Routes

**Files:**
- Create: `src/app/api/room/route.ts`, `src/app/api/room/[code]/route.ts`, `src/app/api/room/[code]/join/route.ts`, `src/app/api/room/[code]/action/route.ts`

- [ ] **Step 1: POST /api/room — Create room**

Write `src/app/api/room/route.ts`:

```typescript
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
```

- [ ] **Step 2: GET /api/room/[code] — Poll room state**

Write `src/app/api/room/[code]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/room";
import { sanitizeRoom } from "@/lib/sanitize";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const playerId = req.nextUrl.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId obrigatório" }, { status: 400 });
  }

  const room = await getRoom(params.code.toUpperCase());
  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
  }

  // Check deadline-based auto-transitions
  if (room.phaseDeadline && Date.now() > room.phaseDeadline) {
    const { handleDeadline } = await import("@/lib/transitions");
    await handleDeadline(room);
  }

  return NextResponse.json(sanitizeRoom(room, playerId));
}
```

- [ ] **Step 3: POST /api/room/[code]/join — Join room**

Write `src/app/api/room/[code]/join/route.ts`:

```typescript
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
```

- [ ] **Step 4: POST /api/room/[code]/action — Game actions**

Write `src/app/api/room/[code]/action/route.ts`:

```typescript
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

      // Check if all connected non-questioner players answered
      const expectedAnswers = room.players.filter(
        (p) => p.connected && p.id !== questioner?.id
      ).length;
      if (room.answers.length >= expectedAnswers) {
        room.phase = "voting";
        room.phaseDeadline = null; // Voting doesn't have a global timer
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

      // Check if all connected players voted on all answers
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
        // All revealed — go to scoreboard
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
```

- [ ] **Step 5: Write deadline handler**

Write `src/lib/transitions.ts`:

```typescript
import { Room } from "./types";
import { setRoom } from "./redis";

export async function handleDeadline(room: Room): Promise<void> {
  if (room.phase === "answering") {
    // Fill empty answers for players who didn't respond
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
    // Skip to next questioner if host didn't write
    room.question = "Pergunta pulada!";
    room.answers = [];
    room.votes = [];
    room.phase = "answering";
    room.phaseDeadline = Date.now() + room.settings.answerTime * 1000;
  }

  await setRoom(room.code, room);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ src/lib/transitions.ts
git commit -m "feat: add all API routes — create, join, poll, actions, auto-transitions"
```

---

## Task 5: Client Hooks

**Files:**
- Create: `src/hooks/usePlayer.ts`, `src/hooks/useRoom.ts`, `src/hooks/useSound.ts`

- [ ] **Step 1: Write usePlayer hook**

Write `src/hooks/usePlayer.ts`:

```typescript
"use client";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export function usePlayer() {
  const [playerId, setPlayerId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem("qdi-player-id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("qdi-player-id", id);
    }
    setPlayerId(id);
  }, []);

  return playerId;
}
```

- [ ] **Step 2: Write useRoom polling hook**

Write `src/hooks/useRoom.ts`:

```typescript
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { SanitizedRoom } from "@/lib/types";

export function useRoom(code: string, playerId: string) {
  const [room, setRoom] = useState<SanitizedRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const prevPlayerCountRef = useRef<number>(0);

  const fetchRoom = useCallback(async () => {
    if (!code || !playerId) return;
    try {
      const res = await fetch(`/api/room/${code}?playerId=${playerId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      const data = await res.json();
      setRoom(data);
      setError(null);
    } catch {
      setError("Erro de conexão");
    }
  }, [code, playerId]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 1500);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const sendAction = useCallback(
    async (action: string, data?: Record<string, unknown>) => {
      if (!code || !playerId) return;
      const res = await fetch(`/api/room/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, playerId, data }),
      });
      if (res.ok) {
        await fetchRoom();
      }
      return res;
    },
    [code, playerId, fetchRoom]
  );

  return { room, error, sendAction, refetch: fetchRoom };
}
```

- [ ] **Step 3: Write useSound hook**

Write `src/hooks/useSound.ts`:

```typescript
"use client";
import { useCallback, useRef } from "react";

type SoundName = "join" | "whoosh" | "tick" | "drumroll" | "fanfare" | "trombone" | "levelup";

export function useSound() {
  const cachRef = useRef<Record<string, HTMLAudioElement>>({});

  const play = useCallback((name: SoundName) => {
    try {
      if (!cachRef.current[name]) {
        cachRef.current[name] = new Audio(`/sounds/${name}.mp3`);
      }
      const audio = cachRef.current[name];
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // Sound is non-critical
    }
  }, []);

  return { play };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: add usePlayer, useRoom polling, and useSound hooks"
```

---

## Task 6: Home Page — Create/Join Room

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write home page**

Replace `src/app/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/hooks/usePlayer";
import { motion } from "framer-motion";

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const playerId = usePlayer();

  async function handleCreate() {
    if (!name.trim() || !playerId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim(), playerId }),
      });
      const data = await res.json();
      if (data.code) {
        localStorage.setItem("qdi-player-name", name.trim());
        router.push(`/sala/${data.code}`);
      } else {
        setError(data.error || "Erro ao criar sala");
      }
    } catch {
      setError("Erro de conexão");
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!name.trim() || !roomCode.trim() || !playerId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/room/${roomCode.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim(), playerId }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("qdi-player-name", name.trim());
        router.push(`/sala/${roomCode.toUpperCase()}`);
      } else {
        setError(data.error || "Sala não encontrada");
      }
    } catch {
      setError("Erro de conexão");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div>
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-accent">Quem</span> Disse Isso?
          </h1>
          <p className="text-gray-400 text-lg">Party game de anonimato e dedução</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="text-center text-xl"
          />

          <div className="space-y-3">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 px-6 rounded-xl text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Criando..." : "Criar Sala"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-gray-500 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Código da sala"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-xl uppercase tracking-widest flex-1"
              />
              <button
                onClick={handleJoin}
                disabled={!name.trim() || !roomCode.trim() || loading}
                className="bg-card hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
              >
                Entrar
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm"
            >
              {error}
            </motion.p>
          )}
        </div>
      </motion.div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add home page with create/join room"
```

---

## Task 7: Game Page Shell + Shared Components

**Files:**
- Create: `src/app/sala/[code]/page.tsx`, `src/components/PlayerAvatar.tsx`, `src/components/Timer.tsx`

- [ ] **Step 1: Write PlayerAvatar component**

Write `src/components/PlayerAvatar.tsx`:

```tsx
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
```

- [ ] **Step 2: Write Timer component**

Write `src/components/Timer.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";

interface Props {
  deadline: number | null;
  onExpired?: () => void;
}

export function Timer({ deadline, onExpired }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!deadline) return;

    function tick() {
      const left = Math.max(0, Math.ceil((deadline! - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && onExpired) onExpired();
    }

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [deadline, onExpired]);

  if (!deadline) return null;

  const totalSeconds = Math.ceil((deadline - Date.now()) / 1000 + secondsLeft) / 2;
  const percent = totalSeconds > 0 ? (secondsLeft / Math.max(totalSeconds, 1)) * 100 : 0;
  const color = secondsLeft > 10 ? "bg-green-500" : secondsLeft > 5 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-sm text-gray-400">
        <span>{secondsLeft}s</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write game page shell**

Write `src/app/sala/[code]/page.tsx`:

```tsx
"use client";
import { useParams } from "next/navigation";
import { usePlayer } from "@/hooks/usePlayer";
import { useRoom } from "@/hooks/useRoom";
import { LobbyScreen } from "@/components/LobbyScreen";
import { QuestionScreen } from "@/components/QuestionScreen";
import { AnsweringScreen } from "@/components/AnsweringScreen";
import { VotingScreen } from "@/components/VotingScreen";
import { RevealScreen } from "@/components/RevealScreen";
import { ScoreboardScreen } from "@/components/ScoreboardScreen";
import { FinalScreen } from "@/components/FinalScreen";
import { motion } from "framer-motion";

export default function SalaPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const playerId = usePlayer();
  const { room, error, sendAction } = useRoom(code, playerId);

  if (!playerId) return <Loading text="Carregando..." />;
  if (error) return <ErrorScreen message={error} />;
  if (!room) return <Loading text="Conectando à sala..." />;

  const props = { room, playerId, sendAction };

  return (
    <main className="min-h-screen flex flex-col items-center p-4 max-w-lg mx-auto">
      <div className="w-full flex justify-between items-center mb-4">
        <span className="text-gray-500 text-sm">Sala</span>
        <span className="font-mono text-accent font-bold tracking-widest text-lg">{code}</span>
        <span className="text-gray-500 text-sm">R{room.round}/{room.settings.rounds}</span>
      </div>
      <div className="w-full flex-1">
        {room.phase === "lobby" && <LobbyScreen {...props} />}
        {room.phase === "question" && <QuestionScreen {...props} />}
        {room.phase === "answering" && <AnsweringScreen {...props} />}
        {room.phase === "voting" && <VotingScreen {...props} />}
        {room.phase === "reveal" && <RevealScreen {...props} />}
        {room.phase === "scoreboard" && <ScoreboardScreen {...props} />}
        {room.phase === "final" && <FinalScreen {...props} />}
      </div>
    </main>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-gray-400 text-xl"
      >
        {text}
      </motion.p>
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400 text-xl">{message}</p>
      <a href="/" className="text-accent underline">Voltar ao início</a>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/sala/ src/components/PlayerAvatar.tsx src/components/Timer.tsx
git commit -m "feat: add game page shell, PlayerAvatar, and Timer components"
```

---

## Task 8: LobbyScreen + QuestionScreen

**Files:**
- Create: `src/components/LobbyScreen.tsx`, `src/components/QuestionScreen.tsx`

- [ ] **Step 1: Write LobbyScreen**

Write `src/components/LobbyScreen.tsx`:

```tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function LobbyScreen({ room, playerId, sendAction }: Props) {
  const isHost = playerId === room.hostId;
  const [rounds, setRounds] = useState(room.settings.rounds);
  const [answerTime, setAnswerTime] = useState(room.settings.answerTime);
  const [theme, setTheme] = useState(room.settings.theme);

  function handleStart() {
    sendAction("start", { settings: { rounds, answerTime, theme } });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-gray-400"
        >
          Aguardando jogadores...
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AnimatePresence>
          {room.players.map((p) => (
            <motion.div
              key={p.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center"
            >
              <PlayerAvatar name={p.name} color={p.color} size="lg" showName isHost={p.isHost} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isHost && (
        <div className="space-y-4 bg-card rounded-xl p-4">
          <h3 className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Configurações</h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Rodadas</span>
            <div className="flex gap-2">
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setRounds(n)}
                  className={`px-3 py-1 rounded-lg text-sm font-bold ${rounds === n ? "bg-accent text-white" : "bg-gray-700 text-gray-400"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Tempo de resposta</span>
            <div className="flex gap-2">
              {[15, 30, 60].map((n) => (
                <button
                  key={n}
                  onClick={() => setAnswerTime(n)}
                  className={`px-3 py-1 rounded-lg text-sm font-bold ${answerTime === n ? "bg-accent text-white" : "bg-gray-700 text-gray-400"}`}
                >
                  {n}s
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Tema</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as typeof theme)}
              className="bg-gray-700 text-white rounded-lg px-3 py-1 text-sm border-none"
            >
              <option value="free">Livre</option>
              <option value="confessions">Confissões</option>
              <option value="dilemmas">Dilemas</option>
              <option value="most-likely">Quem mais provavelmente</option>
            </select>
          </div>

          <button
            onClick={handleStart}
            disabled={room.players.filter((p) => p.connected).length < 3}
            className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            Começar Jogo
          </button>
          {room.players.filter((p) => p.connected).length < 3 && (
            <p className="text-center text-sm text-gray-500">Mínimo 3 jogadores</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write QuestionScreen**

Write `src/components/QuestionScreen.tsx`:

```tsx
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { Timer } from "./Timer";
import { QUESTIONS } from "@/lib/questions";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function QuestionScreen({ room, playerId, sendAction }: Props) {
  const [question, setQuestion] = useState("");
  const questioner = room.players[room.currentQuestionerIndex];
  const isQuestioner = playerId === questioner?.id;
  const suggestions = QUESTIONS[room.settings.theme] || QUESTIONS.free;

  function handleSubmit() {
    if (!question.trim()) return;
    sendAction("submit-question", { question: question.trim() });
  }

  if (!isQuestioner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-6xl"
        >
          🤔
        </motion.div>
        <p className="text-xl text-gray-300">
          <span className="font-bold text-white">{questioner?.name}</span> está pensando numa pergunta...
        </p>
        <Timer deadline={room.phaseDeadline} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Escreva sua pergunta</h2>
      <Timer deadline={room.phaseDeadline} />

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Sua pergunta..."
        rows={3}
        maxLength={200}
        className="text-xl"
      />

      <button
        onClick={handleSubmit}
        disabled={!question.trim()}
        className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors disabled:opacity-50"
      >
        Enviar pergunta
      </button>

      <div className="space-y-2">
        <p className="text-sm text-gray-500">Sugestões:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 4).map((s, i) => (
            <button
              key={i}
              onClick={() => setQuestion(s)}
              className="text-sm bg-card border border-gray-700 text-gray-300 px-3 py-2 rounded-lg hover:border-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LobbyScreen.tsx src/components/QuestionScreen.tsx
git commit -m "feat: add LobbyScreen and QuestionScreen components"
```

---

## Task 9: AnsweringScreen + VotingScreen

**Files:**
- Create: `src/components/AnsweringScreen.tsx`, `src/components/VotingScreen.tsx`

- [ ] **Step 1: Write AnsweringScreen**

Write `src/components/AnsweringScreen.tsx`:

```tsx
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { Timer } from "./Timer";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function AnsweringScreen({ room, playerId, sendAction }: Props) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(!!room.myAnswer);
  const questioner = room.players[room.currentQuestionerIndex];
  const isQuestioner = playerId === questioner?.id;

  async function handleSubmit() {
    if (!answer.trim()) return;
    await sendAction("submit-answer", { answer: answer.trim() });
    setSubmitted(true);
  }

  if (isQuestioner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl p-6 text-center"
        >
          <p className="text-2xl font-bold mb-4">{room.question}</p>
          <p className="text-gray-400">Aguardando respostas...</p>
          <p className="text-accent font-bold text-xl mt-2">{room.answerCount}/{room.totalPlayers}</p>
        </motion.div>
        <Timer deadline={room.phaseDeadline} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-5xl"
        >
          ✅
        </motion.div>
        <p className="text-xl text-gray-300">Resposta enviada!</p>
        <p className="text-accent font-bold">{room.answerCount}/{room.totalPlayers} responderam</p>
        <Timer deadline={room.phaseDeadline} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-6 text-center"
      >
        <p className="text-2xl font-bold">{room.question}</p>
      </motion.div>

      <Timer deadline={room.phaseDeadline} />

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Sua resposta anônima..."
        rows={3}
        maxLength={200}
        className="text-xl"
      />

      <button
        onClick={handleSubmit}
        disabled={!answer.trim()}
        className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors disabled:opacity-50"
      >
        Enviar resposta
      </button>

      <p className="text-center text-sm text-gray-500">{room.answerCount}/{room.totalPlayers} responderam</p>
    </div>
  );
}
```

- [ ] **Step 2: Write VotingScreen**

Write `src/components/VotingScreen.tsx`:

```tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function VotingScreen({ room, playerId, sendAction }: Props) {
  const [currentAnswerIdx, setCurrentAnswerIdx] = useState(0);
  const questioner = room.players[room.currentQuestionerIndex];
  const votablePlayers = room.players.filter((p) => p.id !== questioner?.id && p.connected);
  const currentAnswer = room.answers[currentAnswerIdx];

  // Find which answers this player already voted on
  const myVotes = room.votes?.filter((v) => v.voterId === playerId) || [];
  const votedAnswerIds = new Set(myVotes.map((v) => v.answerId));

  // Auto-advance to first unvoted answer
  const firstUnvotedIdx = room.answers.findIndex((a) => !votedAnswerIds.has(a.id));
  const activeIdx = firstUnvotedIdx >= 0 ? firstUnvotedIdx : currentAnswerIdx;
  const activeAnswer = room.answers[activeIdx];

  const allVoted = room.answers.every((a) => votedAnswerIds.has(a.id));

  async function handleVote(guessedPlayerId: string) {
    if (!activeAnswer) return;
    await sendAction("submit-vote", {
      answerId: activeAnswer.id,
      guessedPlayerId,
    });
  }

  if (allVoted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-5xl"
        >
          ⏳
        </motion.div>
        <p className="text-xl text-gray-300">Aguardando os outros votarem...</p>
      </div>
    );
  }

  if (!activeAnswer) return null;

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-gray-400">
        Resposta {activeIdx + 1} de {room.answers.length}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeAnswer.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="bg-card rounded-2xl p-6 min-h-[120px] flex items-center justify-center"
        >
          <p className="text-2xl font-bold text-center leading-relaxed">
            &ldquo;{activeAnswer.text}&rdquo;
          </p>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-gray-400">Quem escreveu isso?</p>

      <div className="grid grid-cols-2 gap-3">
        {votablePlayers.map((p) => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleVote(p.id)}
            className="bg-card border border-gray-700 hover:border-accent rounded-xl p-4 flex items-center gap-3 transition-colors"
          >
            <PlayerAvatar name={p.name} color={p.color} size="sm" />
            <span className="font-semibold truncate">{p.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AnsweringScreen.tsx src/components/VotingScreen.tsx
git commit -m "feat: add AnsweringScreen and VotingScreen components"
```

---

## Task 10: RevealScreen + ScoreboardScreen + FinalScreen

**Files:**
- Create: `src/components/RevealScreen.tsx`, `src/components/ScoreboardScreen.tsx`, `src/components/FinalScreen.tsx`

- [ ] **Step 1: Write RevealScreen**

Write `src/components/RevealScreen.tsx`:

```tsx
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { useSound } from "@/hooks/useSound";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function RevealScreen({ room, playerId, sendAction }: Props) {
  const [showAuthor, setShowAuthor] = useState(false);
  const [prevRevealIndex, setPrevRevealIndex] = useState(-1);
  const isHost = playerId === room.hostId;
  const { play } = useSound();
  const revealed = room.revealedAnswer;

  useEffect(() => {
    if (room.revealIndex !== prevRevealIndex) {
      setShowAuthor(false);
      setPrevRevealIndex(room.revealIndex);
      play("drumroll");
      const timer = setTimeout(() => {
        setShowAuthor(true);
        // Check if current player guessed correctly
        const myVote = room.revealedVotes.find((v) => v.voterId === playerId);
        if (myVote && revealed && myVote.guessedPlayerId === revealed.playerId) {
          play("fanfare");
        } else {
          play("trombone");
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [room.revealIndex]);

  if (!revealed) return null;

  const myVote = room.revealedVotes.find((v) => v.voterId === playerId);
  const iCorrect = myVote && myVote.guessedPlayerId === revealed.playerId;

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-gray-400">
        Revelação {room.revealIndex + 1} de {room.answers.length}
      </div>

      <motion.div
        key={room.revealIndex}
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-card rounded-2xl p-6 min-h-[120px] flex items-center justify-center"
      >
        <p className="text-2xl font-bold text-center">&ldquo;{revealed.text}&rdquo;</p>
      </motion.div>

      {/* Votes */}
      <div className="space-y-2">
        {room.revealedVotes.map((v) => {
          const voter = room.players.find((p) => p.id === v.voterId);
          const guessed = room.players.find((p) => p.id === v.guessedPlayerId);
          return (
            <motion.div
              key={v.voterId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-gray-400 text-sm"
            >
              <span className="text-white font-semibold">{voter?.name}</span> votou em{" "}
              <span className="text-accent-light font-semibold">{guessed?.name}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Author reveal */}
      <AnimatePresence>
        {showAuthor && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 8, stiffness: 100 }}
            className="text-center space-y-3"
          >
            <p className="text-gray-400">Quem escreveu foi...</p>
            <p className="text-4xl font-bold text-accent">{revealed.playerName}</p>
            {iCorrect !== undefined && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-3xl"
              >
                {iCorrect ? "🎉 +100" : "😅"}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isHost && showAuthor && (
        <button
          onClick={() => sendAction("next-reveal")}
          className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors"
        >
          {room.revealIndex < room.answers.length - 1 ? "Próxima revelação" : "Ver placar"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write ScoreboardScreen**

Write `src/components/ScoreboardScreen.tsx`:

```tsx
"use client";
import { motion } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { useSound } from "@/hooks/useSound";
import { useEffect } from "react";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

export function ScoreboardScreen({ room, playerId, sendAction }: Props) {
  const isHost = playerId === room.hostId;
  const { play } = useSound();
  const sorted = [...room.scores]
    .map((s) => ({ ...s, player: room.players.find((p) => p.id === s.playerId) }))
    .sort((a, b) => b.points - a.points);

  useEffect(() => {
    play("levelup");
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Placar</h2>

      <div className="space-y-3">
        {sorted.map((s, i) => (
          <motion.div
            key={s.playerId}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="bg-card rounded-xl p-4 flex items-center gap-4"
          >
            <span className="text-2xl font-bold text-gray-500 w-8">{i + 1}</span>
            {s.player && <PlayerAvatar name={s.player.name} color={s.player.color} size="md" />}
            <div className="flex-1">
              <p className="font-bold">{s.player?.name}</p>
              {s.badges.length > 0 && (
                <p className="text-sm text-gray-400">{s.badges.join(" ")}</p>
              )}
            </div>
            <span className="text-accent font-bold text-xl">{s.points}</span>
          </motion.div>
        ))}
      </div>

      {isHost && (
        <button
          onClick={() => sendAction("next-round")}
          className="w-full bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-xl transition-colors"
        >
          {room.round >= room.settings.rounds ? "Ver resultado final" : "Próxima rodada"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write FinalScreen**

Write `src/components/FinalScreen.tsx`:

```tsx
"use client";
import { motion } from "framer-motion";
import { SanitizedRoom } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { useSound } from "@/hooks/useSound";
import { useEffect } from "react";

interface Props {
  room: SanitizedRoom;
  playerId: string;
  sendAction: (action: string, data?: Record<string, unknown>) => Promise<Response | undefined>;
}

const BADGE_MAP: Record<string, { emoji: string; label: string }> = {
  Detetive: { emoji: "🔍", label: "Detetive" },
  "Mestre do Anonimato": { emoji: "🕵️", label: "Mestre do Anonimato" },
  Transparente: { emoji: "😂", label: "Transparente" },
  Criativo: { emoji: "🎭", label: "Criativo" },
};

export function FinalScreen({ room, playerId, sendAction }: Props) {
  const { play } = useSound();
  const sorted = [...room.scores]
    .map((s) => ({ ...s, player: room.players.find((p) => p.id === s.playerId) }))
    .sort((a, b) => b.points - a.points);

  const podium = sorted.slice(0, 3);

  useEffect(() => {
    play("fanfare");
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">Resultado Final!</h2>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 h-64">
        {podium[1] && (
          <PodiumPlace player={podium[1]} place={2} height="h-32" />
        )}
        {podium[0] && (
          <PodiumPlace player={podium[0]} place={1} height="h-44" />
        )}
        {podium[2] && (
          <PodiumPlace player={podium[2]} place={3} height="h-24" />
        )}
      </div>

      {/* All scores */}
      <div className="space-y-3">
        {sorted.map((s, i) => (
          <motion.div
            key={s.playerId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 + i * 0.1 }}
            className="bg-card rounded-xl p-3 flex items-center gap-3"
          >
            <span className="text-lg font-bold text-gray-500 w-6">{i + 1}</span>
            {s.player && <PlayerAvatar name={s.player.name} color={s.player.color} size="sm" />}
            <span className="flex-1 font-semibold">{s.player?.name}</span>
            <span className="text-accent font-bold">{s.points}</span>
            <span className="text-sm">
              {s.badges.map((b) => BADGE_MAP[b]?.emoji || "").join(" ")}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Badges */}
      <div className="space-y-2">
        {sorted
          .filter((s) => s.badges.length > 0)
          .map((s) =>
            s.badges.map((b) => (
              <motion.div
                key={`${s.playerId}-${b}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-lg p-3 flex items-center gap-2 text-sm"
              >
                <span className="text-xl">{BADGE_MAP[b]?.emoji}</span>
                <span className="text-gray-400">{BADGE_MAP[b]?.label}:</span>
                <span className="font-bold">{s.player?.name}</span>
              </motion.div>
            ))
          )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => sendAction("play-again")}
          className="flex-1 bg-accent hover:bg-accent-light text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          Jogar de novo
        </button>
        <a
          href="/"
          className="flex-1 bg-card border border-gray-700 hover:bg-gray-700 text-white font-bold py-4 rounded-xl text-lg transition-colors text-center"
        >
          Nova sala
        </a>
      </div>
    </div>
  );
}

function PodiumPlace({
  player,
  place,
  height,
}: {
  player: { points: number; player?: { name: string; color: string } };
  place: number;
  height: string;
}) {
  const medals = ["", "🥇", "🥈", "🥉"];
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={{ delay: 0.3 * place, type: "spring" }}
      className="flex flex-col items-center"
    >
      {player.player && (
        <PlayerAvatar name={player.player.name} color={player.player.color} size="lg" />
      )}
      <span className="text-2xl mt-1">{medals[place]}</span>
      <span className="font-bold text-sm mt-1">{player.player?.name}</span>
      <div className={`${height} w-20 bg-accent/30 border-t-2 border-accent rounded-t-lg mt-2 flex items-start justify-center pt-2`}>
        <span className="text-accent font-bold">{player.points}</span>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/RevealScreen.tsx src/components/ScoreboardScreen.tsx src/components/FinalScreen.tsx
git commit -m "feat: add RevealScreen, ScoreboardScreen, and FinalScreen"
```

---

## Task 11: Sound Files + Final Polish

**Files:**
- Create: `public/sounds/` (placeholder `.mp3` files)
- Modify: various for polish

- [ ] **Step 1: Generate placeholder sound files**

We'll create minimal valid MP3 files using base64. These are silent placeholders — replace with real sounds later.

```bash
mkdir -p public/sounds
# Create silent mp3 placeholders for each sound
for sound in join whoosh tick drumroll fanfare trombone levelup; do
  echo "placeholder" > public/sounds/${sound}.mp3
done
```

Note: Replace these with real `.mp3` sound effect files before production. The app will work silently with placeholders (audio errors are caught and ignored).

- [ ] **Step 2: Verify the app runs**

```bash
npm run dev
```

Expected: App starts, home page renders with dark theme.

- [ ] **Step 3: Commit**

```bash
git add public/sounds/
git commit -m "feat: add placeholder sound files"
```

---

## Task 12: Upstash Redis Setup + Environment

- [ ] **Step 1: Create Upstash Redis database**

1. Go to console.upstash.com
2. Create a new Redis database (free tier)
3. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Paste into `.env.local`

- [ ] **Step 2: Test end-to-end**

```bash
npm run dev
```

1. Open localhost:3000
2. Enter name, click "Criar Sala"
3. Should redirect to `/sala/XXXXXX`
4. Open another tab, enter name + room code, click "Entrar"
5. Verify both players appear in lobby

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: ready for first playtest"
```
