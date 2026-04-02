# Quem Disse Isso? — Design Spec

## Overview

Party game de anonimato e dedução social. Jogadores respondem perguntas anonimamente e votam em quem escreveu cada resposta. Mobile-first, dark mode, sem instalação — roda no browser.

## Stack

- **Next.js 14** (App Router) — framework fullstack
- **Tailwind CSS** — styling
- **Framer Motion** — animações
- **Howler.js** — efeitos sonoros
- **Upstash Redis** — estado das salas (key-value com TTL)
- **Vercel** — deploy

## Arquitetura

### Modelo de Dados

Uma key Redis por sala: `room:{CODE}` com TTL de 2 horas.

```typescript
interface Room {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  currentQuestionerIndex: number;
  round: number;
  settings: RoomSettings;
  question: string | null;
  answers: Answer[];       // { playerId, text } — nunca exposto ao client com playerId durante voting
  votes: Vote[];           // { voterId, answerId, guessedPlayerId }
  scores: Score[];         // { playerId, points, badges[] }
  revealIndex: number;     // qual resposta está sendo revelada
  phaseDeadline: number | null; // timestamp Unix para transição automática
}

interface Player {
  id: string;
  name: string;
  color: string;           // gerado do hash do nome
  isHost: boolean;
  connected: boolean;
}

type Phase = 'lobby' | 'question' | 'answering' | 'voting' | 'reveal' | 'scoreboard' | 'final';

interface RoomSettings {
  rounds: 3 | 5 | 10;
  answerTime: 15 | 30 | 60;
  adultMode: boolean;
  theme: 'free' | 'confessions' | 'dilemmas' | 'most-likely';
}
```

### API Routes

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/room` | Criar sala (retorna código) |
| GET | `/api/room/[code]` | Polling — retorna estado da sala (sanitizado por jogador) |
| POST | `/api/room/[code]/join` | Entrar na sala |
| POST | `/api/room/[code]/action` | Ações: start, submit-question, submit-answer, submit-vote, next-reveal, next-round |

### Sanitização do Estado

O endpoint GET nunca retorna dados que quebrariam o anonimato:
- Na fase `answering`: não retorna respostas dos outros, apenas contagem
- Na fase `voting`: retorna respostas sem `playerId`
- Na fase `reveal`: revela uma resposta por vez conforme `revealIndex`

### Sync

Polling a cada 1.5s via `GET /api/room/[code]`. Cada jogador se identifica por um `playerId` gerado no client (UUID salvo em localStorage).

## Páginas

- `/` — Tela de entrada
- `/sala/[code]` — Tela do jogo (renderiza componente da fase atual)

## Fases do Jogo (State Machine)

```
lobby → question → answering → voting → reveal → scoreboard
                                                      ↓
                                              (próxima rodada?)
                                              ↓ sim        ↓ não
                                           question      final
```

Transições controladas pelo servidor via ações do host ou automáticas (todos responderam, timer expirou).

### Transições Automáticas

- `answering → voting`: quando todos respondem OU timer expira
- `voting → reveal`: quando todos votam OU timer expira (15s por resposta)
- Timer gerenciado pelo servidor (campo `phaseDeadline` no Room)

## Componentes por Fase

### 1. LobbyScreen
- Lista de jogadores com avatar (círculo colorido + inicial)
- Badge "HOST" no criador
- "Aguardando jogadores..." com dots animados
- Botão "Começar Jogo" (só host, mínimo 3 jogadores)
- Configurações da sala (host): rodadas, tempo, modo 18+, tema
- Som: ping suave ao entrar jogador

### 2. QuestionScreen
- **Host vê:** campo de texto grande + sugestões clicáveis + timer 30s + botão enviar
- **Outros veem:** tela de espera com "[Nome] está pensando numa pergunta..."
- Sugestões variam por tema selecionado

### 3. AnsweringScreen
- Pergunta em destaque no topo
- Campo de resposta anônima
- Timer regressivo com barra (verde → amarelo → vermelho)
- Contagem "X/Y responderam" (sem nomes)
- Som: whoosh ao enviar

### 4. VotingScreen
- Respostas aparecem uma por vez com animação dramática
- Cada carta mostra só o texto
- Botões com nome/avatar de cada jogador para votar
- Timer 15s por resposta
- Tick-tick nos últimos 5s
- "Aguardando os outros..." após votar

### 5. RevealScreen
- Uma resposta por vez:
  1. Carta com texto
  2. Votos aparecem: "João votou em Sofia"
  3. Suspense 2s com drum roll
  4. REVEAL: nome do autor com animação explosiva
  5. Confetes (acertou) ou trombone triste (errou)
- Pontuação atualiza em tempo real

### 6. ScoreboardScreen
- Cards com avatar + nome + pontuação
- Animação de posição (subiu/desceu)
- Sons distintos pra 1º, 2º, 3º
- Botão "Próxima Rodada" (host)

### 7. FinalScreen
- Pódio animado top 3
- Badges especiais:
  - 🕵️ Mestre do Anonimato — menos vezes descoberto
  - 🔍 Detetive — mais acertos
  - 😂 Transparente — mais vezes descoberto
  - 🎭 Criativo — (votação rápida de pergunta favorita antes do final)
- Botões: "Jogar de novo" / "Nova sala"

## Sistema de Pontos

| Evento | Pontos |
|--------|--------|
| Acertou quem escreveu | +100 |
| Ninguém te adivinhou | +50 (bônus anonimato) |
| Todo mundo te adivinhou | 0 (badge "Transparente") |

## Design Visual

- **Dark mode** padrão
- Fundo: `#0f0f1a`
- Cards: `#1e1e2e`
- Accent: roxo/violeta `#7c3aed`
- Tipografia grande e bold nas respostas
- Avatars: círculos coloridos com inicial (sem foto)
- Mobile-first: botões grandes, texto legível, sem scroll horizontal

## Efeitos Sonoros

Arquivos `.mp3` em `/public/sounds/`:

| Momento | Arquivo | Descrição |
|---------|---------|-----------|
| Jogador entra | `join.mp3` | Ping suave |
| Pergunta/resposta enviada | `whoosh.mp3` | Whoosh |
| Timer acabando | `tick.mp3` | Tick tick tick |
| Carta sendo revelada | `drumroll.mp3` | Drum roll curto |
| Acertou | `fanfare.mp3` | Fanfarra |
| Errou | `trombone.mp3` | Trombone triste |
| Novo líder | `levelup.mp3` | Level up |

Carregados sob demanda via Howler.js.

## Geração de Código da Sala

6 caracteres alfanuméricos uppercase (A-Z, 0-9), excluindo ambíguos (0/O, 1/I/L). Verificação de colisão no Redis.

## Identificação do Jogador

UUID v4 gerado no client, salvo em `localStorage`. Permite reconectar à sala se fechar o browser.

## Edge Cases

- Jogador desconecta: marcado como `connected: false`, jogo continua sem ele
- Host desconecta: próximo jogador vira host
- Sala vazia: TTL do Redis limpa automaticamente
- Resposta vazia (timer expirou): registra como "..." e participa da votação normalmente
- Menos de 3 jogadores: não permite iniciar
