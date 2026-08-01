async function clearWheel() {
  await fetch("http://localhost:3000/api/wheel-segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments: [] })
  });
  console.log("Wheel database cleared successfully.");
}

clearWheel().catch(console.error);
