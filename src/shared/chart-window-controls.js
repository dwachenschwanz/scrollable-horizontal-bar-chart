export function createChartWindowControls({
  elements,
  getTotal,
  initialWindowSize,
  minThumbHeight = 0,
  onScrollPosition,
  onWindowChange,
  trackHeight,
}) {
  const state = {
    currentStart: 0,
    pendingScrollStart: 0,
    previousStart: 0,
    scrollAnimationFrame: null,
    windowSize: initialWindowSize,
  };

  function getMaxStart() {
    return Math.max(0, getTotal() - state.windowSize);
  }

  function invalidateWindow() {
    onWindowChange?.();
  }

  function clampCurrentStart() {
    state.currentStart = Math.min(
      Math.max(state.currentStart, 0),
      getMaxStart()
    );
    invalidateWindow();
  }

  function setThumbHeight() {
    const total = Math.max(getTotal(), 1);
    const thumbHeight = Math.max(
      minThumbHeight,
      (state.windowSize / total) * trackHeight
    );
    elements.dynamicSliderStyle.textContent = `
    #scrollbar::-webkit-slider-thumb { height: ${thumbHeight}px; }
    #scrollbar::-moz-range-thumb { height: ${thumbHeight}px; }
  `;
  }

  function updateStatus() {
    const total = getTotal();
    const start = total === 0 ? 0 : state.currentStart + 1;
    const end = Math.min(state.currentStart + state.windowSize, total);
    elements.sliderStatus.textContent = `Showing ${start}-${end} of ${total}`;
  }

  function updateScrollbar() {
    const maxStart = getMaxStart();
    elements.scrollbar.max = String(maxStart);
    elements.scrollbar.value = String(state.currentStart);
    elements.scrollbar.disabled = maxStart === 0;
    setThumbHeight();
    updateStatus();
  }

  function reset({ windowSize = state.windowSize } = {}) {
    state.currentStart = 0;
    state.pendingScrollStart = 0;
    state.previousStart = 0;
    state.windowSize = windowSize;
    invalidateWindow();
  }

  function setWindowSize(windowSize, { resetStart = true } = {}) {
    state.windowSize = windowSize;

    if (resetStart) {
      state.currentStart = 0;
      state.pendingScrollStart = 0;
      state.previousStart = 0;
    } else {
      clampCurrentStart();
    }

    invalidateWindow();
  }

  function getVisibleIndexes(itemCount) {
    return new Set(
      Array.from(
        {
          length: Math.max(
            0,
            Math.min(state.windowSize, itemCount - state.currentStart)
          ),
        },
        (_, offset) => state.currentStart + offset
      )
    );
  }

  function applyScrollPosition(nextStart) {
    state.previousStart = state.currentStart;
    state.currentStart = Number.parseFloat(nextStart);
    clampCurrentStart();
    updateScrollbar();
    onScrollPosition?.(state.currentStart);
  }

  function flushScrollUpdate() {
    state.scrollAnimationFrame = null;
    applyScrollPosition(state.pendingScrollStart);
  }

  function onScrollInput(value) {
    state.pendingScrollStart = Number.parseFloat(value);

    if (state.scrollAnimationFrame !== null) {
      return;
    }

    state.scrollAnimationFrame = window.requestAnimationFrame(flushScrollUpdate);
  }

  function bindScrollbar() {
    elements.scrollbar.addEventListener("input", (event) => {
      onScrollInput(event.target.value);
    });
  }

  return {
    bindScrollbar,
    clampCurrentStart,
    get currentStart() {
      return state.currentStart;
    },
    get previousStart() {
      return state.previousStart;
    },
    get windowSize() {
      return state.windowSize;
    },
    getVisibleIndexes,
    reset,
    setWindowSize,
    updateScrollbar,
  };
}
