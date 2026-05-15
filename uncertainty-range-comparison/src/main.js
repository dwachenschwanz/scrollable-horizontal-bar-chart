import "./style.css";

const container = document.getElementById("container");

if (container) {
  container.textContent = "Loading chart...";
}

import("./uncertainty-app.js")
  .then(({ initializeUncertaintyApp }) => {
    initializeUncertaintyApp();
  })
  .catch((error) => {
    console.error("Failed to load uncertainty app", error);
    if (container) {
      container.textContent =
        "Unable to load the chart right now. Please refresh and try again.";
    }
  });
