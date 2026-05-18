import { debounce } from "./chart-core.js";
import {
  readBooleanPreference,
  readJsonPreference,
  writeBooleanPreference,
  writeJsonPreference,
} from "./preferences.js";

const SIDEBAR_TOGGLE_ICONS = {
  collapse: `
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="m15 6-6 6 6 6" />
    </svg>
  `,
  expand: `
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M3 5h18v14H3z" />
      <path d="M8 5v14" />
      <path d="M12 8h3" />
      <path d="M18 8h1" />
      <path d="M12 16h1" />
      <path d="M16 16h3" />
      <path d="M12 12h2" />
      <path d="M17 12h2" />
      <circle cx="16.5" cy="8" r="1.2" />
      <circle cx="14.5" cy="16" r="1.2" />
      <circle cx="15.5" cy="12" r="1.2" />
      <path d="M5 12h3" />
      <path d="m6 10-2 2 2 2" />
    </svg>
  `,
};

export function createControlTabs({ panels, tabs }) {
  function setActive(targetTabName) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.tabTarget === targetTabName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === targetTabName;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  }

  function bindEvents() {
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        setActive(tab.dataset.tabTarget);
      });

      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
          return;
        }

        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (index + direction + tabs.length) % tabs.length;
        const nextTab = tabs[nextIndex];
        setActive(nextTab.dataset.tabTarget);
        nextTab.focus();
      });
    });
  }

  return { bindEvents, setActive };
}

export function createFloatingSidebarController({
  elements,
  onLayoutChange,
  storageKeys,
}) {
  let sidebarDrag = null;
  let suppressToggleClick = false;

  function getStoredCollapsed() {
    return readBooleanPreference(storageKeys.collapsed);
  }

  function persistCollapsed(isCollapsed) {
    writeBooleanPreference(storageKeys.collapsed, isCollapsed);
  }

  function getStoredPosition() {
    return readJsonPreference(
      storageKeys.position,
      (position) =>
        Number.isFinite(position?.left) && Number.isFinite(position?.top)
    );
  }

  function persistPosition(position) {
    writeJsonPreference(storageKeys.position, position);
  }

  function getBounds() {
    const workspaceRect = elements.workspace.getBoundingClientRect();
    const sidebarWidth = elements.controlsSidebar.offsetWidth;
    const sidebarHeight = elements.controlsSidebar.offsetHeight;

    return {
      maxLeft: window.innerWidth - workspaceRect.left - sidebarWidth,
      maxTop: window.innerHeight - workspaceRect.top - sidebarHeight,
      minLeft: -workspaceRect.left,
      minTop: -workspaceRect.top,
    };
  }

  function getCurrentPosition() {
    const workspaceRect = elements.workspace.getBoundingClientRect();
    const sidebarRect = elements.controlsSidebar.getBoundingClientRect();

    return {
      left: sidebarRect.left - workspaceRect.left,
      top: sidebarRect.top - workspaceRect.top,
    };
  }

  function setPosition(left, top, { persist = false } = {}) {
    const bounds = getBounds();
    const nextPosition = {
      left: Math.min(Math.max(left, bounds.minLeft), bounds.maxLeft),
      top: Math.min(Math.max(top, bounds.minTop), bounds.maxTop),
    };

    elements.controlsSidebar.style.left = `${nextPosition.left}px`;
    elements.controlsSidebar.style.right = "auto";
    elements.controlsSidebar.style.top = `${nextPosition.top}px`;

    if (persist) {
      persistPosition(nextPosition);
    }

    return nextPosition;
  }

  function clampPosition({ persist = false } = {}) {
    if (!elements.controlsSidebar.style.left) {
      return;
    }

    const currentPosition = getCurrentPosition();
    setPosition(currentPosition.left, currentPosition.top, { persist });
  }

  function updateLayout() {
    window.requestAnimationFrame(() => {
      onLayoutChange?.();
    });
  }

  function setCollapsed(isCollapsed, { persist = false } = {}) {
    elements.workspace.classList.toggle("sidebar-collapsed", isCollapsed);
    elements.controlsContent.hidden = isCollapsed;
    elements.sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
    elements.sidebarToggle.title = isCollapsed
      ? "Expand controls"
      : "Collapse controls";
    elements.sidebarToggle.setAttribute(
      "aria-label",
      isCollapsed ? "Expand controls" : "Collapse controls"
    );
    elements.sidebarToggleIcon.innerHTML = isCollapsed
      ? SIDEBAR_TOGGLE_ICONS.expand
      : SIDEBAR_TOGGLE_ICONS.collapse;
    elements.sidebarToggleText.textContent = isCollapsed
      ? "Expand controls"
      : "Collapse controls";

    if (persist) {
      persistCollapsed(isCollapsed);
    }

    window.requestAnimationFrame(() => {
      clampPosition({ persist });
    });
    updateLayout();
  }

  function applyStoredState() {
    setCollapsed(getStoredCollapsed());
  }

  function applyStoredPosition() {
    const storedPosition = getStoredPosition();
    if (!storedPosition) {
      return;
    }

    window.requestAnimationFrame(() => {
      setPosition(storedPosition.left, storedPosition.top);
    });
  }

  function startDrag(event) {
    const isCollapsed = elements.workspace.classList.contains(
      "sidebar-collapsed"
    );
    const startedOnToggle = Boolean(event.target.closest?.(".sidebar-toggle"));

    if (event.button !== 0 || (startedOnToggle && !isCollapsed)) {
      return;
    }

    if (!startedOnToggle || isCollapsed) {
      event.preventDefault();
    }

    const currentPosition = getCurrentPosition();

    sidebarDrag = {
      didMove: false,
      originLeft: currentPosition.left,
      originTop: currentPosition.top,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedOnToggle,
    };
    elements.sidebarDragHandle.classList.add("is-dragging");
    elements.sidebarDragHandle.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    if (!sidebarDrag || sidebarDrag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - sidebarDrag.startX;
    const deltaY = event.clientY - sidebarDrag.startY;

    if (Math.hypot(deltaX, deltaY) > 4) {
      sidebarDrag.didMove = true;
    }

    setPosition(sidebarDrag.originLeft + deltaX, sidebarDrag.originTop + deltaY);
  }

  function endDrag(event) {
    if (!sidebarDrag || sidebarDrag.pointerId !== event.pointerId) {
      return;
    }

    const isCollapsed = elements.workspace.classList.contains(
      "sidebar-collapsed"
    );
    const shouldExpandFromCollapsedIcon =
      event.type === "pointerup" &&
      isCollapsed &&
      sidebarDrag.startedOnToggle &&
      !sidebarDrag.didMove;
    const shouldSuppressToggleClick =
      event.type === "pointerup" && isCollapsed && sidebarDrag.startedOnToggle;
    const currentPosition = getCurrentPosition();

    setPosition(currentPosition.left, currentPosition.top, {
      persist: true,
    });
    elements.sidebarDragHandle.classList.remove("is-dragging");
    if (elements.sidebarDragHandle.hasPointerCapture?.(event.pointerId)) {
      elements.sidebarDragHandle.releasePointerCapture(event.pointerId);
    }
    sidebarDrag = null;
    suppressToggleClick = shouldSuppressToggleClick;

    if (shouldExpandFromCollapsedIcon) {
      setCollapsed(false, { persist: true });
    }

    if (shouldSuppressToggleClick) {
      window.setTimeout(() => {
        suppressToggleClick = false;
      }, 250);
    }
  }

  function nudgePosition(event) {
    const offsets = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
    };
    const offset = offsets[event.key];

    if (!offset) {
      return;
    }

    event.preventDefault();
    const step = event.shiftKey ? 40 : 10;
    const currentPosition = getCurrentPosition();
    setPosition(
      currentPosition.left + offset[0] * step,
      currentPosition.top + offset[1] * step,
      { persist: true }
    );
  }

  function toggleFromButton(event) {
    if (suppressToggleClick) {
      event.preventDefault();
      suppressToggleClick = false;
      return;
    }

    setCollapsed(
      !elements.workspace.classList.contains("sidebar-collapsed"),
      { persist: true }
    );
  }

  function bindEvents() {
    const debouncedClamp = debounce(() => {
      clampPosition({ persist: true });
    }, 120);

    elements.sidebarToggle.addEventListener("click", toggleFromButton);
    elements.sidebarDragHandle.addEventListener("pointerdown", startDrag);
    elements.sidebarDragHandle.addEventListener("pointermove", moveDrag);
    elements.sidebarDragHandle.addEventListener("pointerup", endDrag);
    elements.sidebarDragHandle.addEventListener("pointercancel", endDrag);
    elements.sidebarDragHandle.addEventListener("keydown", nudgePosition);
    window.addEventListener("resize", debouncedClamp);
  }

  return {
    applyStoredPosition,
    applyStoredState,
    bindEvents,
    clampPosition,
    setCollapsed,
    setPosition,
  };
}
