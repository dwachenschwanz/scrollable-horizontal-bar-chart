const DEFAULT_VIEWPORT_PADDING = 24;

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createChartHeightResizeControls({
  debounce,
  defaultHeight,
  elements,
  onChange,
  viewportPadding = DEFAULT_VIEWPORT_PADDING,
  windowObject = globalThis.window,
  documentObject = globalThis.document,
}) {
  const {
    chartContainer,
    chartHeightSlider,
    chartHeightValue,
    chartResizeHandle,
    chartSurface,
  } = elements;
  const defaultChartHeight = parseInteger(defaultHeight, 400);
  const debounceResize = debounce ?? ((callback) => callback);

  function getCurrentHeight() {
    return parseInteger(chartHeightSlider.value, defaultChartHeight);
  }

  function getBounds() {
    const min = parseInteger(chartHeightSlider.min, 0);
    const step = Math.max(1, parseInteger(chartHeightSlider.step, 1));
    const fallbackMax = parseInteger(chartHeightSlider.max, defaultChartHeight);
    const chartSurfaceTop =
      chartSurface?.getBoundingClientRect?.().top ?? Number.NaN;
    const availableHeight =
      (windowObject?.innerHeight ?? Number.NaN) -
      chartSurfaceTop -
      viewportPadding;
    const max = Number.isFinite(availableHeight)
      ? Math.max(min, Math.floor(availableHeight / step) * step)
      : Math.max(min, fallbackMax);

    chartHeightSlider.max = String(max);
    chartResizeHandle?.setAttribute("aria-valuemax", String(max));

    return {
      max,
      min,
      step,
    };
  }

  function sync() {
    getBounds();
    chartHeightValue.textContent = chartHeightSlider.value;
    chartContainer.style.setProperty(
      "--chart-height",
      `${chartHeightSlider.value}px`
    );
    chartResizeHandle?.setAttribute("aria-valuenow", chartHeightSlider.value);
  }

  function setHeight(height) {
    const { max, min, step } = getBounds();
    const snappedHeight = Math.round(height / step) * step;
    const chartHeight = Math.min(max, Math.max(min, snappedHeight));

    chartHeightSlider.value = String(chartHeight);
    sync();
    return chartHeight;
  }

  function bindEvents() {
    const handle = chartResizeHandle;
    const removeListeners = [];
    let dragStartHeight = defaultChartHeight;
    let dragStartY = 0;

    function emitChange() {
      onChange?.(getCurrentHeight());
    }

    function bind(target, type, listener, options) {
      target?.addEventListener?.(type, listener, options);
      removeListeners.push(() =>
        target?.removeEventListener?.(type, listener, options)
      );
    }

    function endDrag() {
      handle?.classList.remove("is-dragging");
      documentObject?.removeEventListener?.("pointermove", onPointerMove);
      documentObject?.removeEventListener?.("pointerup", endDrag);
      documentObject?.removeEventListener?.("pointercancel", endDrag);
    }

    function onPointerMove(event) {
      setHeight(dragStartHeight + event.clientY - dragStartY);
      emitChange();
    }

    bind(chartHeightSlider, "input", (event) => {
      setHeight(parseInteger(event.target.value, getCurrentHeight()));
      emitChange();
    });

    bind(
      windowObject,
      "resize",
      debounceResize(() => {
        setHeight(getCurrentHeight());
        emitChange();
      }, 120)
    );

    if (!handle) {
      return () => {
        removeListeners.forEach((remove) => remove());
      };
    }

    bind(handle, "dblclick", () => {
      setHeight(defaultChartHeight);
      emitChange();
    });

    bind(handle, "pointerdown", (event) => {
      event.preventDefault();
      dragStartY = event.clientY;
      dragStartHeight = getCurrentHeight();
      handle.classList.add("is-dragging");
      documentObject?.addEventListener?.("pointermove", onPointerMove);
      documentObject?.addEventListener?.("pointerup", endDrag, { once: true });
      documentObject?.addEventListener?.("pointercancel", endDrag, {
        once: true,
      });
    });

    bind(handle, "keydown", (event) => {
      const { max, min, step: sliderStep } = getBounds();
      const step = event.shiftKey ? sliderStep * 2 : sliderStep;
      const keyAdjustments = {
        ArrowDown: step,
        ArrowUp: -step,
        End: max - getCurrentHeight(),
        Home: min - getCurrentHeight(),
      };
      const adjustment = keyAdjustments[event.key];

      if (adjustment === undefined) {
        return;
      }

      event.preventDefault();
      setHeight(getCurrentHeight() + adjustment);
      emitChange();
    });

    return () => {
      endDrag();
      removeListeners.forEach((remove) => remove());
    };
  }

  return {
    bindEvents,
    getBounds,
    getCurrentHeight,
    setHeight,
    sync,
  };
}
