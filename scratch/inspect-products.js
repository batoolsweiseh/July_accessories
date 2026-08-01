const https = require("https");

function test() {
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYnJrbmlwZmlzeWZwZ3R4dGtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMwODE2OSwiZXhwIjoyMDk3ODg0MTY5fQ.EVg2R-1NU1tw_A0SIU5luIzXz-6kpo6mu8QHcaVA-Ig";
  
  const options = {
    hostname: "ibbrknipfisyfpgtxtks.supabase.co",
    path: "/rest/v1/",
    method: "GET",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`
    },
    timeout: 5000
  };

  console.log("Fetching products schema info from Supabase...");
  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const schema = JSON.parse(data);
        console.log("Details for /products properties:", schema.definitions?.products?.properties);
      } catch (err) {
        console.error("Failed to parse JSON:", err.message);
      }
    });
  });

  req.on("error", (error) => {
    console.error("Request failed:", error.message);
  });

  req.end();
}

test();
