import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import WebCamFeed from "../components/WebCamFeed";

const Dashboard = () => {
  const location = useLocation();
  const { candidateName = "Random" } = location.state || {};

  const [sessionTime, setSessionTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [facesDetected, setFacesDetected] = useState(0);
  const [eventLog, setEventLog] = useState([
    { time: new Date().toLocaleTimeString(), message: "Session started" },
  ]);

  const lastLoggedFaceCount = useRef(0);
  const videoStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Handle face detection
  const handleFaceDetected = (count) => {
    setFacesDetected(count);

    if (count !== lastLoggedFaceCount.current) {
      let message = "";
      if (count === 0) message = "No face detected";
      else if (count > 1) message = "Multiple faces detected";
      else message = "Face detected";

      setEventLog((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString(), message },
      ]);

      lastLoggedFaceCount.current = count;
    }
  };

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => setSessionTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [candidateName]);

  // Initialize video stream and recording
  useEffect(() => {
    const initStreamAndRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true,
        });
        videoStreamRef.current = stream;

        // Setup MediaRecorder
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          console.log("Recording saved:", url);

          // Automatically download
          const a = document.createElement("a");
          a.href = url;
          a.download = `${candidateName}_interview.webm`;
          a.click();
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    initStreamAndRecorder();

    return () => {
      mediaRecorderRef.current?.stop();
      videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const endInterview = () => {
    mediaRecorderRef.current?.stop();
    videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    setIsRecording(false);

    alert("Interview Ended & Report Generated");
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-300 pb-4 mb-4 px-4 pt-4 bg-gray-50">
        <h1 className="text-2xl font-bold text-blue-900">Proctorly</h1>
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-5 mt-2 md:mt-0">
          <div className="text-center">
            <h3 className="text-gray-600 text-sm">Candidate</h3>
            <h3 className="font-semibold">{candidateName}</h3>
          </div>
          <div className="text-center">
            <h3 className="text-gray-600 text-sm">Session Time</h3>
            <h3 className="font-semibold">{formatTime(sessionTime)}</h3>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row px-4 gap-6">
        <div className="w-full lg:w-2/3">
          <WebCamFeed
            stream={videoStreamRef.current}
            onFaceDetected={handleFaceDetected}
            isRecording={isRecording}
          />
        </div>

        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-white rounded-lg p-6 shadow h-80 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-700">Event Log</h3>
            <ul className="mt-4 space-y-2">
              {eventLog.map((event, index) => (
                <li key={index} className="text-sm text-gray-600">
                  <span className="text-blue-600">{event.time}</span>{" "}
                  {event.message}
                </li>
              ))}
            </ul>
          </div>
          <div>Faces detected: {facesDetected}</div>
        </div>
      </div>

      <div className="px-4 mt-4 flex justify-center">
        <button
          className="cursor-pointer w-full md:w-1/4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
          onClick={endInterview}
        >
          End Interview & Generate Report
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
