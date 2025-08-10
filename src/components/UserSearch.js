import React, { useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

export default function UserSearch({ user }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function searchUsers(text) {
    if (text.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "users"), where("name", ">=", text), where("name", "<=", text + "\uf8ff"));
    const snapshot = await getDocs(q);
    const users = [];
    snapshot.forEach((doc) => {
      if (doc.id !== user.uid) users.push(doc.data());
    });
    setResults(users);
    setLoading(false);
  }

  async function sendFriendRequest(targetUid) {
    const targetRef = doc(db, "users", targetUid);
    try {
      await updateDoc(targetRef, { friendRequests: arrayUnion(user.uid) });
      alert("Friend request sent");
    } catch {
      alert("Failed to send friend request");
    }
  }

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="Search students by name"
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);
          searchUsers(e.target.value);
        }}
      />
      <div className="search-results">
        {loading && <p>Searching...</p>}
        {results.length === 0 && !loading && <p>No users found</p>}
        {results.map((u) => (
          <div key={u.uid} className="user-result">
            <img src={u.photo || ""} alt="profile" className="user-photo" />
            <span>{u.name}</span>
            <button onClick={() => sendFriendRequest(u.uid)}>Send Friend Request</button>
          </div>
        ))}
      </div>
    </div>
  );
}
