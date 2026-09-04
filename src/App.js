/**
 * @fileoverview Top-level routes and toast host for CoCo Editor.
 */

import './App.css';
import Home from './components/Home';
import { Routes, Route } from 'react-router-dom';
import Editor from './components/Editor';
import { Toaster } from 'react-hot-toast';

/**
 * Renders the landing page at `/` and the collaborative editor at `/editor/:roomId`.
 *
 * @returns {JSX.Element} Router outlet plus a bottom-center toast container.
 */
function App() {
  return (
    <>
    <Toaster position='bottom-center'/>
    <Routes>
      <Route path="/" element={<Home />}/>
      <Route path="/editor/:roomId" element={<Editor/>}/>
    </Routes>
    </>
  );
}


export default App;
