import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from '../Componets/Navbar'; // Ensure this path is correct
import { useSelector } from 'react-redux';
import io from 'socket.io-client';
import moment from 'moment';
import SeenMessageIcon from '../assets/SeenMessageIcon';


const Home = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [userListing, setUserListing] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { userData, token } = useSelector(state => state.authReducer);
  const socketRef = useRef(null);

  // Initialize socket only once
  useEffect(() => {
    socketRef.current = io('http://localhost:3000/', {
      extraHeaders: {
        Authorization: `${token}`
      }
    });

    // Set up event listeners
    socketRef.current.on('receive_message', (newMessage) => {
      handleUserListing(newMessage)
      if (roomData?.room_id === newMessage.room_id) {
        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    });
  
    socketRef.current.on('new_user', (newUser) => {
    handleUserUpdated(newUser)

    });

    socketRef.current.on('update_user_list', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, roomData?.room_id]); // Only re-run if token or room_id changes

  // Fetch user and room data
  useEffect(() => {
    axios.get(`http://localhost:3000/conversation/${userData?.user_id}?module_slug=shop&page=1&limit=5`)
      .then(response => {
        setUserListing(response.data.data);
      })
      .catch(error => console.error('Error fetching conversations:', error));

    if (roomData) {
      axios.get(`http://localhost:3000/chat/room-messages?room_id=${roomData?.room_id}&user_id=${userData?.user_id}`)
        .then(response => {
          setMessages(response.data.data);
        })
        .catch(error => console.error('Error fetching room messages:', error));
    }
  }, [userData, roomData]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (isSending || !message.trim()) return;  // Check if already sending or message is empty
  
    setIsSending(true); // Start sending process
  
    const messageData = {
      room_id: roomData.room_id,
      message,
      sender_id: userData.user_id,
      product_id: roomData?.product?.product_id,
      module_slug: roomData?.module_slug
    };
  
    try {
      console.log('i am sending message')
      await socketRef.current.emit('send_message', messageData);
      setMessage(''); // Clear the message input after sending
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false); // Reset the sending state regardless of success or failure
    }
  };
  

  const handleUserListing = (message) => {
  
    setUserListing((prevList) => {
      const updatedList = prevList.map((user) => {
        if (user.room_id === message.room_id && user.userData.user_id == message.sender_id) {
          return {
            ...user,
            lastMessage: message.message,
            lastMessageTime: message.created_at,
            unseen_count: user.unseen_count + 1,
          };
        }
        return user;
      });
  
      // Find the updated user to move to the 0 index
      const updatedUserIndex = updatedList.findIndex(
        (user) => user.room_id === message.room_id && user.userData.user_id == message.sender_id
      );
  
      if (updatedUserIndex !== -1) {
        const updatedUser = updatedList[updatedUserIndex];
        // Move the updated user to the 0 index
        updatedList.splice(updatedUserIndex, 1);
        return [updatedUser, ...updatedList];
      }
  
      return updatedList;
    });
  };
  
  const handleUserUpdated = (newUser) => {
  const validUser=userListing.find((v)=>v.room_id==newUser.data.room_id)
  

    if ((userData.user_id === newUser.receiver_id) &&  !validUser) {

      setUserListing((prevUserListing) => [newUser.data, ...prevUserListing]);
    }
  };
  

const handleListing=(v)=>{
  socketRef.current.emit('join_room', { room_id: v.room_id,user_id:userData?.user_id });
  const updatedUserList = userListing.map(user =>
    user.room_id === v.room_id ? { ...user, unseen_count: 0 } : user
  );

  setUserListing(updatedUserList);
  setRoomData(v)
 


}
console.log(onlineUsers)

const joinRoomUser=onlineUsers?.find((v)=>v.userId==userData?.user_id)
  return (
    <div className='bg-[#fafafa] h-screen'>
      <Navbar />
      <div className='h-[400px] mx-32 mt-10 border flex justify-center'>
        <div className='w-1/3 border bg-white'>
          <p className='text-xl font-bold pl-5 py-5'>Chat</p>
          {userListing?.map(v => {
            const isOnlineUser=onlineUsers?.find((a)=>a.userId==v.userData?.user_id)?.userId
            return(
            <div key={v.id} onClick={() =>handleListing(v)}
              className={`flex hover:bg-[#ff6846] rounded mx-2 cursor-pointer space-x-2 py-2 pl-4 items-center ${v.room_id === roomData?.room_id ? "bg-[#ff6846]" : ""}`}>
              <div className='w-12 h-12 bg-[#f7f7f7] relative uppercase text-center rounded-full text-2xl font-bold flex items-center justify-center'>
                {v.userData.username.charAt(0)}
               <div className={`h-3 w-3 rounded-full absolute right-0 bottom-0  ${isOnlineUser?'bg-green-500':'bg-yellow-500'} `}/>
              </div>
              <div className="flex flex-col flex-grow">
                <p className='text-[#32475C] font-bold text-lg'>{v.product.product_name.length > 15 ? `${v.product.product_name.substring(0, 15)}...` : v.product.product_name}</p>
                <div className='flex justify-between text-[#697A8D] items-center text-[11px] ml-3'>
                <p className='text-[#697A8D] font-bold text-[14px] '>{v.userData.username}</p>
               {(v.unseen_count !== 0 && userData?.user_id !== v.userData?.user_id) && <div className='bg-red-500 text-white rounded-full flex justify-center items-center ml-4 h-5 w-5'>{v.unseen_count}</div>}
                </div>
                <div className='flex justify-between text-[#697A8D] text-[11px]'>
                  <p>{v.lastMessage.length > 20 ? `${v.lastMessage.substring(0, 20)}...` : v.lastMessage + '...'}</p>
                  <p>{moment(v.lastMessageTime).fromNow()}</p>
                </div>
              </div>
            </div>
          )})}
        </div>
        <div className='w-full border'>
          {(roomData?.room_id ==joinRoomUser?.roomId) && (
            <div className='flex flex-col h-[400px] justify-between'>
              <div className='h-full overflow-y-auto'>
                {messages.map((msg, index) => {
                  const isOnlineUser=onlineUsers?.find((a)=>(a.userId !==  msg?.sender_id && a.roomId==msg.room_id))
                  const senn=msg.is_seen==true?true:isOnlineUser?true:false
                  return(
                  <>
                  <div key={index} className={`flex ${userData.user_id === msg.sender_id ? "justify-end" : "justify-start"} m-4`}>
                    <p className={`${userData.user_id === msg.sender_id ? "bg-[#FF6846]" : "bg-[#f7f7f7]"} rounded p-3`}>{msg.message}</p>
                 
                  </div>
                     {userData.user_id === msg.sender_id &&<div className='flex justify-end mr-4 items-center space-x-3 '><SeenMessageIcon is_seen={senn}/><p>{moment(msg?.created_at).fromNow()}</p></div>}
                     </>
                )})}
              </div>
              <div className='w-full p-4'>
                <div className='flex border h-12'>
                  <input type="text" placeholder="Type a message..." value={message} className='w-full border-none pl-4 focus:outline-none' onChange={(e) => setMessage(e.target.value)} />
                  <button onClick={sendMessage} disabled={isSending} className={`bg-blue-500 w-[80px] text-white ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}>Send</button>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
