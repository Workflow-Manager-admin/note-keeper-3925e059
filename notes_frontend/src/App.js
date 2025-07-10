import React, { useState, useEffect, useRef } from "react";
import "./App.css";
// Import Supabase client and set up config
import { createClient } from "@supabase/supabase-js";

// Read config from .env if exists, otherwise fall back to hardcoded values for now
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://mzxyorlnbfdkneiezgjz.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16eHlvcmxuYmZka25laWV6Z2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNDUxMDksImV4cCI6MjA2NzYyMTEwOX0.URYpbwtC2u5ORBlUzpWPNspXMWq_cLBOKWMOgGbilyQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simple unique ID generator
function generateId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 12)
  );
}

// PUBLIC_INTERFACE
function App() {
  // Notes state: [{id, title, content, lastEdited}]
  const [notes, setNotes] = useState([]); // Start with empty, load from Supabase
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selected note ID
  const [selectedId, setSelectedId] = useState(null);
  // Editor input state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  // UI States
  const [editing, setEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch notes from Supabase
  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      setError("");
      // Change "notes" to your Supabase table name if needed
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("lastEdited", { ascending: false });
      if (error) {
        setError("Failed to fetch notes.");
        setNotes([]);
      } else {
        setNotes(data || []);
      }
      setLoading(false);
    }
    fetchNotes();
  }, []);

  // When selecting a note, load it into editor
  useEffect(() => {
    if (selectedId) {
      const note = notes.find((n) => n.id === selectedId);
      if (note) {
        setEditTitle(note.title);
        setEditContent(note.content);
        setEditing(false);
      }
    } else {
      setEditTitle("");
      setEditContent("");
      setEditing(false);
    }
  }, [selectedId]);

  // Responsive sidebar
  useEffect(() => {
    // Close sidebar on mobile
    const handleResize = () => {
      if (window.innerWidth < 600) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // PUBLIC_INTERFACE
  function handleSelectNote(id) {
    setSelectedId(id);
    setEditing(false);
    if (window.innerWidth < 600) setSidebarOpen(false);
  }

  // PUBLIC_INTERFACE
  async function handleNewNote() {
    setError("");
    // Insert new note into Supabase table "notes"
    const newNote = {
      title: "Untitled Note",
      content: "",
      lastEdited: new Date().toISOString(),
    };
    const { data, error: insertError } = await supabase
      .from("notes")
      .insert([newNote])
      .select();
    if (insertError) {
      setError("Failed to add note.");
      return;
    }
    if (data && data.length > 0) {
      setNotes([data[0], ...notes]);
      setSelectedId(data[0].id);
      setEditTitle(data[0].title);
      setEditContent("");
      setEditing(true);
      if (window.innerWidth < 600) setSidebarOpen(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleDeleteNote(id) {
    setError("");
    // Delete note from Supabase
    const { error: deleteError } = await supabase.from("notes").delete().eq("id", id);
    if (deleteError) {
      setError("Failed to delete note.");
      return;
    }
    setNotes(notes.filter((n) => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setEditTitle("");
      setEditContent("");
    }
  }

  // PUBLIC_INTERFACE
  function handleEdit() {
    setEditing(true);
  }

  // PUBLIC_INTERFACE
  async function handleSave() {
    setError("");
    // Update the note in Supabase
    if (!selectedId) {
      setError("No note selected.");
      return;
    }
    const updatedFields = {
      title: editTitle.trim() ? editTitle : "Untitled Note",
      content: editContent,
      lastEdited: new Date().toISOString(),
    };
    const { data, error: saveError } = await supabase
      .from("notes")
      .update(updatedFields)
      .eq("id", selectedId)
      .select();
    if (saveError) {
      setError("Failed to save note.");
      return;
    }
    // Replace note in notes array
    setNotes(notes.map((n) =>
      n.id === selectedId
        ? { ...n, ...updatedFields }
        : n
    ));
    setEditing(false);
  }

  // PUBLIC_INTERFACE
  function handleCancelEdit() {
    const note = notes.find((n) => n.id === selectedId);
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditing(false);
    } else {
      setEditing(false);
    }
  }

  // PUBLIC_INTERFACE
  function formatDate(iso) {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  // Keyboard shortcut for new note (ctrl+alt+n)
  useEffect(() => {
    const listener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === "n") {
        handleNewNote();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
    // eslint-disable-next-line
  }, [notes]);

  // Sidebar toggle for mobile
  const handleSidebarToggle = () => setSidebarOpen((open) => !open);

  // Layout
  return (
    <div className="notes-root">
      {/* Top Nav */}
      <nav className="nav-bar">
        <div className="nav-left">
          <span className="logo">
            <span className="logo-dot" />
            NoteKeeper
          </span>
        </div>
        <div className="nav-center">
          <button
            className="btn-accent"
            onClick={handleNewNote}
            aria-label="Add new note"
            title="Add note (Ctrl+Alt+N)"
          >
            + Add Note
          </button>
        </div>
        <div className="nav-right">
          <button
            className="sidebar-toggle"
            onClick={handleSidebarToggle}
            aria-label={sidebarOpen ? "Hide notes list" : "Show notes list"}
          >
            ☰
          </button>
        </div>
      </nav>
      <div className="main-content">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">Notes</div>
          {loading && (
            <div className="empty-sidebar">
              <span>Loading notes...</span>
            </div>
          )}
          {!loading && notes.length === 0 && (
            <div className="empty-sidebar">
              <span>No notes yet.</span>
            </div>
          )}
          {error && (
            <div className="empty-sidebar" style={{ color: 'red', fontWeight: 600 }}>{error}</div>
          )}
          <ul className="notes-list">
            {notes.map((note) => (
              <li
                key={note.id}
                className={
                  note.id === selectedId
                    ? "note-list-item selected"
                    : "note-list-item"
                }
                onClick={() => handleSelectNote(note.id)}
                tabIndex={0}
                role="button"
                aria-current={note.id === selectedId}
              >
                <div className="note-list-title">
                  {note.title || "Untitled Note"}
                </div>
                <div className="note-list-date">
                  {formatDate(note.lastEdited)}
                </div>
                <button
                  className="btn-delete"
                  title="Delete note"
                  aria-label="Delete"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </aside>
        {/* Main area: Note Editor or placeholder */}
        <section className="editor-section">
          {selectedId ? (
            <div className="note-editor">
              {/* Title */}
              {editing ? (
                <input
                  className="editor-title-input"
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  aria-label="Note title"
                  maxLength={120}
                  autoFocus
                />
              ) : (
                <div className="editor-title-row">
                  <h2 className="editor-title">
                    {editTitle || "Untitled Note"}
                  </h2>
                  <button className="btn-edit" title="Edit" aria-label="Edit" onClick={handleEdit}>✎ Edit</button>
                </div>
              )}
              {/* Content */}
              {editing ? (
                <textarea
                  className="editor-content-input"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={12}
                  aria-label="Note content"
                  placeholder="Write your note here..."
                  style={{ minHeight: 120 }}
                />
              ) : (
                <pre className="editor-content" tabIndex={0}>
                  {editContent || <span className="placeholder">No content yet.</span>}
                </pre>
              )}
              {/* Actions */}
              {editing ? (
                <div className="editor-actions">
                  <button className="btn-accent" onClick={handleSave}>Save</button>
                  <button className="btn-secondary" onClick={handleCancelEdit}>Cancel</button>
                </div>
              ) : null}
              {/* Metadata */}
              <div className="editor-meta">
                <span>
                  Last edited:{" "}
                  {formatDate(
                    notes.find((n) => n.id === selectedId)?.lastEdited || ""
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-editor">
              <div>Select a note from the list, or click <span className="new-note-link" onClick={handleNewNote}>Add Note</span> to get started!</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
