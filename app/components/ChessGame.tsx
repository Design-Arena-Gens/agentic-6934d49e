"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, Color, Move, Piece, Square } from "chess.js";

type BoardSquare = {
  square: Square;
  piece: Piece | null;
  isDark: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isCheck: boolean;
  isLastMove: boolean;
};

type MovePair = {
  ply: number;
  white?: string;
  black?: string;
};

const fileLabels = ["a", "b", "c", "d", "e", "f", "g", "h"];
const rankLabels = ["1", "2", "3", "4", "5", "6", "7", "8"];

const PIECES: Record<string, string> = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚"
};

function buildMovePairs(history: string[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      ply: i / 2 + 1,
      white: history[i],
      black: history[i + 1]
    });
  }
  return pairs;
}

function findKingSquare(chess: Chess, color: Color): Square | null {
  const board = chess.board();
  for (let rankIndex = 0; rankIndex < board.length; rankIndex += 1) {
    const rank = board[rankIndex];
    for (let fileIndex = 0; fileIndex < rank.length; fileIndex += 1) {
      const piece = rank[fileIndex];
      if (piece && piece.type === "k" && piece.color === color) {
        const targetRank = 8 - rankIndex;
        const square: Square = `${fileLabels[fileIndex]}${targetRank}` as Square;
        return square;
      }
    }
  }
  return null;
}

export default function ChessGame() {
  const chessRef = useRef(new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [pairs, setPairs] = useState<MovePair[]>([]);
  const [orientationWhite, setOrientationWhite] = useState(true);
  const [status, setStatus] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null
  );

  const updateDerivedState = () => {
    const chess = chessRef.current;
    const verboseHistory = chess.history();
    setHistory(verboseHistory);
    setPairs(buildMovePairs(verboseHistory));
    setIsGameOver(chess.isGameOver());
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        setStatus(`Checkmate • ${chess.turn() === "w" ? "Black" : "White"} wins`);
      } else if (chess.isStalemate()) {
        setStatus("Draw • Stalemate");
      } else if (chess.isInsufficientMaterial()) {
        setStatus("Draw • Insufficient material");
      } else if (chess.isThreefoldRepetition()) {
        setStatus("Draw • Threefold repetition");
      } else if (chess.isDraw()) {
        setStatus("Draw");
      }
    } else {
      const turn = chess.turn() === "w" ? "White" : "Black";
      if (chess.inCheck()) {
        setStatus(`${turn} to move • Check`);
      } else {
        setStatus(`${turn} to move`);
      }
    }
  };

  useEffect(() => {
    updateDerivedState();
  }, []);

  const boardSquares: BoardSquare[] = useMemo(() => {
    const chess = chessRef.current;
    const squares: BoardSquare[] = [];
    const ranks = orientationWhite ? [...rankLabels].reverse() : [...rankLabels];
    const files = orientationWhite ? [...fileLabels] : [...fileLabels].reverse();
    const checkSquare = chess.inCheck()
      ? findKingSquare(chess, chess.turn())
      : null;

    ranks.forEach((rank, rankIdx) => {
      files.forEach((file, fileIdx) => {
        const square = `${file}${rank}` as Square;
        const piece = chess.get(square) ?? null;
        const isDark = (rankIdx + fileIdx) % 2 === 1;
        const isSelected = selected === square;
        const isLegalTarget = legalTargets.includes(square);
        const isCheck = checkSquare === square;
        const isLastMove =
          lastMove?.from === square || lastMove?.to === square || false;
        squares.push({
          square,
          piece,
          isDark,
          isSelected,
          isLegalTarget,
          isCheck,
          isLastMove
        });
      });
    });

    return squares;
  }, [selected, legalTargets, orientationWhite, lastMove]);

  const handleSquareSelect = (square: Square) => {
    const chess = chessRef.current;
    const piece = chess.get(square);
    if (selected && selected === square) {
      setSelected(null);
      setLegalTargets([]);
      return;
    }

    if (piece && piece.color === chess.turn()) {
      const moves = chess.moves({ square, verbose: true }) as Move[];
      const targets = moves.map((move) => move.to as Square);
      setSelected(square);
      setLegalTargets(targets);
      return;
    }

    if (selected) {
      const attemptedMove = chess.move({
        from: selected,
        to: square,
        promotion: "q"
      });

      if (attemptedMove) {
        setSelected(null);
        setLegalTargets([]);
        setLastMove({
          from: attemptedMove.from as Square,
          to: attemptedMove.to as Square
        });
        updateDerivedState();
        return;
      }
    }

    setSelected(null);
    setLegalTargets([]);
  };

  const resetGame = () => {
    chessRef.current.reset();
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    updateDerivedState();
  };

  const undoMove = () => {
    const undone = chessRef.current.undo();
    if (undone) {
      setSelected(null);
      setLegalTargets([]);
      setLastMove({
        from: undone.from as Square,
        to: undone.to as Square
      });
      updateDerivedState();
    }
  };

  const handleRandomMove = () => {
    const chess = chessRef.current;
    const moves = chess.moves({ verbose: true }) as Move[];
    if (moves.length === 0) {
      updateDerivedState();
      return;
    }
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const executed = chess.move(randomMove.san);
    if (executed) {
      setSelected(null);
      setLegalTargets([]);
      setLastMove({
        from: executed.from as Square,
        to: executed.to as Square
      });
      updateDerivedState();
    }
  };

  return (
    <section className="chess-experience" aria-label="Chess game">
      <div className="chessboard" role="grid" aria-label="Chessboard">
        {boardSquares.map((square) => {
          const pieceKey = square.piece
            ? `${square.piece.color}${square.piece.type}`
            : null;
          const classes = [
            "square",
            square.isDark ? "dark" : "light",
            square.isSelected ? "selected" : "",
            square.isLegalTarget ? "move-option" : "",
            square.isCheck ? "check" : "",
            square.isLastMove ? "last-move" : ""
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={square.square}
              className={classes}
              role="gridcell"
              data-square={square.square}
              onClick={() => handleSquareSelect(square.square)}
              aria-label={`Square ${square.square}${
                pieceKey ? ` containing ${square.piece?.color === "w" ? "white" : "black"} ${pieceName(square.piece?.type)}` : ""
              }`}
            >
              {pieceKey ? PIECES[pieceKey] : ""}
            </button>
          );
        })}
      </div>

      <article className="status-panel">
        <h2>Match Control</h2>
        <div className="status-grid">
          <div className="status-card">
            <span>Status</span>
            <strong>{status}</strong>
          </div>
          <div className="status-card">
            <span>Orientation</span>
            <strong>{orientationWhite ? "White perspective" : "Black perspective"}</strong>
          </div>
          <div className="status-card">
            <span>Moves played</span>
            <strong>{history.length}</strong>
          </div>
        </div>

        <div className="controls">
          <button onClick={() => setOrientationWhite((prev) => !prev)}>
            Flip board
          </button>
          <button onClick={undoMove} disabled={history.length === 0} className="secondary">
            Undo
          </button>
          <button onClick={resetGame} className="secondary">
            Restart
          </button>
          <button onClick={handleRandomMove} disabled={isGameOver}>
            Random move
          </button>
        </div>

        <div className="move-list" aria-live="polite" aria-label="Move history">
          <table>
            <tbody>
              {pairs.length === 0 ? (
                <tr>
                  <td colSpan={3}>No moves yet.</td>
                </tr>
              ) : (
                pairs.map((pair) => (
                  <tr key={pair.ply}>
                    <td>{pair.ply}.</td>
                    <td>{pair.white ?? ""}</td>
                    <td>{pair.black ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function pieceName(type: Piece["type"] | undefined): string {
  switch (type) {
    case "p":
      return "pawn";
    case "n":
      return "knight";
    case "b":
      return "bishop";
    case "r":
      return "rook";
    case "q":
      return "queen";
    case "k":
      return "king";
    default:
      return "piece";
  }
}
