import React, { useRef, useState } from "react";
import uitoolkit, { CustomizationOptions } from "@zoom/videosdk-ui-toolkit";
import "@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css";
import "./App.css";

function App() {
  const sessionContainer = useRef<HTMLDivElement | null>(null);

  const loginEndpoint = "http://localhost/api/login";
  const authEndpoint = "http://localhost/api/calls/signature";

  const [sessionName, setSessionName] = useState<string>("");
  const [sessionPassword, setSessionPassword] = useState<string>(""); 

  const role = 1;

  async function getVideoSDKJWT() {
    // 1) login
    const loginRes = await fetch(loginEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: "il@test.by", password: "12345678" }),
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
      userIdentity: "1",
      videoWebRtcMode: 1
    };

    const jwtRes = await fetch(authEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
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
      sessionIdleTimeoutMins: 15, // Set timeout to 15 minutes or higher value as needed
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
    
    uitoolkit.joinSession(sessionContainer.current, config);
    
    uitoolkit.onSessionClosed(() => {
      console.log("session closed");
      document.getElementById("join-flow")!.style.display = "block";
    });
    
    uitoolkit.onSessionDestroyed(() => {
      console.log("session destroyed");
      uitoolkit.destroy();
    });
  }

  return (
    <div className="App">
      <main>
        <div id="join-flow">
          <h1>Zoom Video SDK Sample React</h1>
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
            <label>Session Password:</label> {}
            <input
              type="text"
              value={sessionPassword}
              onChange={(e) => setSessionPassword(e.target.value)}
              placeholder="Enter session password"
            />
          </div>
          <button onClick={getVideoSDKJWT}>Join Session</button>
        </div>
        <div id="sessionContainer" ref={sessionContainer}></div>
      </main>
    </div>
  );
}

export default App;