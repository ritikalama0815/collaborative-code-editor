import React, { useEffect, useRef, useState } from 'react';
import EditorAct from './EditorAct';
import UserBar from './UserBar';
import { initSocket } from '../socket';
import toast from 'react-hot-toast';

import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

const Editor = () => {
  const [user, setUser] = useState([]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const socketRef = useRef(null);
  const editorApiRef = useRef(null);
  const pendingCodeRef = useRef(null);
  const location = useLocation();
  const {roomId} = useParams();
  const navigate = useNavigate();

  const leaveEditor = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    navigate('/');
  }

  const copyEditorID = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Editor ID copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy Editor ID');
      console.error(err);
    }
  }

  const runPython = async () => {
    const code = editorApiRef.current?.getCode() ?? '';
    if (!code.trim()) {
      setRunResult({ ok: false, error: 'There is no code to run.' });
      return;
    }
    setRunning(true);
    setRunResult(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setRunResult(data);
    } catch (err) {
      setRunResult({ ok: false, error: 'Could not reach the Python runner. Is the server running?' });
      console.error(err);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    const socket = initSocket();
    socketRef.current = socket;

    const applyRemoteCode = (code) => {
      if (!editorApiRef.current) {
        pendingCodeRef.current = code;
        return;
      }
      editorApiRef.current.setCode(code);
    };

    const handleJoined = ({ clients, username }) => {
      if (username !== location.state?.username) {
        toast.success(`${username} joined the room`);
      }
      setUser(clients);
    };

    const handleDisconnected = ({ socketId, username }) => {
      toast.success(`${username} left the group`);
      setUser((prev) => prev.filter((client) => client.socketId !== socketId));
    };

    const handleCodeChange = ({ code }) => {
      applyRemoteCode(code);
    };

    const joinRoom = () => {
      toast.success('User connected successfully');
      socket.emit('join', {
        roomId,
        username: location.state?.username || 'Anonymous',
      });
    };

    socket.on('joined', handleJoined);
    socket.on('disconnected', handleDisconnected);
    socket.on('code-change', handleCodeChange);

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', joinRoom);
    }

    socket.on('connect_error', (err) => {
      toast.error('Could not connect to the editor server');
      console.error(err);
      navigate('/');
    });

    return () => {
      socket.off('connect', joinRoom);
      socket.off('joined', handleJoined);
      socket.off('disconnected', handleDisconnected);
      socket.off('code-change', handleCodeChange);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, location.state?.username, navigate]);

  if(!location.state){
    return <Navigate to = "/" />
  }

  return (
    <div className="editor-shell">
      <header className="editor-toolbar">
        <div className="toolbar-left">
          <img src="/images/logo2.png" alt="coco" className="toolbar-logo" />
        </div>
        <div className="toolbar-right">
          <UserBar users={user} />
          <button className="toolbar-btn run" onClick={runPython} disabled={running}>
            {running ? 'Running...' : 'Run Python'}
          </button>
          <button className="toolbar-btn share" onClick={copyEditorID}>
            Share ID
          </button>
          <button className="toolbar-btn leave" onClick={leaveEditor}>
            Leave
          </button>
        </div>
      </header>

      <div className="editor-main">
        <EditorAct
          onCodeChange={(code) => {
            socketRef.current?.emit('code-change', { roomId, code });
          }}
          onReady={(api) => {
            editorApiRef.current = api;
            if (pendingCodeRef.current != null) {
              api.setCode(pendingCodeRef.current);
              pendingCodeRef.current = null;
            }
          }}
        />
      </div>

      <section className={`output-panel ${runResult && !runResult.ok ? 'is-error' : ''}`}>
        <div className="output-header">
          <span>{runResult && !runResult.ok ? 'Error' : 'Output'}</span>
          {runResult?.ok && <span className="output-ok">ran successfully</span>}
        </div>
        <pre className="output-body">
          {running && 'Running Python...'}
          {!running && !runResult && 'Press Run Python to see output here.'}
          {!running && runResult?.ok && runResult.output}
          {!running && runResult && !runResult.ok && runResult.error}
        </pre>
      </section>
    </div>
  );
};

export default Editor;
