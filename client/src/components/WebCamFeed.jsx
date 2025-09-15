/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

const WebCamFeed = ({
  stream,
  onFaceDetected,
  onProctorEvent,
  isRecording,
  interviewEnded,
}) => {
  const videoRef = useRef(null);
  const animRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [objectModel, setObjectModel] = useState(null);

  const lastFaceTime = useRef(Date.now());
  const lastLookTime = useRef(Date.now());
  const lastEyeEvent = useRef(0);

  // Eye closure detection
  const EAR_THRESHOLD = 0.3;
  const EYE_CLOSED_SEC = 3;
  const eyeClosedStart = useRef(null);
  const [eyeClosed, setEyeClosed] = useState(false);

  // Audio detection
  const [audioDetected, setAudioDetected] = useState(false);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const computeEAR = (lm, left = true) => {
    const indices = left
      ? [33, 160, 158, 133, 153, 144]
      : [362, 385, 387, 263, 373, 380];
    const [p1, p2, p3, p4, p5, p6] = indices.map((i) => lm[i]);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
  };

  const isLookingAway = (lm) => {
    const nose = lm[1];
    const leftEye = lm[33];
    const rightEye = lm[263];
    const centerX = (leftEye.x + rightEye.x) / 2;
    return Math.abs(nose.x - centerX) > 0.1;
  };

  useEffect(() => {
    cocoSsd.load().then((model) => setObjectModel(model));
  }, []);

  // Detect objects
  const detectObjects = async () => {
    if (!videoRef.current || !objectModel) return;
    const predictions = await objectModel.detect(videoRef.current);
    predictions.forEach((pred) => {
      if (["cell phone", "book", "laptop", "tablet"].includes(pred.class)) {
        if (!interviewEnded) onProctorEvent?.(`Detected ${pred.class}`);
      }
    });
  };

  // Audio detection
  useEffect(() => {
    if (!stream) return;
    audioCtxRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    const mic = audioCtxRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    mic.connect(analyserRef.current);
    const dataArray = new Uint8Array(analyserRef.current.fftSize);

    const checkAudio = () => {
      if (!analyserRef.current || interviewEnded) return;
      analyserRef.current.getByteTimeDomainData(dataArray);
      let sum = 0;
      dataArray.forEach((v) => (sum += (v - 128) ** 2));
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms > 5) {
        if (!audioDetected) {
          setAudioDetected(true);
          if (!interviewEnded) onProctorEvent?.("background-voice");
        }
      } else if (audioDetected) {
        setAudioDetected(false);
      }
    };

    const audioInterval = setInterval(checkAudio, 500);
    return () => clearInterval(audioInterval);
  }, [stream, onProctorEvent, audioDetected, interviewEnded]);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;

    const faceMesh = new FaceMesh({
      locateFile: (f) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 3,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (interviewEnded) return;

      const faces = results.multiFaceLandmarks || [];
      const count = faces.length;
      onFaceDetected?.(count);

      if (count === 0) {
        setEyeClosed(false);
      } else {
        lastFaceTime.current = Date.now();
      }

      if (count > 1 && !interviewEnded) onProctorEvent?.("multiple-faces");

      if (count === 1) {
        const lm = faces[0];
        if (!isLookingAway(lm)) lastLookTime.current = Date.now();

        const leftEAR = computeEAR(lm, true);
        const rightEAR = computeEAR(lm, false);
        const ear = (leftEAR + rightEAR) / 2;

        if (ear < EAR_THRESHOLD) {
          if (!eyeClosedStart.current) eyeClosedStart.current = Date.now();
          if (Date.now() - eyeClosedStart.current > EYE_CLOSED_SEC * 1000) {
            if (!eyeClosed) {
              setEyeClosed(true);

              if (
                !lastEyeEvent.current ||
                Date.now() - lastEyeEvent.current > 3000
              ) {
                lastEyeEvent.current = Date.now();
                if (!interviewEnded) onProctorEvent?.("eye-closure");

                setTimeout(() => setEyeClosed(false), 4000);
              }
            }
          }
        } else {
          eyeClosedStart.current = null;
          if (eyeClosed) setEyeClosed(false);
        }
      }
    });

    const processFrame = async () => {
      if (videoRef.current.videoWidth > 0) {
        await faceMesh.send({ image: videoRef.current });
        await detectObjects();
      }
      if (!interviewEnded)
        animRef.current = requestAnimationFrame(processFrame);
    };

    const startVideo = async () => {
      await videoRef.current.play();
      await new Promise((r) => {
        const check = () =>
          videoRef.current.videoWidth > 0 ? r() : requestAnimationFrame(check);
        check();
      });
      setVideoReady(true);
      if (!interviewEnded)
        animRef.current = requestAnimationFrame(processFrame);
    };

    startVideo();

    return () => {
      cancelAnimationFrame(animRef.current);
      faceMesh.close();
    };
  }, [stream, objectModel, interviewEnded]);

  useEffect(() => {
    if (!onProctorEvent) return;
    const interval = setInterval(() => {
      if (interviewEnded) return;
      if (Date.now() - lastFaceTime.current > 10000) {
        onProctorEvent("no-face-10s");
        lastFaceTime.current = Date.now();
      }
      if (Date.now() - lastLookTime.current > 5000) {
        onProctorEvent("looking-away-5s");
        lastLookTime.current = Date.now();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [onProctorEvent, interviewEnded]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-inner">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      />
      {!videoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-white text-sm">
          Loading video…
        </div>
      )}

      <div className="absolute top-2 left-2 flex items-center space-x-2">
        <span
          className={`w-3 h-3 rounded-full ${
            isRecording ? "bg-red-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span
          className={`text-white text-sm font-medium ${
            isRecording ? "text-red-400" : "text-gray-300"
          }`}
        >
          {isRecording ? "Recording" : "Stopped"}
        </span>
      </div>

      {eyeClosed && (
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded">
          <span className="text-xs font-semibold">Eyes Closed!</span>
        </div>
      )}
    </div>
  );
};

export default WebCamFeed;
