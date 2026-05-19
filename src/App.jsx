const { useRef, useEffect, useState } = dc;

// Suppress ResizeObserver loop errors globally (they're harmless but noisy)
if (typeof window !== 'undefined') {
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof message === 'string' && message.includes('ResizeObserver loop')) {
      return true; // Suppress the error
    }
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };
}

function WorldView({ folderPath, dc, ScreenModeHelper }) {
  // Now includes "external" mode for true OS-level window
  const initialScreenMode = "default";
  const allowedScreenModes = ["browser", "window", "pip", "fullTab", "character", "external"];
  
  // Refs for container and canvas
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State to store Babylon's engine and scene.
  const [engine, setEngine] = useState(null);
  const [scene, setScene] = useState(null);
  
  // Default container inline style as a string.
  const defaultContainerStyle =
    "position: relative; width: 100%; height: 400px; border: 1px solid #ccc; background-color: #fafafa;";
  
  // Refs for original parent storage (for reparenting in "window" or the 'character' PiP modes)
  const originalParentRefForWindow = useRef(null);
  const originalParentRefForPiP = useRef(null);
  
  // Refs for Babylon player and keyboard controls.
  const playerRef = useRef(null);
  const keysPressed = useRef({});
  
  // -------------------------
  // Babylon.js Loader & Setup
  // -------------------------
  useEffect(() => {
    if (!window.BABYLON) {
      const script = document.createElement("script");
      script.src = "https://cdn.babylonjs.com/babylon.js";
      script.async = true;
      script.onload = () => {
        initBabylon();
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    } else {
      initBabylon();
    }
  }, []);
  
  // -------------------------
  // Resize Observer for Babylon
  // -------------------------
  useEffect(() => {
    let observer;
    let resizeTimeout;
    if (containerRef.current && engine) {
      observer = new ResizeObserver((entries) => {
        // Clear any pending resize
        if (resizeTimeout) clearTimeout(resizeTimeout);
        
        // Debounce and use RAF to avoid ResizeObserver loop errors
        resizeTimeout = setTimeout(() => {
          window.requestAnimationFrame(() => {
            try {
              if (engine && !engine.isDisposed) {
                engine.resize();
              }
            } catch (error) {
              console.warn("[WorldView] Engine resize error (safely caught):", error);
            }
          });
        }, 150); // Increased debounce for stability
      });
      observer.observe(containerRef.current);
    }
    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (observer && containerRef.current) {
        try {
          observer.unobserve(containerRef.current);
          observer.disconnect();
        } catch (error) {
          console.warn("[WorldView] ResizeObserver cleanup warning:", error);
        }
      }
    };
  }, [engine]);
  
  // Force engine resize on mode change with error handling
  useEffect(() => {
    const resizeTimer = setTimeout(() => {
      try {
        if (engine && !engine.isDisposed) {
          engine.resize();
        }
      } catch (error) {
        console.warn("[WorldView] Engine resize error (safely caught):", error);
      }
    }, 200); // Increased delay for mode transitions
    
    return () => clearTimeout(resizeTimer);
  }, [engine]);
  
  // -------------------------
  // Keyboard Event Listeners
  // -------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  
  // -------------------------
  // Babylon.js Initialization
  // -------------------------
  const initBabylon = () => {
    if (canvasRef.current && window.BABYLON) {
      const babylonEngine = new window.BABYLON.Engine(
        canvasRef.current,
        true,
        { preserveDrawingBuffer: true, stencil: true, antialias: true }
      );
      const babylonScene = new window.BABYLON.Scene(babylonEngine);
      babylonScene.clearColor = new window.BABYLON.Color4(0.06, 0.06, 0.12, 1);
  
      const camera = new window.BABYLON.ArcRotateCamera(
        "Camera", -Math.PI / 2, Math.PI / 2.5, 10,
        window.BABYLON.Vector3.Zero(), babylonScene
      );
      camera.attachControl(canvasRef.current, true);
      camera.lowerRadiusLimit = 5;
      camera.upperRadiusLimit = 20;
  
      // Enhanced lighting
      const light = new window.BABYLON.HemisphericLight("light", new window.BABYLON.Vector3(0, 1, 0), babylonScene);
      light.intensity = 0.8;
      
      const light2 = new window.BABYLON.PointLight("light2", new window.BABYLON.Vector3(5, 5, 5), babylonScene);
      light2.intensity = 0.5;
      
      // Ground with material
      const ground = window.BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, babylonScene);
      const groundMat = new window.BABYLON.StandardMaterial("groundMat", babylonScene);
      groundMat.diffuseColor = new window.BABYLON.Color3(0.2, 0.2, 0.3);
      groundMat.specularColor = new window.BABYLON.Color3(0.1, 0.1, 0.1);
      ground.material = groundMat;
  
      // Player with glow effect
      const player = window.BABYLON.MeshBuilder.CreateSphere("player", { diameter: 1 }, babylonScene);
      player.position.y = 0.5;
      const playerMat = new window.BABYLON.StandardMaterial("playerMat", babylonScene);
      playerMat.diffuseColor = new window.BABYLON.Color3(0.63, 0.46, 0.98); // Purple
      playerMat.emissiveColor = new window.BABYLON.Color3(0.31, 0.23, 0.49); // Purple glow
      player.material = playerMat;
      playerRef.current = player;
      
      // Add glow layer
      const glow = new window.BABYLON.GlowLayer("glow", babylonScene);
      glow.intensity = 0.5;
  
      setEngine(babylonEngine);
      setScene(babylonScene);
  
      const moveSpeed = 0.1;
      babylonEngine.runRenderLoop(() => {
        if (keysPressed.current["w"] || keysPressed.current["ArrowUp"]) player.position.z -= moveSpeed;
        if (keysPressed.current["s"] || keysPressed.current["ArrowDown"]) player.position.z += moveSpeed;
        if (keysPressed.current["a"] || keysPressed.current["ArrowLeft"]) player.position.x -= moveSpeed;
        if (keysPressed.current["d"] || keysPressed.current["ArrowRight"]) player.position.x += moveSpeed;
        babylonScene.render();
      });
  
      window.addEventListener("resize", () => babylonEngine.resize());
    } else {
      console.error("[WorldView] initBabylon: canvasRef missing or Babylon.js not loaded.");
    }
  };
  
  // -------------------------
  // Render
  // -------------------------
  const isDark = document.body.classList.contains('theme-dark');
  const appliedContainerStyle = {
    position: "relative",
    width: "100%",
    height: "500px",
    border: `1px solid ${isDark ? 'rgba(160, 118, 249, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
    background: isDark 
      ? 'linear-gradient(135deg, #0f0f1e 0%, #16213e 100%)' 
      : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: isDark 
      ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)' 
      : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
  };
  
  const canvasStyle = {
    width: "100%",
    height: "100%",
    display: "block",
    background: 'linear-gradient(135deg, #0D0D1A 0%, #16213E 50%, #1A1A2E 100%)'
  };
  
  return (
    <div ref={containerRef} style={appliedContainerStyle}>
      <canvas ref={canvasRef} style={canvasStyle} />
      <ScreenModeHelper
        initialMode={initialScreenMode}
        containerRef={containerRef}
        canvasRef={canvasRef} // Pass canvas ref for native PiP
        defaultStyle={defaultContainerStyle}
        originalParentRefForWindow={originalParentRefForWindow}
        originalParentRefForPiP={originalParentRefForPiP}
        allowedScreenModes={allowedScreenModes}
        engine={engine}
      />
    </div>
  );
}

return { WorldView };
