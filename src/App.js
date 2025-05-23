import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';

import Home from './components/Home';
import VideosList from './components/VideosList';
import VideoDetails from './components/VideoDetails';
import UploadVideo from './components/UploadVideo';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/videos" element={<VideosList />} />
          <Route path="/video/:id" element={<VideoDetails />} />
          <Route path="/uploadvideo" element={<UploadVideo />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
