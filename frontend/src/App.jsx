import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Play,
  Pause,
  Download,
  Music,
  Type,
  Video,
  Settings,
  Save,
  Upload,
  Minus,
  Plus,
  Trash2,
  Smartphone,
  Monitor,
  Square,
  FileText,
  Layers,
  Check,
  Edit3
} from "lucide-react";

import { saveProject, listProjects, loadProject } from "./api";

/* ----------------------- CONSTANTS ----------------------- */

const LOCAL_STORAGE_KEY = "lyric_video_creator_v3";

const DEFAULT_LYRICS = `Paste your lyrics here
Then click "Done & Sync"
Press Play
Tap to sync lines
`;

const ASPECT_RATIOS = [
  { id: "16:9", width: 1920, height: 1080 },
  { id: "9:16", width: 1080, height: 1920 },
  { id: "1:1", width: 1080, height: 1080 }
];

/* ----------------------- APP ----------------------- */

export default function App() {
  /* ---------- DB ---------- */
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  /* ---------- MEDIA (CLEAN MODEL) ---------- */
  const [audioFile, setAudioFile] = useState(null); // File
  const [bgFile, setBgFile] = useState(null);       // File
  const [bgType, setBgType] = useState("none");     // video | image | none

  // Preview URLs (derived only)
  const audioUrl = useMemo(
    () => (audioFile ? URL.createObjectURL(audioFile) : null),
    [audioFile]
  );

  const bgUrl = useMemo(
    () => (bgFile ? URL.createObjectURL(bgFile) : null),
    [bgFile]
  );

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (bgUrl) URL.revokeObjectURL(bgUrl);
    };
  }, [audioUrl, bgUrl]);

  /* ---------- PLAYBACK ---------- */
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /* ---------- DATA ---------- */
  const [rawLyrics, setRawLyrics] = useState(DEFAULT_LYRICS);
  const [syncedLines, setSyncedLines] = useState([]);

  /* ---------- STYLE ---------- */
  const [style, setStyle] = useState({
    fontFamily: "'Roboto', sans-serif",
    fontSize: 48,
    color: "#ffffff",
    strokeColor: "#000000",
    strokeWidth: 4,
    bgColor: "#000000",
    bgOpacity: 0,
    bgPadding: 10,
    xPosition: 50,
    yPosition: 50,
    animation: "slideUp",
    aspectRatio: "16:9"
  });

  /* ---------- UI ---------- */
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [isEditingLyrics, setIsEditingLyrics] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  /* ---------- REFS ---------- */
  const audioRef = useRef(null);
  const bgVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const isDraggingRef = useRef(false);

  /* ---------- INIT ---------- */
  useEffect(() => {
    listProjects().then(setProjects).catch(console.error);
  }, []);

  /* ---------- FILE UPLOAD ---------- */
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === "audio") {
      setAudioFile(file);
      setIsPlaying(false);
      setCurrentTime(0);
    } else if (type === "bg") {
      setBgFile(file);
      setBgType(file.type.startsWith("video") ? "video" : "image");
    }
  };

  /* ---------- PLAYBACK ---------- */
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (bgType === "video") bgVideoRef.current?.pause();
    } else {
      audioRef.current.play();
      if (bgType === "video") bgVideoRef.current?.play();
    }

    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;

    const t = audioRef.current.currentTime;
    setCurrentTime(t);
    setDuration(audioRef.current.duration || 0);

    let idx = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i].time !== null && t >= syncedLines[i].time) {
        idx = i;
      }
    }
    setActiveLineIndex(idx);
  };

  /* ---------- LYRIC SYNC ---------- */
  const finishEditingAndSync = () => {
    const lines = rawLyrics
      .split("\n")
      .filter(Boolean)
      .map((text) => ({ text, time: null }));
    setSyncedLines(lines);
    setIsEditingLyrics(false);
  };

  const syncNextLine = () => {
    const idx = syncedLines.findIndex((l) => l.time === null);
    if (idx === -1 || !audioRef.current) return;

    const updated = [...syncedLines];
    updated[idx].time = audioRef.current.currentTime;
    setSyncedLines(updated);
  };

  const clearTimings = () => {
    if (!window.confirm("Clear all timings?")) return;
    setSyncedLines(syncedLines.map((l) => ({ ...l, time: null })));
    setActiveLineIndex(-1);
  };

  /* ---------- CANVAS RENDER ---------- */
  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const ar =
      ASPECT_RATIOS.find((r) => r.id === style.aspectRatio) ||
      ASPECT_RATIOS[0];

    canvas.width = ar.width;
    canvas.height = ar.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background
    if (bgType === "video" && bgVideoRef.current?.readyState >= 2) {
      ctx.drawImage(bgVideoRef.current, 0, 0, canvas.width, canvas.height);
    }

    if (bgType === "image" && bgUrl) {
      const img = new Image();
      img.src = bgUrl;
      if (img.complete) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    }

    // Text
    const line = syncedLines[activeLineIndex];
    if (line) {
      ctx.font = `bold ${style.fontSize}px Roboto`;
      ctx.textAlign = "center";
      ctx.fillStyle = style.color;
      ctx.fillText(
        line.text,
        (style.xPosition / 100) * canvas.width,
        (style.yPosition / 100) * canvas.height
      );
    }

    animationRef.current = requestAnimationFrame(renderFrame);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animationRef.current);
  });

  /* ---------- DRAGGING ---------- */
  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    setStyle((s) => ({
      ...s,
      xPosition: Math.min(100, Math.max(0, xPct)),
      yPosition: Math.min(100, Math.max(0, yPct))
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  /* ---------- SAVE / LOAD ---------- */
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const base64ToBlobUrl = (base64) => {
    const [meta, data] = base64.split(",");
    const mime = meta.match(/:(.*?);/)[1];
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: mime }));
  };

  const handleProjectSave = async () => {
    const payload = {
      rawLyrics,
      syncedLines,
      style,
      bgType,
      audioData: audioFile ? await fileToBase64(audioFile) : null,
      bgData: bgFile ? await fileToBase64(bgFile) : null
    };

    if (currentProjectId) {
      await saveProject({ id: currentProjectId, data: payload });
    } else {
      const res = await saveProject({ name: "Lyric Project", data: payload });
      setCurrentProjectId(res.id);
    }

    setStatusMsg("Project saved");
    setTimeout(() => setStatusMsg(""), 1500);
    setProjects(await listProjects());
  };

  const handleProjectLoad = async (id) => {
    const res = await loadProject(id);
    const d = res.data;

    setRawLyrics(d.rawLyrics);
    setSyncedLines(d.syncedLines);
    setStyle((s) => ({ ...s, ...d.style }));
    setBgType(d.bgType || "none");
    setIsEditingLyrics(false);
    setCurrentProjectId(id);

    if (d.audioData && audioRef.current) {
      audioRef.current.src = base64ToBlobUrl(d.audioData);
    }

    if (d.bgData && bgVideoRef.current) {
      bgVideoRef.current.src = base64ToBlobUrl(d.bgData);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden select-none">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Lyric Video Creator</h1>
          {statusMsg && (
            <div className="text-xs text-green-400 mt-1">{statusMsg}</div>
          )}
        </div>

        {/* Project Controls */}
        <div className="p-4 space-y-2 border-b border-gray-700">
          <button
            onClick={handleProjectSave}
            className="w-full bg-gray-700 hover:bg-gray-600 text-sm py-2 rounded"
          >
            Save Project
          </button>

          <select
            value={currentProjectId || ""}
            onChange={(e) => handleProjectLoad(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-sm"
          >
            <option value="" disabled>
              Load project
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Media Upload */}
        <div className="p-4 space-y-3 border-b border-gray-700">
          <label className="block text-xs">Audio</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, "audio")}
            className="w-full text-xs"
          />

          <label className="block text-xs">Background</label>
          <input
            type="file"
            accept="video/*,image/*"
            onChange={(e) => handleFileUpload(e, "bg")}
            className="w-full text-xs"
          />
        </div>

        {/* Lyrics */}
        <div className="flex-1 p-4 flex flex-col overflow-hidden">
          {isEditingLyrics ? (
            <>
              <textarea
                className="flex-1 w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm resize-none"
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
              />
              <button
                onClick={finishEditingAndSync}
                className="mt-2 bg-teal-600 hover:bg-teal-500 py-2 rounded text-sm"
              >
                Done & Sync
              </button>
            </>
          ) : (
            <>
              <button
                onClick={syncNextLine}
                className="mb-2 bg-teal-600 hover:bg-teal-500 py-3 rounded font-bold"
              >
                TAP TO SYNC (Space)
              </button>

              <div className="flex-1 overflow-y-auto space-y-1">
                {syncedLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border ${
                      idx === activeLineIndex
                        ? "bg-teal-900 border-teal-500"
                        : "bg-gray-800 border-gray-700"
                    }`}
                  >
                    <div className="text-xs text-gray-400">
                      {line.time !== null ? line.time.toFixed(2) + "s" : "--"}
                    </div>
                    <div className="text-sm">{line.text}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={clearTimings}
                className="mt-2 bg-red-900 hover:bg-red-800 text-sm py-2 rounded"
              >
                Clear Timings
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col bg-black">
        <div className="h-16 flex items-center px-6 gap-4 border-b border-gray-800">
          <button
            onClick={togglePlay}
            disabled={!audioFile}
            className={`px-4 py-2 rounded ${
              isPlaying ? "bg-red-500" : "bg-teal-500"
            }`}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={currentTime}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (audioRef.current) audioRef.current.currentTime = v;
                setCurrentTime(v);
              }}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center relative bg-black">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full cursor-move"
          />

          {!audioFile && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Upload audio to begin
            </div>
          )}
        </div>

        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />

        <video
          ref={bgVideoRef}
          src={bgType === "video" ? bgUrl || undefined : undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className="hidden"
        />
      </div>
    </div>
  );
}
