import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StartSession from "./pages/startSession";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartSession />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
