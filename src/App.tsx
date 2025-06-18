import React, { useRef } from "react";
import uitoolkit, { CustomizationOptions } from "@zoom/videosdk-ui-toolkit";
import "@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css";
import "./App.css";

function App() {
  const sessionContainer = useRef<HTMLDivElement | null>(null);

  const loginEndpoint = "http://localhost/api/login";
  const authEndpoint = "http://localhost/api/calls/signature";

  const config: CustomizationOptions = {
    videoSDKJWT: "",
    sessionName: "test",
    userName: "React",
    sessionPasscode: "123",
    featuresOptions: {
      preview: { enable: true },
      virtualBackground: {
        enable: true,
        virtualBackgrounds: [
          { url: "https://images.unsplash.com/photo-1715490187538-30a365fa05bd?q=80&w=1945&auto=format&fit=crop" }
        ]
      }
    }
  };
  const role = 1;

  async function getVideoSDKJWT() {
    // 1. Получаем Bearer токен
    const loginRes = await fetch(loginEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: "il@test.by", password: "12345678" }),
      credentials: "include"
    });
    const loginData = await loginRes.json();
    const bearer = loginData[0]?.access_token;
    if (!bearer) {
      console.error("Login failed or no access_token");
      return;
    }

    // 2. Получаем Zoom SDK JWT
    const jwtRes = await fetch(authEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`
      },
      body: JSON.stringify({ sessionName: config.sessionName, role, videoWebRtcMode: 1 })
    });
    const jwtData = await jwtRes.json();
    if (!jwtData.signature) {
      console.error("JWT fetch failed or no signature");
      return;
    }

    config.videoSDKJWT = jwtData.signature;
    joinSession();
  }

  function joinSession() {
    if (sessionContainer.current) {
      uitoolkit.joinSession(sessionContainer.current, config);
      uitoolkit.onSessionClosed(sessionClosed);
      uitoolkit.onSessionDestroyed(sessionDestroyed);
    }
  }

  const sessionClosed = () => {
    console.log("session closed");
    document.getElementById("join-flow")!.style.display = "block";
  };

  const sessionDestroyed = () => {
    console.log("session destroyed");
    uitoolkit.destroy();
  };

  return (
    <div className="App">
      <main>
        <div id="join-flow">
          <h1>Zoom Video SDK Sample React</h1>
          <button onClick={getVideoSDKJWT}>Join Session</button>
        </div>
        <div id="sessionContainer" ref={sessionContainer}></div>
      </main>
    </div>
  );
}

export default App;