import React, { useState, useEffect, useRef } from "react";

export default function TodoAlarm({ user }) {
  const [todos, setTodos] = useState(() => JSON.parse(localStorage.getItem("todos_" + user.uid)) || []);
  const [input, setInput] = useState("");
  const alarmRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("todos_" + user.uid, JSON.stringify(todos));
  }, [todos, user]);

  // Alarm ringing logic
  useEffect(() => {
    if (!alarmRef.current) {
      alarmRef.current = new Audio();
      alarmRef.current.src = "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg";
      alarmRef.current.loop = true;
    }
  }, []);

  function addTodo() {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input.trim() }]);
    setInput("");
  }

  function removeTodo(id) {
    setTodos(todos.filter((t) => t.id !== id));
  }

  function playAlarm() {
    if (alarmRef.current) {
      alarmRef.current.play();
    }
  }

  function stopAlarm() {
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
  }

  return (
    <div className="todo-alarm">
      <h3>To-Do List & Alarm (Basic)</h3>
      <input
        type="text"
        placeholder="Add a task"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addTodo()}
      />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map(({ id, text }) => (
          <li key={id}>
            {text} <button onClick={() => removeTodo(id)}>Delete</button>
          </li>
        ))}
      </ul>
      <div>
        <button onClick={playAlarm}>Play Alarm Sound</button>
        <button onClick={stopAlarm}>Stop Alarm Sound</button>
      </div>
    </div>
  );
}
