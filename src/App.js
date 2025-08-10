import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import Header from "./components/Header";
import Login from "./components/Login";
import UserSearch from "./components/UserSearch";
import FriendRequests from "./components/FriendRequests";
import FriendsList from "./components/FriendsList";
import Chat from "./components/Chat";
import TodoAlarm from "./components/TodoAlarm";

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setSelectedFriend(null);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="app-container">
      <Header logoUrl="https://blogger.googleusercontent.com/img/a/AVvXsEhsu0LQxEIfNf0QPpNK6WG_WibJG9EceMhpXCcS-OrC_t4cAAWoDst8-kiH0Lsy59to2ngoQWsAdoHz2QHPd8Jz2HdK2DYoEjhdYVzlJ0WUkZq9vBbqVqk8xGj4g9QFTeWH-3kRVqtTZfPp8wMXZHxRgYKjPvUUiVfWYaV8z3MQyldDjSD7LqkmkKgW" />
      {!user && <Login />}
      {user && (
        <>
          <UserSearch user={user} />
          <FriendRequests user={user} />
          <FriendsList user={user} onSelectFriend={setSelectedFriend} selectedFriend={selectedFriend} />
          {selectedFriend && <Chat user={user} friend={selectedFriend} />}
          <TodoAlarm user={user} />
        </>
      )}
    </div>
  );
}
