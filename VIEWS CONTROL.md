---
author: beto.group
name.official: Views Control
price: "0"
platform: desktop
tags:
  - window-management
  - babylonjs
  - 3d
  - multi-monitor
  - layout
  - sandbox
  - cdn
category:
  - visualization
desc: A sophisticated 3D sandbox demonstrating advanced display modes, including a true detachable OS-level window, native PiP, and floating panels.
status: stable
complexity: advanced
ext.dependencies:
  - babylon-js
id: 17
resources:
  - assets/viewscontrol.clip.gif
  - assets/views_control_1.webp
  - assets/views_control_2.webp
  - assets/views_control_3.webp
  - assets/views_control_4.webp
  - assets/views_control_5.webp
  - assets/views_control_6.webp
  - assets/views_control_7.webp
longDesc: A sophisticated component that renders an interactive 3D world using Babylon.js and pairs it with an advanced set of screen mode controls. This system can transform the 3D canvas from a simple inline element into various immersive views, including a true, separate OS-level window for a native multi-display experience.
version.obsidian: 1.4.11
version: 7.0.4
---

# Views Control

```datacorejsx
const activeFile = dc.resolvePath("VIEWS CONTROL") || "_RESOURCES/DATACORE/VIEWS CONTROL/VIEWS CONTROL";
const folderPath = activeFile.substring(0, activeFile.lastIndexOf('/'));
const { View } = await dc.require(folderPath + "/src/index.jsx");
return await View({ folderPath, dc });
```
