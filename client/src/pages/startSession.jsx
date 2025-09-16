import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const StartSession = () => {
  const [candidateName, setCandidateName] = useState("");
  const navigate = useNavigate();

  const handleStart = (e) => {
    e.preventDefault(); 
    if (!candidateName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please enter the candidate's full name before starting.",
        confirmButtonText: "OK",
        customClass: {
          popup: "rounded-xl shadow-lg p-6",
          confirmButton:
            "bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 cursor-pointer",
        },
        buttonsStyling: false,
      });
      return;
    }
    navigate(`/dashboard?candidate=${encodeURIComponent(candidateName.trim())}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleStart}
        className="bg-white p-10 rounded-lg shadow-lg w-full max-w-lg"
      >
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
            onKeyDown={(e) => e.key === "Enter" && handleStart(e)}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-400 hover:bg-blue-500 text-black font-bold py-2 px-4 rounded w-full cursor-pointer"
        >
          Start Session
        </button>
      </form>
    </div>
  );
};

export default StartSession;
