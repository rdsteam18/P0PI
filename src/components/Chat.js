import React, { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function Chat({ user, friend }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user || !friend) return;

    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only show messages between user and friend
        if (
          (data.uid === user.uid && data.toUid === friend) ||
          (data.uid === friend && data.toUid === user.uid)
        ) {
          msgs.push({ id: doc.id, ...data });
        }
      });
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [user, friend]);

  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, "messages"), {
        text: input.trim(),
        uid: user.uid,
        name: user.displayName,
        toUid: friend,
        timestamp: serverTimestamp(),
      });
      setInput("");
    } catch (err) {
      alert("Failed to send message: " + err.message);
    }
  }

  return (
    <div className="chat-container">
      <h3>Chat with Friend</h3>
      <div className="messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`msg ${msg.uid === user.uid ? "sent" : "received"}`}
          >
            <strong>{msg.name}:</strong> {msg.text}
            <div className="time">{msg.timestamp?.toDate?.().toLocaleTimeString()}</div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>
      <div className="input-area">
        <input
          type="text"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
