import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const API_URL = "http://localhost:3000";

// Create a cookie jar to store auth cookies
const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

async function testRoutes() {
  try {
    // 1. Register user
    const registerRes = await client.post(`${API_URL}/auth/login`, {
      email: "ceccarellim7@gmail.com",
      password: "Mrco@123_"
    });

    console.log("login Response:", registerRes.data);

    // 2. Get user by username (auth cookie is automatically used)
    const userRes = await client.get(`${API_URL}/users/user`, {
      params: { username: "marco" }
    });

    console.log("User Response:", userRes.data);

  } catch (err) {
    console.log(
      "Error:",
      err.response ? err.response.data : err.message
    );
  }
}

testRoutes();
