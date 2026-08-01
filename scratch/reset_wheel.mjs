async function reset() {
  const DEFAULT_PRIZES = [
    { label: 'خصم 5%',   color: '#FDE6EE', probability: 0.50 },
    { label: 'خصم 10%',  color: '#FBCFE8', probability: 0.30 },
    { label: 'خصم 15%',  color: '#F9A8D4', probability: 0.12 },
    { label: 'خصم 20%',  color: '#F472B6', probability: 0.05 },
    { label: 'خصم 30%',  color: '#EC4899', probability: 0.02 },
    { label: 'خصم 50%',  color: '#E0457D', probability: 0.01 },
  ];
  await fetch("http://localhost:3000/api/wheel-segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments: DEFAULT_PRIZES })
  });
  console.log("Reset completed.");
}
reset().catch(console.error);
