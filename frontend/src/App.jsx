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

import { saveProject, listProjects, loadProject } from "./api.js";

// ===================== Base64 helpers (added) =====================

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const base64ToObjectURL = (fileObj) => {
  if (!fileObj) return null;

  // Backward compatibility: if older DB rows stored a URL string
  if (typeof fileObj === "string") return fileObj;

  if (!fileObj.data || typeof fileObj.data !== "string") return null;

  const parts = fileObj.data.split(",");
  if (parts.length < 2) return null;

  const meta = parts[0];
  const base64 = parts[1];

  const match = meta.match(/:(.*?);/);
  const mime = match ? match[1] : "application/octet-stream";

  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

  return URL.createObjectURL(new Blob([bytes], { type: mime }));
};

// --- Font Definitions ---
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Anton&family=Bangers&family=Creepster&family=Dancing+Script&family=Fredoka+One&family=Lato&family=Lobster&family=Merriweather&family=Montserrat&family=Open+Sans&family=Oswald&family=Pacifico&family=Playfair+Display&family=Poppins&family=Raleway&family=Roboto&family=Russo+One&family=Ubuntu&display=swap";

const FONTS = [
  { name: "Roboto (Sans)", value: "'Roboto', sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "Lato", value: "'Lato', sans-serif" },
  { name: "Oswald (Tall)", value: "'Oswald', sans-serif" },
  { name: "Raleway", value: "'Raleway', sans-serif" },
  { name: "Ubuntu", value: "'Ubuntu', sans-serif" },
  { name: "Poppins", value: "'Poppins', sans-serif" },
  { name: "Merriweather (Serif)", value: "'Merriweather', serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" },
  { name: "Anton (Bold)", value: "'Anton', sans-serif" },
  { name: "Russo One", value: "'Russo One', sans-serif" },
  { name: "Abril Fatface", value: "'Abril Fatface', cursive" },
  { name: "Lobster", value: "'Lobster', cursive" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Dancing Script", value: "'Dancing Script', cursive" },
  { name: "Bangers (Comic)", value: "'Bangers', cursive" },
  { name: "Creepster (Scary)", value: "'Creepster', cursive" },
  { name: "Fredoka One", value: "'Fredoka One', cursive" },
  { name: "Courier New", value: "'Courier New', monospace" }
];

const VISUALIZERS = [
  { id: "bars", name: "Classic Bars" },
  { id: "wave", name: "Neon Wave" },
  { id: "circle", name: "Pulse Circle" },
  { id: "particles", name: "Starfield" },
  { id: "spectrum", name: "Rainbow Spectrum" },
  { id: "none", name: "None (Background Only)" }
];

const ASPECT_RATIOS = [
  { id: "16:9", name: "YouTube (16:9)", width: 1920, height: 1080, icon: Monitor },
  { id: "9:16", name: "TikTok/Reels (9:16)", width: 1080, height: 1920, icon: Smartphone },
  { id: "1:1", name: "Square (1:1)", width: 1080, height: 1080, icon: Square }
];

const ANIMATIONS = [
  { id: "none", name: "None" },
  { id: "fade", name: "Fade In" },
  { id: "slideUp", name: "Slide Up" },
  { id: "zoom", name: "Zoom In" },
  { id: "pop", name: "Pop" }
];

const DEFAULT_LYRICS = `Paste your lyrics here...
Then click "Done & Sync"
Hit play and tap the button
To align each line
With the music!
Creating lyric videos
Is now super easy.`;

const LOCAL_STORAGE_KEY = "lyric_video_creator_v3";

export default function App() {
  // --- DB state ---
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // --- State ---
  // Media (now stored as {name,type,data(base64)}; backward compatible with old strings)
  const [audioFile, setAudioFile] = useState(null);
  const [bgFile, setBgFile] = useState(null);
  const [bgType, setBgType] = useState("none");

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Data (Persisted)
  const [rawLyrics, setRawLyrics] = useState(DEFAULT_LYRICS);
  const [syncedLines, setSyncedLines] = useState([]);

  // Styling State
  const [style, setStyle] = useState({
    fontFamily: "'Roboto', sans-serif",
    fontSize: 48,
    color: "#ffffff",
    inactiveColor: "#ffffff80",
    strokeColor: "#000000",
    strokeWidth: 4,
    bgColor: "#000000",
    bgOpacity: 0,
    bgPadding: 10,
    textAlign: "center",
    yPosition: 50,
    xPosition: 50,
    animation: "slideUp",
    aspectRatio: "16:9"
  });

  const [visualizerType, setVisualizerType] = useState("bars");
  const [vizColor, setVizColor] = useState("#00ffcc");

  // UI State
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [isEditingLyrics, setIsEditingLyrics] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // --- Refs ---
  const audioRef = useRef(null);
  const bgVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const isDraggingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // ===================== Runtime object URLs (added) =====================
  const audioUrl = useMemo(() => base64ToObjectURL(audioFile), [audioFile]);
  const bgUrl = useMemo(() => base64ToObjectURL(bgFile), [bgFile]);

  useEffect(() => {
    return () => {
      if (audioUrl && typeof audioFile !== "string") URL.revokeObjectURL(audioUrl);
      if (bgUrl && typeof bgFile !== "string") URL.revokeObjectURL(bgUrl);
    };
  }, [audioUrl, bgUrl, audioFile, bgFile]);

  // --- Init & Fonts ---
  useEffect(() => {
    if (!document.getElementById("google-fonts-link")) {
      const link = document.createElement("link");
      link.id = "google-fonts-link";
      link.href = GOOGLE_FONTS_URL;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    // Restore local session
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRawLyrics(parsed.rawLyrics || DEFAULT_LYRICS);
        setSyncedLines(parsed.syncedLines || []);
        setIsEditingLyrics(parsed.syncedLines && parsed.syncedLines.length > 0 ? false : true);
        setStyle((s) => ({ ...s, ...(parsed.style || {}) }));
        setVisualizerType(parsed.visualizerType || "bars");
        setVizColor(parsed.vizColor || "#00ffcc");
        setStatusMsg("Session restored");
        setTimeout(() => setStatusMsg(""), 3000);
      } catch (e) {
        console.error("Failed to load local save", e);
      }
    }
  }, []);

  // Load DB project list
  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await listProjects();
        setProjects(data);
      } catch (err) {
        console.error("Failed to load projects", err);
      }
    }
    fetchProjects();
  }, []);

  // --- Auto-Save (local) ---
  useEffect(() => {
    const dataToSave = {
      rawLyrics,
      syncedLines,
      style,
      visualizerType,
      vizColor
    };
    const timer = setTimeout(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    }, 1000);
    return () => clearTimeout(timer);
  }, [rawLyrics, syncedLines, style, visualizerType, vizColor]);

  // Initialize Audio Context
  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      if (audioRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    } else if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  };

  // --- Handlers ---
  // (changed) convert to base64 and store payload instead of URL string
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const payload = { name: file.name, type: file.type, data: base64 };

      if (type === "audio") {
        setAudioFile(payload);
        setIsPlaying(false);
        setCurrentTime(0);

        // If audio context already created, we keep using the same <audio> element.
        // No need to recreate sourceRef unless it was never created.
        // initAudio() will create it when play happens.
      } else if (type === "bg") {
        setBgFile(payload);
        setBgType(file.type.startsWith("video") ? "video" : "image");
      }
    } catch (err) {
      console.error("Failed to read file", err);
      setStatusMsg("File load failed");
      setTimeout(() => setStatusMsg(""), 2000);
    }
  };

  // --- DB SAVE ---
  const handleProjectSave = async () => {
    const projectData = {
      rawLyrics,
      syncedLines,
      style,
      visualizerType,
      vizColor,
      audioFile,
      bgFile,
      bgType
    };

    try {
      if (currentProjectId) {
        await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/projects/${currentProjectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Lyric Project", data: projectData })
        });
      } else {
        const res = await saveProject({ name: "Lyric Project", ...projectData });
        if (res?.id) setCurrentProjectId(res.id);
      }

      const refreshed = await listProjects();
      setProjects(refreshed);

      setStatusMsg("Project saved to database");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch (err) {
      console.error(err);
      setStatusMsg("Save failed");
      setTimeout(() => setStatusMsg(""), 2000);
    }
  };

  // --- DB LOAD ---
  const handleProjectLoad = async (id) => {
    try {
      const res = await loadProject(id);
      const data = res.data;

      setRawLyrics(data.rawLyrics || DEFAULT_LYRICS);
      setSyncedLines(data.syncedLines || []);
      setStyle((s) => ({ ...s, ...(data.style || {}) }));
      setVisualizerType(data.visualizerType || "bars");
      setVizColor(data.vizColor || "#00ffcc");
      setAudioFile(data.audioFile || null);
      setBgFile(data.bgFile || null);
      setBgType(data.bgType || "none");

      setIsEditingLyrics((data.syncedLines || []).length > 0 ? false : true);
      setActiveLineIndex(-1);
      setCurrentProjectId(Number(id));

      setStatusMsg("Project loaded from database");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch (err) {
      console.error(err);
      setStatusMsg("Load failed");
      setTimeout(() => setStatusMsg(""), 2000);
    }
  };

  const handleSRTExport = () => {
    let srtContent = "";
    syncedLines.forEach((line, index) => {
      if (line.time === null) return;

      const startTime = formatSRTTime(line.time);
      const nextTime =
        index < syncedLines.length - 1 && syncedLines[index + 1].time !== null
          ? syncedLines[index + 1].time
          : line.time + 3;
      const endTime = formatSRTTime(nextTime);

      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${line.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lyrics.srt";
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg("SRT Exported");
    setTimeout(() => setStatusMsg(""), 2000);
  };

  const formatSRTTime = (seconds) => {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    return date.toISOString().substr(11, 12).replace(".", ",");
  };

  // --- LYRIC EDITING LOGIC ---
  const startEditing = () => {
    setIsEditingLyrics(true);
  };

  const finishEditingAndSync = () => {
    const lines = rawLyrics
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((text) => ({ text, time: null }));

    if (syncedLines.length === lines.length) {
      const merged = lines.map((l, i) => ({
        text: l.text,
        time: syncedLines[i].time
      }));
      setSyncedLines(merged);
    } else {
      setSyncedLines(lines);
    }

    setIsEditingLyrics(false);
    setActiveLineIndex(-1);
  };

  // --- PLAYBACK ---
  const togglePlay = () => {
    initAudio();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (bgVideoRef.current && bgType === "video" && bgUrl) {
        bgVideoRef.current.pause();
      }
    } else {
      audioRef.current.play().catch((e) => console.error("Audio play error:", e));
      if (bgVideoRef.current && bgType === "video" && bgUrl) {
        const bgDuration = bgVideoRef.current.duration;
        const audioTime = audioRef.current.currentTime;
        if (Number.isFinite(bgDuration) && bgDuration > 0) {
          bgVideoRef.current.currentTime = audioTime % bgDuration;
        } else {
          bgVideoRef.current.currentTime = 0;
        }
        bgVideoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    if (Number.isFinite(t)) setCurrentTime(t);
    const d = audioRef.current.duration;
    if (Number.isFinite(d)) setDuration(d);

    let activeIdx = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i].time !== null && t >= syncedLines[i].time) activeIdx = i;
      else break;
    }
    setActiveLineIndex(activeIdx);
  };

  const syncNextLine = () => {
    const idx = syncedLines.findIndex((l) => l.time === null);
    if (idx !== -1) {
      const newLines = [...syncedLines];
      newLines[idx].time = audioRef.current ? audioRef.current.currentTime : 0;
      setSyncedLines(newLines);
    }
  };

  const adjustLineTiming = (idx, amount) => {
    const newLines = [...syncedLines];
    if (newLines[idx].time !== null) {
      newLines[idx].time = Math.max(0, newLines[idx].time + amount);
      setSyncedLines(newLines);
      if (!isPlaying && audioRef.current) {
        audioRef.current.currentTime = newLines[idx].time;
        setCurrentTime(newLines[idx].time);
      }
    }
  };

  const clearTimings = () => {
    if (!window.confirm("Clear all timing data?")) return;
    const lines = syncedLines.map((l) => ({ ...l, time: null }));
    setSyncedLines(lines);
    setActiveLineIndex(-1);
  };

  // --- Canvas Rendering ---
  const drawVisualizer = (ctx, width, height, dataArray) => {
    if (visualizerType === "none") return;

    ctx.fillStyle = vizColor;
    ctx.strokeStyle = vizColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = vizColor;

    if (visualizerType === "bars") {
      const barWidth = (width / dataArray.length) * 2.5;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 2) * (height / 255);
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    } else if (visualizerType === "wave") {
      ctx.lineWidth = 4;
      ctx.beginPath();
      const sliceWidth = width / dataArray.length;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    } else if (visualizerType === "circle") {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) / 4;
      ctx.beginPath();
      for (let i = 0; i < dataArray.length; i++) {
        const angle = (i / dataArray.length) * Math.PI * 2;
        const amp = dataArray[i] / 255;
        const r = radius + amp * 100;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (visualizerType === "particles") {
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      if (average > 80) {
        for (let i = 0; i < 10; i++) {
          const px = Math.random() * width;
          const py = Math.random() * height;
          const size = Math.random() * 5;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (visualizerType === "spectrum") {
      const barW = width / dataArray.length;
      for (let i = 0; i < dataArray.length; i++) {
        const hue = (i / dataArray.length) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        const h = (dataArray[i] / 255) * height;
        ctx.fillRect(i * barW, height - h, barW, h);
      }
    }

    ctx.shadowBlur = 0;
  };

  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const targetAR = ASPECT_RATIOS.find((r) => r.id === style.aspectRatio) || ASPECT_RATIOS[0];

    if (canvas.width !== targetAR.width || canvas.height !== targetAR.height) {
      canvas.width = targetAR.width;
      canvas.height = targetAR.height;
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);

    if (bgFile) {
      if (bgType === "video" && bgVideoRef.current) {
        const v = bgVideoRef.current;
        if (v.readyState >= 2 && v.videoWidth && v.videoHeight) {
          const scale = Math.max(width / v.videoWidth, height / v.videoHeight);
          const x = width / 2 - (v.videoWidth / 2) * scale;
          const y = height / 2 - (v.videoHeight / 2) * scale;
          ctx.drawImage(v, x, y, v.videoWidth * scale, v.videoHeight * scale);
        }
      } else if (bgType === "image") {
        if (bgUrl) {
          const img = new Image();
          img.src = bgUrl; // changed from bgFile to bgUrl
          if (img.complete && img.naturalHeight !== 0) {
            const scale = Math.max(width / img.width, height / img.height);
            const x = width / 2 - (img.width / 2) * scale;
            const y = height / 2 - (img.height / 2) * scale;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          }
        }
      }
    }

    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      drawVisualizer(ctx, width, height, dataArray);
    }

    const activeLine = syncedLines[activeLineIndex];
    if (activeLine && activeLine.text) {
      const timeSinceStart = currentTime - (activeLine.time ?? currentTime);
      let animYOffset = 0;
      let animAlpha = 1;
      let animScale = 1;

      if (style.animation === "fade") {
        animAlpha = Math.min(1, timeSinceStart * 3);
      } else if (style.animation === "slideUp") {
        animYOffset = Math.max(0, (1 - timeSinceStart * 4) * 50);
        animAlpha = Math.min(1, timeSinceStart * 4);
      } else if (style.animation === "zoom") {
        animScale = Math.min(1, 0.5 + timeSinceStart * 2);
      } else if (style.animation === "pop") {
        const t = Math.min(1, timeSinceStart * 5);
        animScale = t === 1 ? 1 : 1 + Math.sin(t * Math.PI) * 0.2;
      }

      ctx.save();
      ctx.font = `bold ${style.fontSize}px ${style.fontFamily.split(",")[0].replace(/'/g, "")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const x = (style.xPosition / 100) * width;
      const y = (style.yPosition / 100) * height + animYOffset;

      ctx.translate(x, y);
      ctx.scale(animScale, animScale);
      ctx.globalAlpha = animAlpha;

      if (style.bgOpacity > 0) {
        const metrics = ctx.measureText(activeLine.text);
        const textH = style.fontSize;
        const textW = metrics.width;
        const pad = style.bgPadding;

        ctx.fillStyle = style.bgColor;
        ctx.globalAlpha = style.bgOpacity * animAlpha;

        ctx.beginPath();
        ctx.roundRect(
          -textW / 2 - pad,
          -textH / 2 - pad + textH * 0.1,
          textW + pad * 2,
          textH + pad * 2,
          10
        );
        ctx.fill();
      }

      ctx.globalAlpha = animAlpha;

      if (style.strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth;
        ctx.strokeText(activeLine.text, 0, 0);
      }

      ctx.fillStyle = style.color;
      ctx.fillText(activeLine.text, 0, 0);
      ctx.restore();
    }

    animationRef.current = requestAnimationFrame(renderFrame);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animationRef.current);
  }, [style, activeLineIndex, visualizerType, vizColor, bgFile, bgUrl, currentTime, syncedLines, bgType]);

  // --- Dragging ---
  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };
  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, (y / rect.height) * 100));
    setStyle((s) => ({ ...s, xPosition: xPct, yPosition: yPct }));
  };
  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // --- Export ---
  const startExport = () => {
    if (!audioRef.current || !canvasRef.current || !audioContextRef.current || !sourceRef.current) return;

    setIsExporting(true);
    chunksRef.current = [];

    audioRef.current.currentTime = 0;
    if (bgVideoRef.current && bgType === "video") bgVideoRef.current.currentTime = 0;

    const canvasStream = canvasRef.current.captureStream(30);

    const dest = audioContextRef.current.createMediaStreamDestination();
    sourceRef.current.connect(dest);
    sourceRef.current.connect(audioContextRef.current.destination);

    const audioTrack = dest.stream.getAudioTracks()[0];
    const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), audioTrack]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm;codecs=vp9" });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lyric-video-${style.aspectRatio.replace(":", "-")}.webm`;
      a.click();
      setIsExporting(false);
      setIsPlaying(false);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();

    audioRef.current.play();
    if (bgVideoRef.current && bgType === "video") bgVideoRef.current.play();
    setIsPlaying(true);

    audioRef.current.onended = () => {
      recorder.stop();
      audioRef.current.onended = null;
    };
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditingLyrics && e.code === "Space") {
        e.preventDefault();
        syncNextLine();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditingLyrics, syncedLines]);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden select-none">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-y-auto custom-scrollbar relative z-20">
        <div className="p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Lyric Video Creator
          </h1>
          {statusMsg && <div className="text-xs text-green-400 mt-1 animate-pulse">{statusMsg}</div>}
        </div>

        {/* Project Management */}
        <div className="p-4 space-y-2 border-b border-gray-700 grid grid-cols-2 gap-2">
          <button
            onClick={handleProjectSave}
            className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 text-xs py-2 rounded"
          >
            <Save size={14} /> Save Proj
          </button>

          <select
            className="col-span-2 bg-gray-900 border border-gray-600 rounded p-1 text-xs"
            onChange={(e) => handleProjectLoad(e.target.value)}
            value={currentProjectId || ""}
          >
            <option value="" disabled>
              Select saved project
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({new Date(p.created_at).toLocaleString()})
              </option>
            ))}
          </select>

          <button
            onClick={handleSRTExport}
            className="col-span-2 flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 text-xs py-2 rounded text-blue-300"
          >
            <FileText size={14} /> Export Subtitles (.srt)
          </button>
        </div>

        {/* Media Upload */}
        <div className="p-4 space-y-4 border-b border-gray-700">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Upload size={12} /> Media Assets
          </h2>
          <div className="space-y-2">
            <div
              className={`p-2 rounded border ${
                audioFile ? "border-green-500 bg-green-900/20" : "border-gray-600 bg-gray-700"
              } text-xs relative overflow-hidden`}
            >
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileUpload(e, "audio")}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <Music size={14} className={audioFile ? "text-green-400" : "text-gray-400"} />
                <span>{audioFile ? "Audio Loaded" : "Upload Audio (MP3/WAV)"}</span>
              </div>
            </div>

            <div
              className={`p-2 rounded border ${
                bgFile ? "border-purple-500 bg-purple-900/20" : "border-gray-600 bg-gray-700"
              } text-xs relative overflow-hidden`}
            >
              <input
                type="file"
                accept="video/*,image/*"
                onChange={(e) => handleFileUpload(e, "bg")}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <Video size={14} className={bgFile ? "text-purple-400" : "text-gray-400"} />
                <span>{bgFile ? "Background Loaded" : "Upload Background"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visuals */}
        <div className="p-4 space-y-4 border-b border-gray-700">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Monitor size={12} /> Format
          </h2>

          <div className="grid grid-cols-3 gap-1">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.id}
                onClick={() => setStyle({ ...style, aspectRatio: ar.id })}
                className={`flex flex-col items-center justify-center p-2 rounded border ${
                  style.aspectRatio === ar.id ? "border-teal-500 bg-teal-900/30" : "border-gray-700 hover:bg-gray-700"
                }`}
              >
                <ar.icon size={16} className="mb-1" />
                <span className="text-[10px]">{ar.id}</span>
              </button>
            ))}
          </div>

          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 pt-2">
            <Settings size={12} /> Visuals
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] text-gray-400 block mb-1">Visualizer</label>
              <select
                value={visualizerType}
                onChange={(e) => setVisualizerType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-xs outline-none focus:border-teal-500"
              >
                {VISUALIZERS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-px bg-gray-700"></div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Font Family</label>
            <select
              value={style.fontFamily}
              onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-xs outline-none focus:border-purple-500"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Animation</label>
            <select
              value={style.animation}
              onChange={(e) => setStyle({ ...style, animation: e.target.value })}
              className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-xs outline-none focus:border-blue-500"
            >
              {ANIMATIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Text Size</label>
              <input
                type="number"
                value={style.fontSize}
                onChange={(e) => setStyle({ ...style, fontSize: parseInt(e.target.value || "0", 10) })}
                className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Outline Width</label>
              <input
                type="number"
                value={style.strokeWidth}
                onChange={(e) => setStyle({ ...style, strokeWidth: parseInt(e.target.value || "0", 10) })}
                className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Text Color</label>
              <input
                type="color"
                value={style.color}
                onChange={(e) => setStyle({ ...style, color: e.target.value })}
                className="h-6 w-full bg-transparent cursor-pointer rounded overflow-hidden"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Outline Color</label>
              <input
                type="color"
                value={style.strokeColor}
                onChange={(e) => setStyle({ ...style, strokeColor: e.target.value })}
                className="h-6 w-full bg-transparent cursor-pointer rounded overflow-hidden"
              />
            </div>
          </div>

          <div className="h-px bg-gray-700"></div>

          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Layers size={12} /> Background Box
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Bg Color</label>
              <input
                type="color"
                value={style.bgColor}
                onChange={(e) => setStyle({ ...style, bgColor: e.target.value })}
                className="h-6 w-full bg-transparent cursor-pointer rounded overflow-hidden"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Bg Opacity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={style.bgOpacity}
                onChange={(e) => setStyle({ ...style, bgOpacity: parseFloat(e.target.value) })}
                className="w-full h-6 accent-teal-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-400 block mb-1">Bg Padding</label>
              <input
                type="range"
                min="0"
                max="50"
                value={style.bgPadding}
                onChange={(e) => setStyle({ ...style, bgPadding: parseInt(e.target.value || "0", 10) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Lyrics */}
        <div className="flex-1 p-4 flex flex-col overflow-hidden min-h-[300px]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Type size={12} /> Lyrics
            </h2>

            {!isEditingLyrics ? (
              <button
                onClick={startEditing}
                className="text-[10px] px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Edit3 size={10} /> Edit Lyrics
              </button>
            ) : (
              <button
                onClick={finishEditingAndSync}
                className="text-[10px] px-2 py-1 rounded bg-teal-600 border border-teal-500 text-white flex items-center gap-1 hover:bg-teal-500"
              >
                <Check size={10} /> Done & Sync
              </button>
            )}
          </div>

          {isEditingLyrics ? (
            <textarea
              className="flex-1 w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm font-mono text-gray-300 resize-none focus:border-teal-500 outline-none"
              value={rawLyrics}
              onChange={(e) => setRawLyrics(e.target.value)}
              placeholder="Paste lyrics here..."
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <button
                onClick={syncNextLine}
                className="w-full mb-2 bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-500 hover:to-green-500 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse"
              >
                TAP HERE TO SYNC
                <span className="text-[10px] opacity-70 font-normal">(or press Space)</span>
              </button>

              <div className="flex-1 overflow-y-auto bg-gray-900 border border-gray-700 rounded p-1 text-sm custom-scrollbar relative">
                <div className="space-y-1 pb-2">
                  {syncedLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded flex flex-col gap-1 transition-colors border ${
                        activeLineIndex === idx
                          ? "bg-teal-900/30 border-teal-500/50"
                          : line.time !== null
                          ? "bg-gray-800 border-gray-700"
                          : "bg-gray-800/30 border-transparent opacity-60"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span className="font-mono">{line.time !== null ? line.time.toFixed(1) + "s" : "--"}</span>
                        {line.time !== null && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => adjustLineTiming(idx, -0.1)} className="p-1 hover:bg-gray-700 rounded">
                              <Minus size={10} />
                            </button>
                            <button onClick={() => adjustLineTiming(idx, 0.1)} className="p-1 hover:bg-gray-700 rounded">
                              <Plus size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div
                        onClick={() => {
                          if (line.time !== null && audioRef.current) audioRef.current.currentTime = line.time;
                        }}
                        className={`cursor-pointer text-sm truncate ${
                          activeLineIndex === idx ? "text-white font-bold" : "text-gray-300"
                        }`}
                      >
                        {line.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-2">
            <button
              onClick={clearTimings}
              className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 text-xs py-2 rounded flex items-center justify-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> Clear Sync Data
            </button>
          </div>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col bg-black relative">
        <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shadow-md z-10">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={togglePlay}
              disabled={!audioFile}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 ${
                !audioFile
                  ? "bg-gray-700 opacity-50 cursor-not-allowed"
                  : isPlaying
                  ? "bg-red-500 shadow-lg shadow-red-500/20"
                  : "bg-teal-500 shadow-lg shadow-teal-500/20"
              }`}
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-1" />
              )}
            </button>

            <div className="flex-1 max-w-md flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono text-gray-400">
                <span className="text-teal-400">{currentTime.toFixed(1)}s</span>
                <span>{duration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                step="0.1"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (audioRef.current) audioRef.current.currentTime = val;
                  setCurrentTime(val);
                }}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={startExport}
              disabled={isExporting || !audioFile}
              className={`px-4 py-2 rounded flex items-center gap-2 font-medium text-sm transition-all border ${
                isExporting
                  ? "bg-red-600 border-red-500 animate-pulse cursor-wait text-white"
                  : "bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200"
              }`}
            >
              {isExporting ? (
                <span className="flex items-center gap-2">Recording...</span>
              ) : (
                <>
                  <Download size={16} /> Export Video
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-checkerboard p-8">
          <div
            className="relative shadow-2xl border border-gray-800 bg-black transition-all duration-300"
            style={{
              aspectRatio: style.aspectRatio.replace(":", "/"),
              height: style.aspectRatio === "9:16" ? "90%" : "auto",
              width: style.aspectRatio === "9:16" ? "auto" : "90%",
              maxHeight: "85vh",
              maxWidth: "90%"
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-full cursor-move"
            />

            {syncedLines.length > 0 && !isPlaying && !isDraggingRef.current && (
              <div className="absolute top-4 left-4 text-[10px] text-white/30 pointer-events-none border border-white/10 px-2 py-1 rounded bg-black/50">
                Drag text to reposition
              </div>
            )}
          </div>

          {/* Hidden media elements used by logic (src changed to derived urls) */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <video
            ref={bgVideoRef}
            src={bgUrl}
            muted
            loop
            className="hidden"
            playsInline
            crossOrigin="anonymous"
          />

          {!audioFile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 pointer-events-none backdrop-blur-sm">
              <div className="text-center p-8 border border-gray-700 rounded-xl bg-gray-900/90">
                <Music size={48} className="mx-auto text-teal-500 mb-4 animate-bounce" />
                <h3 className="text-white font-bold text-lg mb-2">Start Creating</h3>
                <p className="text-gray-400 text-sm">Upload an audio file on the left to begin.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
