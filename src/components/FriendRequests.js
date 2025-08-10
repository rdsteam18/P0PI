import React, { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function FriendRequests({ user }) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setRequests(data.friendRequests || []);
    });
    return () => unsubscribe();
  }, [user]);

  async function acceptRequest(requesterUid) {
    const userRef = doc(db, "users", user.uid);
    const requesterRef = doc(db, "users", requesterUid);

    await updateDoc(userRef, {
      friends: arrayUnion(requesterUid),
      friendRequests: arrayRemove(requesterUid),
    });

    await updateDoc(requesterRef, {
      friends: arrayUnion(user.uid),
    });

    alert("Friend request accepted");
  }

  async function rejectRequest(requesterUid) {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      friendRequests: arrayRemove(requesterUid),
    });
    alert("Friend request rejected");
  }

  return (
    <div className="friend-requests">
      <h3>Friend Requests</h3>
      {requests.length === 0 && <p>No friend requests</p>}
      {requests.map((uid) => (
        <RequestItem key={uid} uid={uid} accept={acceptRequest} reject={rejectRequest} />
      ))}
    </div>
  );
}

function RequestItem({ uid, accept, reject }) {
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
    <div className="request-item">
      <img src={userData.photo || ""} alt="profile" className="user-photo" />
      <span>{userData.name}</span>
      <button onClick={() => accept(uid)}>Accept</button>
      <button onClick={() => reject(uid)}>Reject</button>
    </div>
  );
}
