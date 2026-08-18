import { useState } from "react";
import SetupScreen from "./screens/SetupScreen";
import PhotoSortScreen from "./screens/PhotoSortScreen";
import "./App.css";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("setup");
  const [config, setConfig] = useState(null);

  const handleSetupComplete = (setupConfig) => {
    setConfig(setupConfig);
    setCurrentScreen("sort");
  };

  const handleBackToSetup = () => {
    setCurrentScreen("setup");
    setConfig(null);
  };

  return (
    <div className="app">
      {currentScreen === "setup" && (
        <SetupScreen onComplete={handleSetupComplete} />
      )}
      {currentScreen === "sort" && config && (
        <PhotoSortScreen config={config} onBackToSetup={handleBackToSetup} />
      )}
    </div>
  );
}
