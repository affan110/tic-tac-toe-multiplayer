import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const PORT = process.env.PORT || 8080;
const app = express();
app.use(
  cors({
    origin: '*', // allow all origins
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);
app.use(express.json());

//  Database setup
let db: any;
(async () => {
  db = await open({ filename: './leaderboard.db', driver: sqlite3.Database });
  await db.exec(`CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0
  );`);
})();

async function updateLeaderboard(winner: string, loser: string, draw = false) {
  const invalidNames = ['CPU', 'Enter Your Name', '', null, undefined];
  if (invalidNames.includes(winner) || invalidNames.includes(loser)) return;
  await db.run('INSERT OR IGNORE INTO leaderboard (name) VALUES (?)', [winner]);
  await db.run('INSERT OR IGNORE INTO leaderboard (name) VALUES (?)', [loser]);
  if (draw) {
    await db.run('UPDATE leaderboard SET draws = draws + 1 WHERE name IN (?,?)', [winner, loser]);
  } else {
    await db.run('UPDATE leaderboard SET wins = wins + 1 WHERE name=?', [winner]);
    await db.run('UPDATE leaderboard SET losses = losses + 1 WHERE name=?', [loser]);
  }
}

//  Health Check + Leaderboard routes
app.get('/health', (_, res) => res.json({ ok: true }));
app.get('/leaderboard', async (_, res) => {
  const rows = await db.all('SELECT * FROM leaderboard ORDER BY wins DESC, draws DESC LIMIT 20');
  res.json(rows);
});

//  WebSocket setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface Player {
  id: string;
  ws: WebSocket | null;
  name: string;
  symbol?: 'X' | 'O';
}

interface Game {
  id: string;
  players: Player[];
  board: (string | null)[];
  turn: 'X' | 'O';
  status: 'playing' | 'ended';
  winner?: string | null;
}

const queue: Player[] = [];
const games = new Map<string, Game>();

//  Helper function to check for winners
function checkWinner(b: (string | null)[]): string | null {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b2,c] of lines)
    if (b[a] && b[a] === b[b2] && b[a] === b[c]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}

wss.on('connection', ws => {
  const player: Player = { id: uuidv4(), ws, name: 'Guest' };
  ws.send(JSON.stringify({ type: 'connected', payload: { id: player.id } }));

  ws.on('message', async data => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    const { type, payload } = msg;

    if (type === 'set_name') player.name = payload.name;

    //  Matchmaking handler (two-player or bot)
    if (type === 'find_match') {
      const mode = payload?.mode || 'human';

      //  BOT MODE — Single Player
      if (mode === 'bot') {
        const bot: Player = { id: 'BOT-' + uuidv4(), name: 'CPU', ws: null, symbol: 'O' };
        const gid = uuidv4();
        const game: Game = { id: gid, players: [player, bot], board: Array(9).fill(null), turn: 'X', status: 'playing' };
        games.set(gid, game);
        player.symbol = 'X';

        player.ws?.send(JSON.stringify({
          type: 'match_found',
          payload: { gameId: gid, you: 'X', opponent: 'CPU' }
        }));

        //  Bot logic
        const playBotMove = async () => {
          const g = games.get(gid);
          if (!g || g.status !== 'playing') return;
          if (g.turn !== 'O') return;

          const emptyCells = g.board.map((v, i) => (v ? null : i)).filter(i => i !== null) as number[];
          if (emptyCells.length === 0) return;
          const move = emptyCells[Math.floor(Math.random() * emptyCells.length)];
          g.board[move] = 'O';

          const w = checkWinner(g.board);
          if (w) {
            g.status = 'ended'; g.winner = w;
            if (w === 'draw') await updateLeaderboard(player.name, bot.name, true);
            else if (w === 'X') await updateLeaderboard(player.name, bot.name);
            else await updateLeaderboard(bot.name, player.name);
          } else g.turn = 'X';

          if (player.ws && player.ws.readyState === WebSocket.OPEN)
            player.ws.send(JSON.stringify({
              type: 'state_update',
              payload: { board: g.board, turn: g.turn, status: g.status, winner: g.winner }
            }));

          if (g.status === 'playing') setTimeout(playBotMove, 1000);
        };

        // Listen for player moves
        const botListener = (data: any) => {
          let msg;
          try { msg = JSON.parse(data.toString()); } catch { return; }
          if (msg.type === 'make_move' && msg.payload.gameId === gid)
            setTimeout(playBotMove, 1000);
        };

        player.ws?.on('message', botListener);
        return;
      }

      //  HUMAN MODE — Two Player
      queue.push(player);
      if (queue.length >= 2) {
        const [p1, p2] = [queue.shift()!, queue.shift()!];
        const gid = uuidv4();
        const game: Game = { id: gid, players: [p1, p2], board: Array(9).fill(null), turn: 'X', status: 'playing' };
        games.set(gid, game);
        p1.symbol = 'X'; p2.symbol = 'O';

        [p1, p2].forEach(p =>
          p.ws?.send(JSON.stringify({
            type: 'match_found',
            payload: { gameId: gid, you: p.symbol, opponent: p === p1 ? p2.name : p1.name }
          }))
        );
      }
    }

    //  Handle player moves
    if (type === 'make_move') {
      const { gameId, index } = payload;
      const game = games.get(gameId);
      if (!game || game.status !== 'playing') return;

      const symbol = game.players.find(p => p.id === player.id)?.symbol;
      if (symbol !== game.turn || game.board[index]) return;

      game.board[index] = symbol!;
      const w = checkWinner(game.board);
      if (w) {
        game.status = 'ended';
        game.winner = w;

        const botPlayer = game.players.find(p => p.name === 'CPU');
        if (botPlayer) {
          if (w === 'draw') await updateLeaderboard(player.name, botPlayer.name, true);
          else if (w === 'X') await updateLeaderboard(player.name, botPlayer.name);
          else await updateLeaderboard(botPlayer.name, player.name);
        } else {
          if (w === 'draw') await updateLeaderboard(game.players[0].name, game.players[1].name, true);
          else {
            const wp = game.players.find(p => p.symbol === w)!;
            const lp = game.players.find(p => p.symbol !== w)!;
            await updateLeaderboard(wp.name, lp.name);
          }
        }
      } else {
        game.turn = game.turn === 'X' ? 'O' : 'X';
      }

      // Broadcast update
      for (const p of game.players)
        if (p.ws && p.ws.readyState === WebSocket.OPEN)
          p.ws.send(JSON.stringify({
            type: 'state_update',
            payload: { board: game.board, turn: game.turn, status: game.status, winner: game.winner }
          }));
    }
  });
});

server.listen(PORT, () => console.log('Server running on port', PORT));
