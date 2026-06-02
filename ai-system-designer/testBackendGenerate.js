const email = `test_${Date.now()}@example.com`;
const password = "password123";

async function testBackend() {
  try {
    console.log("1. Registering user...");
    const regRes = await fetch("http://localhost:8080/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    console.log("Register status:", regRes.status);
    const regText = await regRes.text();
    console.log("Register response:", regText);

    console.log("\n2. Logging in...");
    const loginRes = await fetch("http://localhost:8080/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    console.log("Login status:", loginRes.status);
    const loginData = await loginRes.json();
    console.log("Login data:", loginData);

    const token = loginData.accessToken;

    console.log("\n3. Calling /api/ai/generate...");
    const generateRes = await fetch("http://localhost:8080/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: "Create a simple users table with id and email.",
        currentSchema: ""
      })
    });
    console.log("Generate status:", generateRes.status);
    const generateData = await generateRes.json();
    console.log("Generate Response:", JSON.stringify(generateData, null, 2));
  } catch (error) {
    console.error("Error during test:", error);
  }
}

testBackend();
