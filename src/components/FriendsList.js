import React, { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function FriendsList({ user, onSelectFriend, selectedFriend }) {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setFriends(data.friends || []);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="friends-list">
      <h3>Friends</h3>
      {friends.length === 0 && <p>No friends yet</p>}
      {friends.map((uid) => (
        <FriendItem
          key={uid}
          uid={uid}
          onSelect={() => onSelectFriend(uid)}
          isSelected={selectedFriend === uid}
        />
      ))}
    </div>
  );
}

function FriendItem({ uid, onSelect, isSelected }) {
  const [userData, setUserData] = React.useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists() && mounted) {
        setUserData(docSnap.data());
      }
    }
    fetchUser();
    return () => {
      mounted = false;
    };
  }, [uid]);

  if (!userData) return null;

  return (
    <div
      className={`friend-item ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
      style={{ cursor: "pointer" }}
    >
      <img src={userData.photo || ""} alt="profile" className="user-photo" />
      <span>{userData.name}</span>
    </div>
  );
}
