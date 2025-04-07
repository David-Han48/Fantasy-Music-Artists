import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CreateAccount from "./pages/create_account.jsx";
import Actions from "./pages/action.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<CreateAccount />} />
        <Route path="/actions" element={<Actions />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
