import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import NavbarMenu from "../../components/NavbarMenu";
import PlaceMap from "../../components/PlaceMap";
import { useAppData } from "../../context/AppDataContext";
import "../../App.css";

function normalizeJournalEntry(serverEntry) {
  return {
    id: serverEntry.id,
    title: serverEntry.title,
    coverImage: serverEntry.coverImage,
    entries: (serverEntry.places || []).map((p) => ({
      id: p.id,
      place: p.placeName,
      img: p.imageUrl,
      rating: p.rating,
      description: p.description,
      pros: (p.pros || []).map((x) => x.text),
      cons: (p.cons || []).map((x) => x.text),
      hotels: (p.hotels || []).map((h) => ({
        id: h.id,
        name: h.name,
        description: h.description,
      })),
    })),
  };
}

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function JournalViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { journalEntries } = useAppData();

  const [remoteJournal, setRemoteJournal] = useState(null);
  const [loadingRemote, setLoadingRemote] = useState(false);

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const localJournal = journalEntries.find((j) => String(j.id) === id);

  useEffect(() => {
    if (localJournal) return;

    const token = localStorage.getItem("wanderwise_token");
    if (!token) return;

    setLoadingRemote(true);
    fetch(`/api/journal/${id}/public`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => setRemoteJournal(data ? normalizeJournalEntry(data) : null))
      .catch(() => setRemoteJournal(null))
      .finally(() => setLoadingRemote(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, localJournal]);

  // Comments belong to the journal entry as a whole, keyed by its id —
  // load them independently of whether the entry itself is local or remote.
  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");
    if (!token) {
      setLoadingComments(false);
      return;
    }
    setLoadingComments(true);
    fetch(`/api/journal/${id}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [id]);

  const handlePostComment = async () => {
    const text = newComment.trim();
    if (!text || posting) return;

    setPosting(true);
    const token = localStorage.getItem("wanderwise_token");
    try {
      const resp = await fetch(`/api/journal/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (resp.ok) {
        const saved = await resp.json();
        setComments((prev) => [...prev, saved]);
        setNewComment("");
      }
    } catch (err) {
      console.warn("Failed to post comment:", err);
    } finally {
      setPosting(false);
    }
  };

  const journal = localJournal || remoteJournal;

  return (
    <div className="ww-guide-page">
      <header className="ww-navbar ww-navbar-compact">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <nav className="ww-nav-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/travel-tips">Guides</Link>
          <Link to="/hotels">Hotels</Link>
          <NavbarMenu />
        </nav>
        <div className="ww-nav-icons">
          <span onClick={() => navigate("/hotels")} style={{ cursor: "pointer" }}>🔍</span>
          <span onClick={() => navigate("/notifications")} style={{ cursor: "pointer" }}>🔔</span>
          <span onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>👤</span>
        </div>
      </header>

      <main className="ww-guide-main">
        {loadingRemote && !journal ? (
          <p className="ww-expense-empty">Loading...</p>
        ) : !journal ? (
          <p className="ww-expense-empty">Journal entry not found.</p>
        ) : (
          <>
            <h1 className="ww-guide-title">{journal.title}</h1>

            {journal.entries.length === 0 ? (
              <p className="ww-expense-empty">No places were added to this story.</p>
            ) : (
              journal.entries.map((entry) => (
                <section className="ww-guide-section" key={entry.id}>
                  <div className="ww-guide-intro">
                    <div className="ww-guide-text">
                      <p className="ww-guide-pin">
                        📍{entry.place || "Unnamed place"}{" "}
                        {"★".repeat(entry.rating)}
                        {"☆".repeat(5 - entry.rating)}
                      </p>
                      {entry.description && (
                        <p className="ww-guide-description">{entry.description}</p>
                      )}

                      {entry.pros?.length > 0 && (
                        <>
                          <p className="ww-guide-list-title">
                            Pros of Visiting {entry.place || "this place"}:
                          </p>
                          <ul className="ww-guide-list">
                            {entry.pros.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {entry.cons?.length > 0 && (
                        <>
                          <p className="ww-guide-list-title">
                            Cons of Visiting {entry.place || "this place"}:
                          </p>
                          <ul className="ww-guide-list">
                            {entry.cons.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                    <img
                      src={entry.img}
                      alt={entry.place || "place"}
                      className="ww-guide-image"
                    />
                  </div>

                  {entry.hotels?.length > 0 && (
                    <>
                      <h3 className="ww-guide-hotel-heading">Hotel Option</h3>
                      <div className="ww-guide-hotels-grid">
                        {entry.hotels.map((h) => (
                          <div className="ww-guide-hotel-card" key={h.id}>
                            <p className="ww-guide-hotel-name">🏨 {h.name}</p>
                            {h.description && (
                              <p className="ww-guide-hotel-desc">{h.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {entry.place && entry.place.trim() && (
                    <>
                      <h3 className="ww-guide-location-heading">Location</h3>
                      <div className="ww-guide-map">
                        <PlaceMap placeName={entry.place} height={220} />
                      </div>
                    </>
                  )}
                </section>
              ))
            )}

            {/* Comments belong to the WHOLE journal story, not a specific place */}
            <section className="ww-journal-comments">
              <h3 className="ww-guide-location-heading">
                Comments {comments.length > 0 && `(${comments.length})`}
              </h3>

              {loadingComments ? (
                <p className="ww-expense-empty">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="ww-expense-empty">No comments yet. Be the first!</p>
              ) : (
                <div className="ww-journal-comments-list">
                  {comments.map((c) => (
                    <div className="ww-journal-comment" key={c.id}>
                      <div
                        className="ww-journal-comment-avatar"
                        style={
                          c.avatarUrl
                            ? { backgroundImage: `url(${c.avatarUrl})` }
                            : undefined
                        }
                      />
                      <div className="ww-journal-comment-body">
                        <p className="ww-journal-comment-header">
                          <span className="ww-journal-comment-name">
                            {[c.firstName, c.lastName].filter(Boolean).join(" ") || "Student"}
                          </span>
                          <span className="ww-journal-comment-time">{timeAgo(c.createdAt)}</span>
                        </p>
                        <p className="ww-journal-comment-text">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="ww-journal-comment-form">
                <textarea
                  className="ww-journal-comment-input"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                />
                <button
                  className="ww-profile-new-btn"
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || posting}
                >
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}