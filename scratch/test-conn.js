const https = require("https");

function test() {
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYnJrbmlwZmlzeWZwZ3R4dGtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMwODE2OSwiZXhwIjoyMDk3ODg0MTY5fQ.EVg2R-1NU1tw_A0SIU5luIzXz-6kpo6mu8QHcaVA-Ig";
  
  const options = {
    hostname: "ibbrknipfisyfpgtxtks.supabase.co",
    path: "/rest/v1/users?limit=1",
    method: "GET",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`
    },
    timeout: 5000
  };

  console.log("Sending request to Supabase via https module...");
  const req = https.request(options, (res) => {
    console.log("Response status:", res.statusCode);
    
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("Response data:", data);
    });
  });

  req.on("error", (error) => {
    console.error("Request failed:", error.message);
  });

  req.on("timeout", () => {
    console.error("Request timed out after 5 seconds");
    req.destroy();
  });

  req.end();
}

test();
