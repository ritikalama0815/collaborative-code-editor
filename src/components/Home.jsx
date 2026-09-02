import React, { useState } from 'react'
import toast from 'react-hot-toast';
import { v4 as uuid} from "uuid" //create room
import { useNavigate } from 'react-router-dom';

const Home = () => {

  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const joinRoom= () =>{
    if (!roomId || !username) {
      toast.error("Group ID and username are required");
      return;
    }

    navigate(`/editor/${roomId}`, {
      state: { username }
    })

    toast.success("Joined the group successfully");
  }

  const generateRoomId = (event) =>{
    event.preventDefault();
    const id = uuid();
    setRoomId(id);
    toast.success("Group Created Successfully");
  }

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
