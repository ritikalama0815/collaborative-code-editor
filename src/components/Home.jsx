/**
 * @fileoverview Landing page: join an existing room or create a new group id.
 */

import React, { useState } from 'react'
import toast from 'react-hot-toast';
import { v4 as uuid} from "uuid"
import { useNavigate } from 'react-router-dom';

/**
 * Pixel-art join form. Requires both a room id and a username before navigating.
 *
 * @returns {JSX.Element} Full-viewport landing layout.
 */
const Home = () => {
  /** @type {[string, function(string): void]} Room id from the input or from Create. */
  const [roomId, setRoomId] = useState("");
  /** @type {[string, function(string): void]} Display name sent to Socket.IO `join`. */
  const [username, setUsername] = useState("");
  /** @type {function(string, object=): void} React Router navigate helper. */
  const navigate = useNavigate();

  /**
   * Validates the form and opens `/editor/:roomId` with `{ username }` in location state.
   *
   * @returns {void}
   */
  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Group ID and username are required");
      return;
    }

    navigate(`/editor/${roomId}`, {
      state: { username }
    })

    toast.success("Joined the group successfully");
  }

  /**
   * Fills the Room ID field with a new UUID so the user can share it.
   *
   * @param {React.MouseEvent<HTMLButtonElement>} event Click on "Create a new group".
   * @returns {void}
   */
  const generateRoomId = (event) => {
    event.preventDefault();
    /** @type {string} Fresh collaborative room identifier. */
    const id = uuid();
    setRoomId(id);
    toast.success("Group Created Successfully");
  }

  /**
   * Form submit handler (Join button or Enter in an input).
   *
   * @param {React.FormEvent<HTMLFormElement>} event Native submit event.
   * @returns {void}
   */
  const onSubmit = (event) => {
    event.preventDefault();
    joinRoom();
  }

  return (
    <div
      className="landing-page"
      style={{ backgroundImage: 'url(/images/pixel-background.gif)' }}
    >
      <div className="landing-wrap">
        <form className="landing-panel" onSubmit={onSubmit}>
          <img src="/images/logo2.png" alt="coco" className="landing-logo" />
          <h1 className="landing-title">Enter the coding group</h1>
          <label className="pixel-label" htmlFor="room-id">Room ID</label>
          <input
            id="room-id"
            value={roomId}
            onChange={(event)=>setRoomId(event.target.value)}
            type="text"
            className="pixel-input"
            placeholder="paste or create a room id"
            autoComplete="off"
          />
          <label className="pixel-label" htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(event)=>setUsername(event.target.value)}
            type="text"
            className="pixel-input"
            placeholder="your name"
            autoComplete="off"
          />
          <div className="pixel-actions">
            <button type="submit" className="pixel-btn pixel-btn-join">Join the group</button>
            <button type="button" className="pixel-btn pixel-btn-create" onClick={generateRoomId}>Create a new group</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Home
