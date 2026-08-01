async function testApi() {
  const getRes = await fetch("http://localhost:3000/api/wheel-segments");
  const getData = await getRes.json();
  console.log("GET /api/wheel-segments response:", getData);

  const newSegments = [
    { label: "خصm 10%", color: "#FDE6EE", probability: 0.4 },
    { label: "خصm 50%", color: "#E0457D", probability: 0.6 }
  ];

  const postRes = await fetch("http://localhost:3000/api/wheel-segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments: newSegments })
  });
  const postData = await postRes.json();
  console.log("POST /api/wheel-segments response:", postData);

  const getRes2 = await fetch("http://localhost:3000/api/wheel-segments");
  const getData2 = await getRes2.json();
  console.log("GET after POST response:", getData2);
}

testApi().catch(console.error);
