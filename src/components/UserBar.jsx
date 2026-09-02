import React, { useEffect, useRef, useState } from 'react'
import Avatar from 'react-avatar';

const UserBar = ({ users }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const visible = users.filter((user) => user.username);
  const shown = visible.slice(0, 5);
  const extra = visible.length - shown.length;

  useEffect(() => {
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div className="user-bar" ref={wrapRef}>
      <button
        type="button"
        className="avatar-stack"
        onClick={() => setOpen((value) => !value)}
        aria-label="People in this room"
      >
        {visible.length === 0 && <span className="avatar-empty">No one here</span>}
        {extra > 0 && <span className="avatar-extra">+{extra}</span>}
        {shown.map((client) => (
          <Avatar
            key={client.socketId}
            name={client.username.toString()}
            size={34}
            round="50%"
            className="stack-avatar"
            title={client.username}
          />
        ))}
      </button>
      {open && (
        <div className="user-popover">
          <p className="user-popover-title">In this room</p>
          {visible.map((client) => (
            <div className="user-popover-row" key={client.socketId}>
              <Avatar name={client.username.toString()} size={32} round="50%" />
              <span>{client.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBar;
