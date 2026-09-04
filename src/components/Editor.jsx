/**
 * @fileoverview Collaborative room: toolbar, CodeMirror host, Python output, sockets.
 */

import React, { useEffect, useRef, useState } from 'react';
import EditorAct from './EditorAct';
import UserBar from './UserBar';
import { initSocket } from '../socket';
import toast from 'react-hot-toast';

import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

/**
 * One person in a Socket.IO room, as sent on the `joined` event.
 * @typedef {{ socketId: string, username: string }} RoomClient
 */

/**
 * JSON body from `POST /run`.
 * @typedef {{ ok: boolean, output?: string, error?: string }} RunResult
 */

/**
 * Imperative API registered by {@link EditorAct} via `onReady`.
 * @typedef {{ setCode: function(string): void, getCode: function(): string }} EditorApi
 */

/**
 * Editor page for `/editor/:roomId`. Redirects home if the user skipped the join form
 * (no `location.state.username`).
 *
 * @returns {JSX.Element}
 */
const Editor = () => {
  /** @type {[RoomClient[], function(RoomClient[]|function(RoomClient[]): RoomClient[]): void]} People currently in the room. */
  const [user, setUser] = useState([]);
  /** @type {[boolean, function(boolean): void]} True while waiting on `POST /run`. */
  const [running, setRunning] = useState(false);
  /** @type {[RunResult|null, function(RunResult|null): void]} Last run output or error. */
  const [runResult, setRunResult] = useState(null);

  /** @type {React.MutableRefObject<import('socket.io-client').Socket|null>} Live socket for this room. */
  const socketRef = useRef(null);
  /** @type {React.MutableRefObject<EditorApi|null>} CodeMirror helpers (`getCode` / `setCode`). */
  const editorApiRef = useRef(null);
  /**
   * Code that arrived over the socket before CodeMirror finished mounting.
   * @type {React.MutableRefObject<string|null>}
   */
  const pendingCodeRef = useRef(null);
  /** @type {import('react-router-dom').Location} Must include `{ username }` from Home. */
  const location = useLocation();
  /** @type {string} Shared room id from the URL. */
  const {roomId} = useParams();
  /** @type {function(string): void} Used to leave and on connect failure. */
  const navigate = useNavigate();

  /**
   * Disconnects Socket.IO and returns to the landing page.
   *
   * @returns {void}
   */
  const leaveEditor = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    navigate('/');
  }

  /**
   * Copies the current room id so others can paste it on the landing page.
   *
   * @returns {Promise<void>}
   */
  const copyEditorID = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Editor ID copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy Editor ID');
      console.error(err);
    }
  }

  /**
   * POSTs the editor buffer to `/run` and stores stdout or the error in `runResult`.
   *
   * @returns {Promise<void>}
   */
  const runPython = async () => {
    /** @type {string} Current CodeMirror document, or empty if the editor is not ready. */
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
      /** @type {RunResult} Parsed runner response. */
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
    /** @type {import('socket.io-client').Socket} New connection for this room session. */
    const socket = initSocket();
    socketRef.current = socket;

    /**
     * Applies remote text now, or queues it until `onReady` runs.
     *
     * @param {string} code Latest document from the server.
     * @returns {void}
     */
    const applyRemoteCode = (code) => {
      if (!editorApiRef.current) {
        pendingCodeRef.current = code;
        return;
      }
      editorApiRef.current.setCode(code);
    };

    /**
     * Toast for other joiners and refresh the avatar list.
     *
     * @param {{ clients: RoomClient[], username: string }} payload Server `joined` payload.
     * @returns {void}
     */
    const handleJoined = ({ clients, username }) => {
      if (username !== location.state?.username) {
        toast.success(`${username} joined the room`);
      }
      setUser(clients);
    };

    /**
     * Removes a leaver from the avatar list.
     *
     * @param {{ socketId: string, username: string }} payload Server `disconnected` payload.
     * @returns {void}
     */
    const handleDisconnected = ({ socketId, username }) => {
      toast.success(`${username} left the group`);
      setUser((prev) => prev.filter((client) => client.socketId !== socketId));
    };

    /**
     * Applies a document broadcast from another client (or the initial snapshot).
     *
     * @param {{ code: string }} payload Server `code-change` payload.
     * @returns {void}
     */
    const handleCodeChange = ({ code }) => {
      applyRemoteCode(code);
    };

    /**
     * Emits `join` after the socket is connected.
     *
     * @returns {void}
     */
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
