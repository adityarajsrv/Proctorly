import { useState } from "react";
import { useNavigate } from "react-router-dom";

const StartSession = () => {
  const [candidateName, setCandidateName] = useState("");
  const navigate = useNavigate();

  const handleStart = () => {
    if (!candidateName.trim()) {
      alert("Please fill all fields");
      return;
    }
    navigate(`/dashboard?candidate=${encodeURIComponent(candidateName.trim())}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-4">
          Proctoring Demo
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Enter candidate information to begin the interview session
        </p>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Candidate Name
          </label>
          <input
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Enter candidate's full name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
          />
        </div>
        <button
          onClick={handleStart}
          className="bg-blue-400 hover:bg-blue-500 text-black font-bold py-2 px-4 rounded w-full"
        >
          Start Session
        </button>
      </div>
    </div>
  );
};

export default StartSession;
