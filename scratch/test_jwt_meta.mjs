import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function testJwt() {
  // Let's sign in a user to get their JWT
  const phone = "0597287067";
  const email = `${phone}@july-store.local`;
  
  // We don't know their password, but we can generate a session or sign in using admin.generateLink or check getUser
  // Or create a test user
  const testEmail = `test_${Date.now()}@july-store.local`;
  const { data: created, error: cErr } = await sb.auth.admin.createUser({
    email: testEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Test User", phone: "0500000000", points: 10 }
  });
  console.log("Created user:", created?.user?.id, cErr);

  const { data: signin, error: sErr } = await sb.auth.signInWithPassword({
    email: testEmail,
    password: "Password123!"
  });
  const jwt = signin.session.access_token;
  console.log("Got JWT, checking getUser(jwt)...");

  const { data: res1 } = await sb.auth.getUser(jwt);
  console.log("res1 points:", res1.user.user_metadata.points);

  // Now update points using admin.updateUserById
  await sb.auth.admin.updateUserById(created.user.id, {
    user_metadata: { full_name: "Test User", phone: "0500000000", points: 50 }
  });

  // Now call getUser(jwt) again with the SAME token
  const { data: res2 } = await sb.auth.getUser(jwt);
  console.log("res2 points with SAME token:", res2.user.user_metadata.points);

  // Clean up
  await sb.auth.admin.deleteUser(created.user.id);
  console.log("Cleaned up test user.");
}

testJwt().catch(console.error);
