import './App.css';
import Home from './components/Home';
import { Routes, Route } from 'react-router-dom';
import Editor from './components/Editor';
import { Toaster } from 'react-hot-toast';

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
