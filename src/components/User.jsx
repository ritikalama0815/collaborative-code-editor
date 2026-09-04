/**
 * @fileoverview Single user row (avatar + name). Kept for reuse; the toolbar uses {@link UserBar}.
 */

import React from 'react'
import Avatar from 'react-avatar';

/**
 * Renders one collaborator, or nothing if `username` is missing.
 *
 * @param {{ username?: string }} props Display name from the room client list.
 * @returns {JSX.Element|null}
 */
const User = ({username}) => {
  if (!username) {
    return null;
  }

  return (
    <div className='d-flex align-items-center mb-2'>
      <Avatar name={username.toString()} size={45} round="50px" className='mr-3'/>
      <span className="mx-2">{username.toString()}</span>
    </div>
  )
}

export default User
