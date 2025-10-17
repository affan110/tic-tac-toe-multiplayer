import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import Constants from 'expo-constants';

const WS_URL = 
  process.env.NODE_ENV === 'production'
    ? 'wss://tic-tac-toe-multiplayer-ug7u.onrender.com'
    : 'ws://localhost:8080';


export default function App() {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('Enter Your Name');
  const [you, setYou] = useState(null);
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X');
  const [winner, setWinner] = useState(null);
  const [status, setStatus] = useState('idle');
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [opponent, setOpponent] = useState('');

  // connect websocket
  useEffect(() => {
    const s = new WebSocket(WS_URL);
    s.onopen = () => setConnected(true);
    s.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.type === 'match_found') {
        setYou(m.payload.you);
        setOpponent(m.payload.opponent);
        setGame(m.payload.gameId);
        setBoard(Array(9).fill(null));
        setTurn('X');
        setWinner(null);
        setStatus('playing');
      }
      if (m.type === 'state_update') {
        setBoard(m.payload.board);
        setTurn(m.payload.turn);
        setWinner(m.payload.winner);
        if (m.payload.status === 'ended') setStatus('ended');
      }
    };
    setWs(s);
    return () => s.close();
  }, []);

  const findMatch = (mode = 'human') => {
    ws.send(JSON.stringify({ type: 'set_name', payload: { name } }));
    ws.send(JSON.stringify({ type: 'find_match', payload: { mode } }));
    setStatus('queue');
    setShowLeaderboard(false);
  };

  const makeMove = i => {
    if (turn !== you || board[i] || winner) return;
    ws.send(JSON.stringify({ type: 'make_move', payload: { gameId: game, index: i } }));
  };

  const fetchLeaderboard = async () => {
    try {
      const API_URL = 
        process.env.NODE_ENV === 'production'
          ? 'https://tic-tac-toe-multiplayer-ug7u.onrender.com'
          : 'http://localhost:8080';

      const res = await fetch(`${API_URL}/leaderboard`);
      const data = await res.json();
      setLeaderboard(data);
      setShowLeaderboard(true);
      setStatus('idle');
    } catch (e) {
      alert('Failed to fetch leaderboard');
    }
  };

  const playAgain = () => {
    if (opponent === 'CPU') {
      // If playing with bot, restart bot mode directly
      setBoard(Array(9).fill(null));
      setWinner(null);
      setTurn('X');
      setGame(null);
      setStatus('queue');
      ws.send(JSON.stringify({ type: 'find_match', payload: { mode: 'bot' } }));
    } else {
      // Human mode: return to idle (player must click Find Match again)
      setBoard(Array(9).fill(null));
      setWinner(null);
      setTurn('X');
      setGame(null);
      setStatus('idle');
    }
  };

  // Loading Screen
  if (!connected)
    return (
      <SafeAreaView style={st.c}>
        <Text style={st.title}>Connecting to server...</Text>
        <ActivityIndicator size="large" color="#4CAF50" />
      </SafeAreaView>
    );

  // Leaderboard Screen
  if (showLeaderboard)
    return (
      <SafeAreaView style={st.c}>
        <Text style={st.title}>🏆 Leaderboard</Text>
        <ScrollView style={{ width: '100%', marginTop: 10 }}>
          {leaderboard.length === 0 ? (
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>No matches yet!</Text>
          ) : (
            leaderboard.map((p, i) => (
              <View key={i} style={st.row}>
                <Text style={[st.rank, { color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#fff' }]}>
                  {i + 1}.
                </Text>
                <Text style={[st.name, { flex: 2 }]}>{p.name}</Text>
                <Text style={[st.stats, { color: '#4CAF50' }]}>W:{p.wins}</Text>
                <Text style={[st.stats, { color: '#E53935' }]}>L:{p.losses}</Text>
                <Text style={[st.stats, { color: '#FFC107' }]}>D:{p.draws}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={[st.b, { marginTop: 20, backgroundColor: '#555' }]} onPress={() => setShowLeaderboard(false)}>
          <Text style={st.bt}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  // Home (Idle / Queue)
  if (status === 'idle' || status === 'queue')
    return (
      <SafeAreaView style={st.c}>
        <Text style={st.title}>🎮 Tic Tac Toe</Text>
        <TextInput
          value={name === 'Enter Your Name' ? '' : name}
          onFocus={() => {
            if (name === 'Enter Your Name') setName('');
          }}
          onBlur={() => {
            if (name.trim() === '') setName('Enter Your Name');
          }}
          onChangeText={setName}
          style={st.in}
          placeholder={name === 'Enter Your Name' ? 'Enter Your Name' : ''}
          placeholderTextColor="#888"
        />

        <TouchableOpacity style={st.b} onPress={() => findMatch('human')}>
          <Text style={st.bt}>Find Match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.b, { backgroundColor: '#4CAF50' }]} onPress={() => findMatch('bot')}>
          <Text style={st.bt}>Play with Bot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.b, { backgroundColor: '#444' }]} onPress={fetchLeaderboard}>
          <Text style={st.bt}>View Leaderboard</Text>
        </TouchableOpacity>
        {status === 'queue' && (
          <>
            <Text style={{ color: '#aaa', marginTop: 10 }}>Searching for opponent...</Text>
            <ActivityIndicator style={{ marginTop: 10 }} color="#03A9F4" />
          </>
        )}
      </SafeAreaView>
    );

  // Game Screen (playing or ended)
  return (
    <SafeAreaView style={st.c}>
      <Text style={st.title}>You are {you}</Text>
      <Text style={st.subtitle}>Opponent: {opponent}</Text>
      <Text style={st.subtitle}>Turn: {turn}</Text>
      <View style={st.g}>
        {board.map((v, i) => (
          <TouchableOpacity key={i} style={st.cell} onPress={() => makeMove(i)}>
            <Text style={[st.ct, { color: v === 'X' ? '#03A9F4' : '#E91E63' }]}>{v || ''}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {winner && (
        <>
          <Text style={[st.w, { color: winner === 'draw' ? '#FFC107' : winner === you ? '#4CAF50' : '#F44336' }]}>
            {winner === 'draw' ? 'Draw!' : winner === you ? 'You Win!' : 'You Lose!'}
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 20 }}>
            <TouchableOpacity style={[st.b, { backgroundColor: '#43A047', marginHorizontal: 10 }]} onPress={playAgain}>
              <Text style={st.bt}>Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[st.b, { backgroundColor: '#555', marginHorizontal: 10 }]}
              onPress={() => {
                setBoard(Array(9).fill(null));
                setWinner(null);
                setGame(null);
                setStatus('idle');
              }}
            >
              <Text style={st.bt}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', padding: 20 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 10 },
  subtitle: { color: '#aaa', fontSize: 18 },
  in: {
    backgroundColor: '#1b1b1b',
    color: '#fff',
    padding: 10,
    borderRadius: 10,
    width: 220,
    marginBottom: 10,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  b: { backgroundColor: '#2962ff', padding: 10, borderRadius: 10, width: 180, alignItems: 'center', marginTop: 10 },
  bt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  g: { width: 300, height: 300, flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 },
  cell: { width: 100, height: 100, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  ct: { color: '#fff', fontSize: 42, fontWeight: '700' },
  w: { color: '#fff', fontSize: 22, marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: '#333', borderBottomWidth: 1, paddingVertical: 8 },
  rank: { width: 30, textAlign: 'center', fontWeight: '700', fontSize: 16 },
  name: { color: '#fff', fontWeight: '600', fontSize: 15 },
  stats: { width: 60, textAlign: 'center', fontWeight: '600' },
});
