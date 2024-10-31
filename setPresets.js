export function setPresets(option) {
  const options = {
    "circuit-traces-1-64": {
      toolpathType: "2D",
      settings: [
        ["thresholdValue", 0.5],
        ["diameter", (1 / 64) * 25.4],
        ["cutDepth", 0.1],
        ["maxDepth", 0.1],
        ["offsetNumber", 4],
        ["stepover", 0.5],
        ["direction", "climb"],
        ["pathOrder", "forward"],
        ["sortDistance", "on"],
        ["speed", 4],
      ],
    },
    "circuit-outline-1-32": {
      toolpathType: "2D",
      settings: [
        ["thresholdValue", 0.5],
        ["diameter", (1 / 32) * 25.4],
        ["cutDepth", 0.6],
        ["maxDepth", 1.8],
        ["offsetNumber", 1],
        ["stepover", 0.5],
        ["direction", "climb"],
        ["pathOrder", "forward"],
        ["sortDistance", "on"],
        ["speed", 4],
      ],
    },
    "circuit-traces-engraving": {
      toolpathType: "2D",
      settings: [
        ["thresholdValue", 0.5],
        ["diameter", 0.4],
        ["cutDepth", 0.1],
        ["maxDepth", 0.1],
        ["offsetNumber", 4],
        ["stepover", 0.2],
        ["direction", "climb"],
        ["pathOrder", "forward"],
        ["sortDistance", "on"],
        ["speed", 4],
      ],
    },
  };

  const selectedOption = options[option];

  STATE.toolpathType = selectedOption.toolpathType;

  requestAnimationFrame(() => {
    selectedOption.settings.forEach(([key, value]) => {
      const el = document.querySelector(`[data-key='${key}']`);
      if (!el) return;
      el.value = value;
    });
  });
}
