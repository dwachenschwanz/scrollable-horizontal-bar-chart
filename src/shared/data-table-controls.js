export function createDataTableControls({
  elements,
  getRenderKey,
  getSortMode,
  getVisibleIndexes,
  onAfterRender,
  renderRows,
  sortFields,
}) {
  let tableRows = [];
  let tableRenderKey = "";
  const sortPattern = new RegExp(`^(${sortFields.join("|")})(Asc|Desc)$`);

  function getSortDescriptor(sortMode = getSortMode()) {
    const match = sortPattern.exec(sortMode);

    if (!match) {
      return { direction: null, field: null };
    }

    return {
      direction: match[2] === "Asc" ? "ascending" : "descending",
      field: match[1],
    };
  }

  function updateSortHeaders() {
    const activeSort = getSortDescriptor();

    elements.tableSortButtons.forEach((button) => {
      const field = button.dataset.tableSort;
      const isActive = activeSort.field === field;
      const header = button.closest("th");
      const nextDirection =
        isActive && activeSort.direction === "ascending"
          ? "descending"
          : "ascending";

      button.classList.toggle("is-active", isActive);
      button.setAttribute(
        "aria-label",
        `Sort by ${button.textContent.trim()} ${nextDirection}`
      );

      if (isActive) {
        button.dataset.sortDirection =
          activeSort.direction === "ascending" ? "asc" : "desc";
        header?.setAttribute("aria-sort", activeSort.direction);
      } else {
        delete button.dataset.sortDirection;
        header?.setAttribute("aria-sort", "none");
      }
    });
  }

  function updateVisibility() {
    elements.dataTablePanel.hidden = !elements.showDataTableCheckbox.checked;
  }

  function updateHighlights() {
    if (elements.dataTablePanel.hidden) {
      return;
    }

    const visibleIndexes = getVisibleIndexes();

    tableRows.forEach((row) => {
      const sortedIndex = Number.parseInt(row.dataset.sortedIndex, 10);
      row.classList.toggle(
        "data-table-row-visible",
        visibleIndexes.has(sortedIndex)
      );
    });
  }

  function render({ force = false } = {}) {
    updateVisibility();
    updateSortHeaders();

    if (!elements.showDataTableCheckbox.checked) {
      tableRows = [];
      tableRenderKey = "";
      return;
    }

    const nextRenderKey = getRenderKey();
    if (!force && tableRenderKey === nextRenderKey) {
      updateHighlights();
      return;
    }

    elements.dataTableBody.innerHTML = renderRows();
    tableRows = Array.from(
      elements.dataTableBody.querySelectorAll("tr[data-sorted-index]")
    );
    tableRenderKey = nextRenderKey;
    updateHighlights();
    onAfterRender?.();
  }

  function bindSortButtons({ onSortMode }) {
    elements.tableSortButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const field = button.dataset.tableSort;
        const activeSort = getSortDescriptor();
        const direction =
          activeSort.field === field && activeSort.direction === "ascending"
            ? "Desc"
            : "Asc";

        onSortMode(`${field}${direction}`);
      });
    });
  }

  return {
    bindSortButtons,
    getSortDescriptor,
    render,
    updateHighlights,
    updateSortHeaders,
    updateVisibility,
  };
}
