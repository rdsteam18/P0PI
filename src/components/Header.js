import React from "react";

export default function Header({ logoUrl }) {
  return (
    <header className="header">
      <img src={logoUrl} alt="App Logo" className="logo" />
      <h1>Study Chat App</h1>
    </header>
  );
}
