/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";

const WebCamFeed = ({ stream, onFaceDetected, isRecording }) => {
  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const lastFaceCount = useRef(0);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    videoRef.current.srcObject = stream;

    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      const count = results.multiFaceLandmarks?.length || 0;
      if (count !== lastFaceCount.current) {
        lastFaceCount.current = count;
        onFaceDetected(count);
      }
    });

    const processFrame = async () => {
      if (
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        await faceMesh.send({ image: videoRef.current });
      }
      animationRef.current = requestAnimationFrame(processFrame);
    };

    const start = async () => {
      await videoRef.current.play();

      // Wait until video has valid size
      await new Promise((resolve) => {
        const check = () => {
          if (
            videoRef.current.videoWidth > 0 &&
            videoRef.current.videoHeight > 0
          )
            resolve();
          else requestAnimationFrame(check);
        };
        check();
      });

      setVideoReady(true);
      animationRef.current = requestAnimationFrame(processFrame);
    };

    start();

    return () => {
      cancelAnimationFrame(animationRef.current);
      faceMesh.close();
    };
  }, [stream]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-inner">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        onLoadedData={() => setVideoReady(true)}
      />
      {!videoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-white text-sm">
          Loading video...
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
    </div>
  );
};

export default WebCamFeed;
