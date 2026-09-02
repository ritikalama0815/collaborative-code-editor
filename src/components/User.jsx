import React from 'react'
import Avatar from 'react-avatar';

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
