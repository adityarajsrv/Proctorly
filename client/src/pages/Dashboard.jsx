/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import Swal from "sweetalert2";
import WebCamFeed from "../components/WebCamFeed";

const Dashboard = () => {
  const API_BASE = import.meta.env.VITE_API_URL;

  // Persist candidate name via URL param
  const [searchParams] = useSearchParams();
  const candidateName = searchParams.get("candidate") || "Candidate";

  const [sessionTime, setSessionTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [facesDetected, setFacesDetected] = useState(0);
  const [objectDetected, setObjectDetected] = useState([]);
  const [eventLog, setEventLog] = useState([
    { time: new Date().toLocaleTimeString(), message: "Session started", type: "info" },
  ]);
  const [cameraError, setCameraError] = useState(false);

  const videoStreamRef = useRef(null);
  const lastEventTime = useRef({ face: 0, object: {} });
  const timerRef = useRef(null);
  const interviewEnded = useRef(false);
  const EVENT_COOLDOWN = 5000;

  // Initialize camera & microphone
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      videoStreamRef.current = stream;
      setIsRecording(true);
      setCameraError(false);
    } catch (err) {
      console.error("Camera or microphone access denied:", err);
      setCameraError(true);
      setIsRecording(false);
    }
  };

  // Add event log + API call
  const addEvent = async (msg, type = "info") => {
    if (interviewEnded.current) return;
    const newEvent = { time: new Date().toLocaleTimeString(), message: msg, type };
    setEventLog((prev) => [...prev, newEvent]);

    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName, message: msg, type }),
      });
      const data = await res.json();
      if (data.success) newEvent._id = data.event._id;
    } catch (err) {
      console.error("Failed to log event:", err);
    }
  };

  // Face detection handler
  const handleFaceDetected = (count) => {
    setFacesDetected(count);
    const now = Date.now();
    if (count === 0 && now - lastEventTime.current.face > EVENT_COOLDOWN) {
      addEvent("No face detected", "alert");
      lastEventTime.current.face = now;
    } else if (count > 1 && now - lastEventTime.current.face > EVENT_COOLDOWN) {
      addEvent("Multiple faces detected", "alert");
      lastEventTime.current.face = now;
    } else if (count === 1 && now - lastEventTime.current.face > EVENT_COOLDOWN) {
      addEvent("Single face detected", "info");
      lastEventTime.current.face = now;
    }
  };

  // Suspicious activity / proctor events
  const handleProctorEvent = (type) => {
    const now = Date.now();
    if (type === "no-face-10s") addEvent("No face for >10s", "alert");
    else if (type === "looking-away-5s") addEvent("Candidate looking away >5s", "alert");
    else if (type === "multiple-faces") addEvent("Multiple faces in frame", "alert");
    else if (type.startsWith("Detected ")) {
      const obj = type.replace("Detected ", "");
      if (!lastEventTime.current.object[obj] || now - lastEventTime.current.object[obj] > EVENT_COOLDOWN) {
        addEvent(`Suspicious item detected: ${obj}`, "alert");
        lastEventTime.current.object[obj] = now;
      }
      setObjectDetected((prev) => (prev.includes(obj) ? prev : [...prev, obj]));
      setTimeout(() => setObjectDetected((prev) => prev.filter((o) => o !== obj)), 5000);
    } else if (type === "eye-closure") addEvent("Eyes closed detected", "alert");
    else if (type === "background-voice") addEvent("Background voice detected", "alert");
  };

  // Stop camera + timer
  const stopStream = () => {
    clearInterval(timerRef.current);
    videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
  };

  // End interview & generate report
  const endInterview = async () => {
    stopStream();
    interviewEnded.current = true;

    const finalEventLog = [...eventLog];

    const weights = {
      "Background voice detected": 2,
      "Eyes closed detected": 5,
      "Multiple faces detected": 10,
      "No face for >10s": 8,
      "Candidate looking away >5s": 3,
      "Suspicious item detected: cell phone": 7,
      "Suspicious item detected: book": 7,
      "Suspicious item detected: laptop": 7,
      "Suspicious item detected: tablet": 7,
    };
    const maxDeduction = {
      "Background voice detected": 10,
      "Eyes closed detected": 15,
      "Multiple faces detected": 20,
      "No face for >10s": 15,
      "Candidate looking away >5s": 10,
      "Suspicious item detected: cell phone": 15,
      "Suspicious item detected: book": 15,
      "Suspicious item detected: laptop": 15,
      "Suspicious item detected: tablet": 15,
    };

    const deductionMap = {};
    finalEventLog.forEach((e) => {
      if (e.type === "alert") {
        const key = e.message;
        deductionMap[key] = Math.min((deductionMap[key] || 0) + (weights[key] || 0), maxDeduction[key] || 100);
      }
    });

    const totalDeduction = Object.values(deductionMap).reduce((a, b) => a + b, 0);
    const scaledDeduction = totalDeduction * Math.min(sessionTime / 60, 1);
    const integrityScore = (Math.max(0, 100 - scaledDeduction)).toPrecision(2);

    try {
      const eventIds = finalEventLog.filter((e) => e._id).map((e) => e._id);
      await fetch(`${API_BASE}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName, duration: sessionTime, events: eventIds, integrityScore }),
      });
    } catch (err) {
      console.error("Failed to save session:", err);
    }

    setEventLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), message: "Interview ended", type: "info" }]);
    generatePDF(integrityScore, finalEventLog.filter((e) => e.type === "alert"));

    Swal.fire({
      title: "Interview Ended",
      html: `
        <div class="text-left space-y-2">
          <p><strong>Candidate:</strong> ${candidateName}</p>
          <p><strong>Duration:</strong> ${formatTime(sessionTime)}</p>
          <p><strong>Total Alerts:</strong> ${finalEventLog.filter((e) => e.type === "alert").length}</p>
          <p class="text-sm text-gray-500 mt-2">PDF Report has been generated and downloaded.</p>
        </div>
      `,
      icon: "success",
      confirmButtonText: "Close",
      customClass: { popup: "rounded-2xl shadow-xl p-6", confirmButton: "bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700" },
      buttonsStyling: false,
    });
  };

  // PDF generation
  const generatePDF = (score, alerts) => {
    const doc = new jsPDF();
    let y = 20;
    const lineHeight = 6;
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(16);
    doc.text("Proctorly Interview Report", 14, y);
    y += 15;
    doc.setFontSize(12);
    doc.text(`Candidate: ${candidateName}`, 14, y); y += 10;
    doc.text(`Duration: ${formatTime(sessionTime)}`, 14, y); y += 10;
    doc.text(`Integrity Score: ${score}`, 14, y); y += 10;
    doc.text(`Total Alerts: ${alerts.length}`, 14, y); y += 15;
    doc.text("Event Details:", 14, y); y += 10;

    alerts.forEach((e) => {
      if (y + lineHeight > pageHeight - 10) { doc.addPage(); y = 20; }
      doc.text(`${e.time} - ${e.message}`, 14, y);
      y += lineHeight;
    });

    doc.save(`${candidateName}_Proctor_Report.pdf`);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTime((s) => s + 1), 1000);
    initCamera();
    return () => stopStream();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex justify-between items-center border-b p-4 bg-gray-50">
        <h1 className="text-2xl font-bold text-blue-900">Proctorly</h1>
        <div className="flex gap-6">
          <div>
            <div className="text-gray-600 text-sm">Candidate</div>
            <div className="font-semibold">{candidateName}</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Session Time</div>
            <div className="font-semibold">{formatTime(sessionTime)}</div>
          </div>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 p-4">
        <div className="lg:w-2/3 relative">
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white text-center p-4">
              <p className="mb-4">Camera & Microphone access required to start session.</p>
              <button className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700" onClick={initCamera}>Retry</button>
            </div>
          )}
          {videoStreamRef.current && (
            <WebCamFeed
              stream={videoStreamRef.current}
              onFaceDetected={handleFaceDetected}
              onProctorEvent={(type) => { if (!interviewEnded.current) handleProctorEvent(type); }}
              isRecording={isRecording}
              interviewEnded={interviewEnded.current}
            />
          )}
        </div>

        <aside className="lg:w-1/3 space-y-4">
          <div className="bg-white rounded p-4 shadow h-80 overflow-y-auto">
            <h3 className="font-medium mb-2">Event Log</h3>
            <ul className="space-y-1 text-sm">
              {eventLog.map((e, i) => (
                <li key={i} className={e.type === "alert" ? "text-red-600 font-medium" : "text-blue-600"}>
                  <span className="mr-2">{e.time}</span>{e.message}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded p-4 shadow space-y-2">
            <div>Current faces detected: <strong className={facesDetected > 1 ? "text-red-600" : "text-green-700"}>{facesDetected}</strong></div>
            <div>Suspicious items detected: {objectDetected.length > 0 ? <strong className="text-red-600">{objectDetected.join(", ")}</strong> : <span className="text-green-700">None</span>}</div>
          </div>
        </aside>
      </main>

      <div className="p-4 flex justify-center">
        <button className="w-full md:w-1/4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={endInterview}>
          End Interview & Generate Report
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
