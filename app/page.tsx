import ChessGame from "./components/ChessGame";

export default function Page() {
  return (
    <main>
      <header>
        <h1>Agentic Chess</h1>
        <p>Challenge a friend or practice your tactics on this responsive chessboard.</p>
      </header>
      <ChessGame />
      <footer>
        <p>Built with Next.js and chess.js. Deploy-ready for Vercel.</p>
      </footer>
    </main>
  );
}
