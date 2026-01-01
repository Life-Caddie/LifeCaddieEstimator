export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Life Caddie API is running</h1>
      <ul>
        <li><a href="/api/session">/api/session</a></li>
      </ul>
      <p>Use your embedded HTML to call <code>/api/session</code> then <code>/api/analyze</code>.</p>
    </main>
  );
}