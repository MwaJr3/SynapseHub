import { useEffect, useMemo, useState } from 'react';
import type { ChallengeRecord } from '@/data/challengeManifest';
import { connectFourWinner, shuffled, ticTacToeResult, type Disc, type Mark } from '@/apps/gameLogic';

const sampleWords = ['ACCESSIBILITY', 'RESPONSIVE', 'JAVASCRIPT', 'COMPONENT', 'INTERACTION'];
const quizQuestions = [
  { question: 'Which element is used for the main page content?', choices: ['<main>', '<aside>', '<label>', '<small>'], answer: 0 },
  { question: 'Which attribute provides a programmatic label for a form control?', choices: ['aria-label', 'role', 'target', 'translate'], answer: 0 },
  { question: 'Which CSS unit is relative to the root font size?', choices: ['em', 'rem', 'px', 'vh'], answer: 1 },
  { question: 'Which HTTP method is conventionally used to retrieve a resource?', choices: ['POST', 'PATCH', 'GET', 'DELETE'], answer: 2 },
  { question: 'What does a button type="submit" do inside a form?', choices: ['Submits the form', 'Always resets the form', 'Opens a new tab', 'Copies text'], answer: 0 },
];

export function GameApp({ project }: { project: ChallengeRecord }) {
  if (project.slug === 'tic-tac-toe-game') return <TicTacToe />;
  if (project.slug === 'connect-four-game') return <ConnectFour />;
  if (project.slug === 'hangman-game') return <Hangman />;
  if (project.slug === 'frontend-quiz-app') return <Quiz />;
  return <Memory />;
}

function TicTacToe() {
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<Exclude<Mark, null>>('X');
  const [score, setScore] = useState({ X: 0, O: 0, draws: 0 });
  const result = ticTacToeResult(board);
  const play = (index: number) => {
    if (board[index] || result) return;
    const next = [...board]; next[index] = turn; setBoard(next);
    const win = ticTacToeResult(next);
    if (win === 'X' || win === 'O') setScore((current) => ({ ...current, [win]: current[win] + 1 }));
    if (win === 'draw') setScore((current) => ({ ...current, draws: current.draws + 1 }));
    setTurn(turn === 'X' ? 'O' : 'X');
  };
  return <div className="app-game-panel"><div className="app-game-heading"><div><p className="app-kicker">Two local players</p><h3>{result ? result === 'draw' ? 'Round drawn' : `${result} wins the round` : `${turn} to move`}</h3></div><button className="app-button app-button--small" onClick={() => { setBoard(Array(9).fill(null)); setTurn('X'); }}>New round</button></div><div className="app-score-row"><span>X <b>{score.X}</b></span><span>Draws <b>{score.draws}</b></span><span>O <b>{score.O}</b></span></div><div className="ttt-board" role="group" aria-label="Tic-tac-toe board">{board.map((mark, index) => <button key={index} disabled={Boolean(mark) || Boolean(result)} onClick={() => play(index)} aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ', empty'}`}>{mark}</button>)}</div></div>;
}

function ConnectFour() {
  const empty = (): Disc[][] => Array.from({ length: 6 }, () => Array<Disc>(7).fill(0));
  const [board, setBoard] = useState<Disc[][]>(empty);
  const [turn, setTurn] = useState<Disc>(1);
  const winner = connectFourWinner(board);
  const full = board.every((row) => row.every(Boolean));
  const drop = (col: number) => {
    if (winner || full) return;
    const row = [...board].map((cells) => [...cells]).reverse().findIndex((cells) => cells[col] === 0);
    if (row < 0) return;
    const target = 5 - row; const next = board.map((cells) => [...cells]); next[target]![col] = turn;
    setBoard(next); setTurn(turn === 1 ? 2 : 1);
  };
  return <div className="app-game-panel"><div className="app-game-heading"><div><p className="app-kicker">Local two-player game</p><h3>{winner ? `Player ${winner} connects four` : full ? 'Board full · draw' : `Player ${turn} to move`}</h3></div><button className="app-button app-button--small" onClick={() => { setBoard(empty()); setTurn(1); }}>Restart</button></div><div className="c4-controls" aria-label="Drop a disc in a column">{Array.from({ length: 7 }, (_, col) => <button key={col} disabled={Boolean(winner) || full || board[0]?.[col] !== 0} onClick={() => drop(col)} aria-label={`Drop disc in column ${col + 1}`}>↓</button>)}</div><div className="c4-board" role="grid" aria-label="Connect Four board">{board.map((row, r) => row.map((disc, c) => <span key={`${r}-${c}`} className={`c4-cell c4-cell--${disc}`} role="gridcell" aria-label={`Row ${r + 1}, column ${c + 1}${disc ? `, player ${disc}` : ', empty'}`} />))}</div></div>;
}

function Hangman() {
  const [word, setWord] = useState(() => sampleWords[Math.floor(Math.random() * sampleWords.length)] ?? 'INTERFACE');
  const [guessed, setGuessed] = useState<string[]>([]);
  const misses = guessed.filter((letter) => !word.includes(letter)).length;
  const won = [...word].every((letter) => guessed.includes(letter));
  const lost = misses >= 7 && !won;
  const guess = (letter: string) => { if (!won && !lost) setGuessed((current) => current.includes(letter) ? current : [...current, letter]); };
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (/^[a-z]$/i.test(event.key)) guess(event.key.toUpperCase()); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); });
  const reset = () => { const next = sampleWords.filter((item) => item !== word); setWord(next[Math.floor(Math.random() * next.length)] ?? sampleWords[0]!); setGuessed([]); };
  return <div className="app-game-panel"><div className="app-game-heading"><div><p className="app-kicker">Demo word set · browser only</p><h3>{won ? 'You found the word!' : lost ? `Round over · ${word}` : 'Guess the hidden word'}</h3></div><button className="app-button app-button--small" onClick={reset}>New word</button></div><p className="hangman-word" aria-label="Hidden word">{[...word].map((letter, index) => <span key={`${letter}-${index}`}>{guessed.includes(letter) || lost ? letter : '·'}</span>)}</p><p className="app-small-note">Incorrect guesses: {misses} / 7</p><div className="letter-grid">{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => <button key={letter} disabled={guessed.includes(letter) || won || lost} onClick={() => guess(letter)}>{letter}</button>)}</div><p className="app-small-note">You can also type letters on your keyboard.</p></div>;
}

function Quiz() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = quizQuestions[index];
  const submit = () => {
    if (selected === null) return;
    if (selected === q?.answer) setScore((value) => value + 1);
    if (index + 1 === quizQuestions.length) setFinished(true);
    else { setIndex((value) => value + 1); setSelected(null); }
  };
  return <div className="app-game-panel"><div className="app-game-heading"><div><p className="app-kicker">Sample questions · replace with your quiz data</p><h3>{finished ? 'Quiz complete' : `Question ${index + 1} of ${quizQuestions.length}`}</h3></div>{finished && <button className="app-button app-button--small" onClick={() => { setIndex(0); setSelected(null); setScore(0); setFinished(false); }}>Try again</button>}</div>{finished ? <div className="quiz-result"><strong>{score} / {quizQuestions.length}</strong><p>Your score for this sample set.</p></div> : <><h4 className="quiz-question">{q?.question}</h4><div className="quiz-choices">{q?.choices.map((choice, i) => <button key={choice} className={selected === i ? 'is-selected' : ''} onClick={() => setSelected(i)}>{choice}</button>)}</div><button className="app-button" disabled={selected === null} onClick={submit}>{index + 1 === quizQuestions.length ? 'Finish quiz' : 'Submit answer'}</button></>}</div>;
}

function Memory() {
  const [cards, setCards] = useState(() => shuffled(['●', '●', '▲', '▲', '■', '■', '◆', '◆', '✦', '✦', '☾', '☾', '✿', '✿', '⬟', '⬟']).map((symbol, index) => ({ id: index, symbol, open: false, matched: false })));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const open = useMemo(() => cards.filter((card) => card.open && !card.matched), [cards]);
  const done = cards.every((card) => card.matched);
  useEffect(() => { if (!running || done) return undefined; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [running, done]);
  useEffect(() => { if (open.length !== 2) return undefined; const timer = window.setTimeout(() => setCards((current) => current.map((card) => card.open && !card.matched ? { ...card, open: false } : card)), open[0]?.symbol === open[1]?.symbol ? 0 : 700); return () => window.clearTimeout(timer); }, [open]);
  const flip = (id: number) => {
    const card = cards.find((item) => item.id === id);
    if (!card || card.open || card.matched || open.length >= 2) return;
    setRunning(true); setCards((current) => current.map((item) => item.id === id ? { ...item, open: true } : item));
    if (open.length === 1) {
      setMoves((value) => value + 1);
      if (open[0]?.symbol === card.symbol) setCards((current) => current.map((item) => item.symbol === card.symbol ? { ...item, open: true, matched: true } : item));
    }
  };
  const reset = () => { setCards(shuffled(cards.map((card) => card.symbol)).map((symbol, id) => ({ id, symbol, open: false, matched: false }))); setMoves(0); setSeconds(0); setRunning(false); };
  return <div className="app-game-panel"><div className="app-game-heading"><div><p className="app-kicker">Symbol theme · 16 cards</p><h3>{done ? 'All pairs found!' : 'Find the matching pairs'}</h3></div><button className="app-button app-button--small" onClick={reset}>New game</button></div><div className="app-score-row"><span>Moves <b>{moves}</b></span><span>Time <b>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</b></span><span>Pairs <b>{cards.filter((card) => card.matched).length / 2} / 8</b></span></div><div className="memory-board">{cards.map((card) => <button key={card.id} className={card.open || card.matched ? 'is-open' : ''} disabled={card.matched} onClick={() => flip(card.id)} aria-label={card.open || card.matched ? `Card ${card.symbol}` : 'Flip hidden card'}>{card.open || card.matched ? card.symbol : '?'}</button>)}</div></div>;
}
