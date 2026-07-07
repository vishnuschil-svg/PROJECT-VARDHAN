import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChitDashboard from "./pages/chits/ChitDashboard";
import ChitGroups from "./pages/chits/ChitGroups";
import Members from "./pages/chits/Members";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chits" replace />} />
        <Route path="/chits" element={<ChitDashboard />} />
        <Route path="/chits/groups" element={<ChitGroups />} />
        <Route path="/chits/members" element={<Members />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
