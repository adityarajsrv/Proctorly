import { useState } from "react";
import { useNavigate } from "react-router-dom";

const StartSession = () => {
  const [candidateName, setCandidateName] = useState("");
  const [candidateID, setCandidateID] = useState("");
  const navigate = useNavigate();

  const handleStart = () => {
    if (!candidateName || !candidateID) {
      alert("Please fill all fields");
      return;
    }
    // Navigate to Dashboard with state
    navigate("/dashboard", { state: { candidateName, candidateID } });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow-lg shadow-gray-400 w-full max-w-lg max-h-lg">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-4">
          Proctoring Demo
        </h2>
        <p className="text-gray-600 text-center mb-6 text-md">
          Enter candidate information to begin the interview session
        </p>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Candidate Name
          </label>
          <input
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            type="text"
            placeholder="Enter candidate's full name"
          />

          <label className="block text-gray-700 mt-4 text-sm font-bold mb-2">
            Candidate ID
          </label>
          <input
            value={candidateID}
            onChange={(e) => setCandidateID(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            type="text"
            placeholder="Enter candidate's identification number"
          />
        </div>
        <button
          onClick={handleStart}
          className="cursor-pointer bg-blue-400 hover:bg-blue-500 text-black font-bold py-2 px-4 rounded w-full focus:outline-none focus:shadow-outline"
        >
          Start Session
        </button>
      </div>
    </div>
  );
};

export default StartSession;
