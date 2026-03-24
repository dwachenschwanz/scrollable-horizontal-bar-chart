import "./style.css";

const container = document.getElementById("container");

if (container) {
  container.textContent = "Loading chart...";
}

import("./chart-app.js")
  .then(({ initializeChartApp }) => {
    initializeChartApp();
  })
  .catch((error) => {
    console.error("Failed to load chart app", error);
    if (container) {
      container.textContent =
        "Unable to load the chart right now. Please refresh and try again.";
    }
  });
