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
