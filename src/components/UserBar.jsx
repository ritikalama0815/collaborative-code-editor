/**
 * @fileoverview Toolbar avatar stack and popover listing who is in the room.
 */

import React, { useEffect, useRef, useState } from 'react'
import Avatar from 'react-avatar';

/**
 * One connected client as stored on the editor page.
 * @typedef {{ socketId: string, username?: string }} UserBarClient
 */

/**
 * Overlapping avatars (newest on the right). Click opens a name list.
 *
 * @param {{ users: UserBarClient[] }} props `users` from the Socket.IO `joined` payload.
 * @returns {JSX.Element}
 */
const UserBar = ({ users }) => {
  /** @type {[boolean, function(boolean|function(boolean): boolean): void]} Whether the member popover is open. */
  const [open, setOpen] = useState(false);
  /** @type {React.MutableRefObject<HTMLDivElement|null>} Root used to detect outside clicks. */
  const wrapRef = useRef(null);
  /** @type {UserBarClient[]} Clients that have a display name. */
  const visible = users.filter((user) => user.username);
  /** @type {UserBarClient[]} At most five avatars in the stack. */
  const shown = visible.slice(0, 5);
  /** @type {number} Hidden count shown as `+N` when more than five people are present. */
  const extra = visible.length - shown.length;

  useEffect(() => {
    /**
     * Closes the popover when the pointer is outside the bar.
     *
     * @param {MouseEvent} event Document mousedown.
     * @returns {void}
     */
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
