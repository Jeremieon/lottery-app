import { useState, useEffect } from "react";

const GAMES_API   = process.env.REACT_APP_GAMES_API   || "http://192.168.0.71:8001";
const RESULTS_API = process.env.REACT_APP_RESULTS_API || "http://192.168.0.71:8002";

const S = {
  page:     { minHeight:"100vh", background:"#0B1F3A", fontFamily:"Arial,sans-serif", padding:"20px" },
  wrap:     { maxWidth:700, margin:"0 auto" },
  title:    { color:"#02C39A", fontSize:32, fontWeight:"bold", textAlign:"center", margin:"0 0 4px" },
  sub:      { color:"#94a3b8", textAlign:"center", fontSize:14, marginBottom:30 },
  card:     { background:"#1E3A5F", borderRadius:12, padding:24, marginBottom:20 },
  label:    { color:"#94a3b8", fontSize:12, fontWeight:"bold", textTransform:"uppercase", letterSpacing:1, marginBottom:12, display:"block" },
  numWrap:  { display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 },
  num:      { width:44, height:44, borderRadius:"50%", border:"2px solid #475569", background:"transparent", color:"#fff", fontSize:14, fontWeight:"bold", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", userSelect:"none" },
  numSel:   { background:"#028090", border:"2px solid #028090" },
  numWin:   { background:"#02C39A", border:"2px solid #02C39A" },
  numMatch: { background:"#F59E0B", border:"2px solid #F59E0B" },
  btn:      { background:"#028090", color:"#fff", border:"none", borderRadius:8, padding:"12px 24px", fontSize:14, fontWeight:"bold", cursor:"pointer", marginRight:10 },
  btn2:     { background:"transparent", color:"#02C39A", border:"2px solid #02C39A", borderRadius:8, padding:"10px 24px", fontSize:14, fontWeight:"bold", cursor:"pointer", marginRight:10 },
  win:      { color:"#02C39A", fontSize:22, fontWeight:"bold", textAlign:"center", padding:"12px 0" },
  lose:     { color:"#94a3b8", fontSize:18, textAlign:"center", padding:"12px 0" },
  tag:      { display:"inline-block", background:"#0B1F3A", color:"#94a3b8", borderRadius:20, padding:"4px 14px", fontSize:11, marginRight:6 },
  err:      { color:"#F87171", fontSize:13, marginTop:8 },
  step:     { color:"#02C39A", fontSize:13, fontWeight:"bold", marginBottom:8, display:"block" },
  footer:   { textAlign:"center", marginTop:24, padding:16, background:"#1E3A5F", borderRadius:8 },
  footerLabel: { color:"#475569", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:6, display:"block" },
  footerVal:   { color:"#02C39A", fontSize:13, fontFamily:"monospace" },
};

export default function App() {
  const [selected,    setSelected]    = useState([]);
  const [ticket,      setTicket]      = useState(null);
  const [draw,        setDraw]        = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [phase,       setPhase]       = useState("pick");
  const [serverInfo,  setServerInfo]  = useState({ games: null, results: null });

  useEffect(() => {
    fetch(`${RESULTS_API}/api/results/latest`)
      .then(r => r.json())
      .then(d => setDraw(null) || setLatest(d))
      .catch(() => setError("Could not reach Results API"));

    // ── Fetch which server/IP actually answered ──────────────
    fetch(`${GAMES_API}/health`)
      .then(r => r.json())
      .then(d => setServerInfo(prev => ({ ...prev, games: d })))
      .catch(() => setServerInfo(prev => ({ ...prev, games: { error: "unreachable" } })));

    fetch(`${RESULTS_API}/health`)
      .then(r => r.json())
      .then(d => setServerInfo(prev => ({ ...prev, results: d })))
      .catch(() => setServerInfo(prev => ({ ...prev, results: { error: "unreachable" } })));
  }, []);

  function setLatest(d) {
    setDraw(d.draw);
  }

  function handleNumberClick(n) {
    if (phase !== "pick") return;
    setError("");
    setSelected(prev => {
      if (prev.includes(n)) return prev.filter(x => x !== n);
      if (prev.length >= 5) { setError("You can only pick 5 numbers"); return prev; }
      return [...prev, n];
    });
  }

  async function randomPick() {
    if (phase !== "pick") return;
    setError("");
    const res  = await fetch(`${GAMES_API}/api/random`);
    const data = await res.json();
    setSelected(data.numbers);
  }

  async function buyTicket() {
    if (selected.length !== 5) { setError("Pick exactly 5 numbers first"); return; }
    setLoading(true);
    setError("");
    const res  = await fetch(`${GAMES_API}/api/tickets`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ numbers: selected }),
    });
    const data = await res.json();
    setTicket(data.ticket);
    setPhase("bought");
    setLoading(false);
  }

  async function triggerDraw() {
    setLoading(true);
    const res  = await fetch(`${RESULTS_API}/api/results/draw`, { method: "POST" });
    const data = await res.json();
    setDraw(data.draw);

    const checkRes  = await fetch(`${RESULTS_API}/api/results/check`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ numbers: selected }),
    });
    const checkData = await checkRes.json();
    setCheckResult(checkData);
    setPhase("revealed");
    setLoading(false);
  }

  function playAgain() {
    setSelected([]);
    setTicket(null);
    setDraw(null);
    setCheckResult(null);
    setError("");
    setPhase("pick");
  }

  const winningNums = draw?.winning_numbers  || [];
  const matchedNums = checkResult?.matched   || [];

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        <h1 style={S.title}>🎰 Lottery App</h1>
        <p style={S.sub}>Pick your numbers • Buy your ticket • Trigger the draw • See if you won</p>

        {/* ── STEP 1: Pick Numbers ── */}
        <div style={S.card}>
          <span style={S.step}>STEP 1 — Pick Your 5 Numbers</span>
          <span style={S.label}>Selected: {selected.length}/5</span>
          <div style={S.numWrap}>
            {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
              <div
                key={n}
                style={{
                  ...S.num,
                  ...(selected.includes(n) ? S.numSel : {}),
                  ...(phase !== "pick" ? { cursor:"default", opacity:0.5 } : {})
                }}
                onClick={() => handleNumberClick(n)}
              >
                {n}
              </div>
            ))}
          </div>
          {error && <p style={S.err}>⚠ {error}</p>}
          <div style={{ marginTop:16 }}>
            <button style={S.btn} onClick={randomPick} disabled={phase !== "pick"}>
              🎲 Random
            </button>
            <button
              style={{ ...S.btn, opacity: selected.length !== 5 || phase !== "pick" ? 0.5 : 1 }}
              onClick={buyTicket}
              disabled={loading || selected.length !== 5 || phase !== "pick"}
            >
              {loading && phase === "pick" ? "Saving..." : "🎟 Buy Ticket"}
            </button>
            {selected.length > 0 && phase === "pick" && (
              <button style={S.btn2} onClick={() => setSelected([])}>Clear</button>
            )}
          </div>
        </div>

        {/* ── STEP 2: Ticket Confirmation ── */}
        {ticket && (
          <div style={S.card}>
            <span style={S.step}>STEP 2 — Your Ticket is Locked In ✅</span>
            <span style={S.label}>Your numbers</span>
            <div style={S.numWrap}>
              {selected.map(n => (
                <div key={n} style={{ ...S.num, ...S.numSel }}>{n}</div>
              ))}
            </div>
            <button
              style={{ ...S.btn, opacity: phase !== "bought" ? 0.5 : 1 }}
              onClick={triggerDraw}
              disabled={loading || phase !== "bought"}
            >
              {loading ? "Drawing..." : "🥁 Trigger Draw"}
            </button>
          </div>
        )}

        {/* ── STEP 3: Draw Reveal ── */}
        {phase === "revealed" && draw && (
          <div style={S.card}>
            <span style={S.step}>STEP 3 — The Draw Results 🥁</span>
            <span style={S.label}>Winning Numbers</span>
            <div style={S.numWrap}>
              {winningNums.map(n => (
                <div key={n} style={{ ...S.num, ...(matchedNums.includes(n) ? S.numMatch : S.numWin) }}>
                  {n}
                </div>
              ))}
            </div>
            <span style={S.label}>Your Numbers</span>
            <div style={S.numWrap}>
              {selected.map(n => (
                <div key={n} style={{ ...S.num, ...(matchedNums.includes(n) ? S.numMatch : S.numSel) }}>
                  {n}
                </div>
              ))}
            </div>
            <p style={checkResult?.matched_count > 0 ? S.win : S.lose}>
              {checkResult?.message}
            </p>
            <button style={S.btn} onClick={playAgain}>🔄 Play Again</button>
          </div>
        )}

        {/* ── Server / Environment Info ── */}
        <div style={S.footer}>
          <span style={S.footerLabel}>Games API responded from</span>
          <div style={S.footerVal}>
            {serverInfo.games?.host || serverInfo.games?.error || "loading..."}
          </div>
          <span style={{ ...S.footerLabel, marginTop:10 }}>Results API responded from</span>
          <div style={S.footerVal}>
            {serverInfo.results?.host || serverInfo.results?.error || "loading..."}
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:10 }}>
          <span style={S.tag}>Games API: {GAMES_API}</span>
          <span style={S.tag}>Results API: {RESULTS_API}</span>
        </div>

      </div>
    </div>
  );
}
