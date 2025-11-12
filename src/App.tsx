import React, { useRef, useState } from "react";
import uitoolkit, { CustomizationOptions } from "@zoom/videosdk-ui-toolkit";
import "@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css";
import "./App.css";

// Generate a fixed UUID v4 for device identification
const DEVICE_ID = '1baa4112-4c9e-4158-b7bb-52dd3c843ce8';

function App() {
  const sessionContainer = useRef<HTMLDivElement | null>(null);

  const loginEndpoint = "https://fl.sub.by/api/login";
  const authEndpoint = "https://fl.sub.by/api/calls/signature";

  const [sessionName, setSessionName] = useState<string>("");
  const [sessionPassword, setSessionPassword] = useState<string>(""); 
  const [userIdentity, setUserIdentity] = useState<string>("1");
  const [role, setRole] = useState<number>(1);
  const [email, setEmail] = useState<string>("il@test.by");
  const [password, setPassword] = useState<string>("12345678");
  const [showForm, setShowForm] = useState<boolean>(true);

  async function getVideoSDKJWT() {
    // 1) login
    const loginRes = await fetch(loginEndpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Accept: "application/json",
        "X-Device-Id": DEVICE_ID
      },
      body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      credentials: "include",
    });
    
    const loginData = await loginRes.json();
    const bearer = loginData[0]?.access_token;
    if (!bearer) {
      console.error("Login failed or no access_token");
      return;
    }

    // 2) Подготовка данных для подписи
    const payload = {
      role,
      sessionName: sessionName.trim(),
      sessionKey: sessionPassword.trim(), // Передаем пароль как sessionKey
      userIdentity: userIdentity.trim(),
      videoWebRtcMode: 1
    };

    const jwtRes = await fetch(authEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
        "X-Device-Id": DEVICE_ID
      },
      body: JSON.stringify(payload),
    });
    
    const jwtData = await jwtRes.json();
    if (!jwtData.signature) {
      console.error("JWT fetch failed or no signature");
      return;
    }

    joinSession(jwtData.signature);
  }

  function joinSession(signature: string) {
    if (!sessionContainer.current) return;

    const config: CustomizationOptions = {
      videoSDKJWT: signature,
      sessionName: sessionName.trim(), 
      sessionPasscode: sessionPassword.trim(),
      userName: "react",
      sessionIdleTimeoutMins: 240, // Set timeout to X minutes or higher value as needed
      featuresOptions: {
        preview: { enable: true },
        virtualBackground: {
          enable: true,
          virtualBackgrounds: [
            {
              url: "https://images.unsplash.com/photo-1715490187538-30a365fa05bd?q=80&w=1945&auto=format&fit=crop",
            },
          ],
        },
      },
    };

    console.log("Joining with config:", config);
    
    // Скрываем форму после успешного логина
    setShowForm(false);
    
    uitoolkit.joinSession(sessionContainer.current, config);
    
    uitoolkit.onSessionClosed(() => {
      console.log("session closed");
      setShowForm(true);
    });
    
    uitoolkit.onSessionDestroyed(() => {
      console.log("session destroyed");
      uitoolkit.destroy();
      setShowForm(true);
    });
  }

  return (
    <div className="App">
      <main>
        {showForm && (
          <div id="join-flow">
            <h1>Zoom Video SDK Sample React</h1>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="form-group">
              <label>Session Name:</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter sessionName"
              />
            </div>
            <div className="form-group">
              <label>Session Password:</label>
              <input
                type="text"
                value={sessionPassword}
                onChange={(e) => setSessionPassword(e.target.value)}
                placeholder="Enter session password"
              />
            </div>
            <div className="form-group">
              <label>User Identity:</label>
              <input
                type="text"
                value={userIdentity}
                onChange={(e) => setUserIdentity(e.target.value)}
                placeholder="Enter user identity"
              />
            </div>
            <div className="form-group">
              <label>Role:</label>
              <input
                type="number"
                value={role}
                onChange={(e) => setRole(Number(e.target.value))}
                placeholder="Enter role (1 for host, 0 for participant)"
                min="0"
                max="1"
              />
            </div>
            <button onClick={getVideoSDKJWT}>Join Session</button>
          </div>
        )}
        <div id="sessionContainer" ref={sessionContainer}></div>
      </main>
    </div>
  );
}

export default App;