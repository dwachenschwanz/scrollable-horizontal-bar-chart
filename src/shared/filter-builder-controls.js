const DEFAULT_MIN_FILTER_COUNT = 2;
const FILTER_OPERATORS = [">", ">=", "=", "<=", "<"];
const FILTER_BOUND_TOLERANCE = 1e-9;

function createOptionClone(option) {
  const optionClone = document.createElement("option");
  optionClone.value = option.value;
  optionClone.textContent = option.textContent;
  optionClone.defaultSelected = option.value === "none";
  optionClone.selected = option.value === "none";

  return optionClone;
}

export function createFilterBuilderControls({
  actionRow,
  addButton,
  formatValue = (value) => String(value),
  getFieldRange = () => null,
  getValidationRange = (range) => range,
  idPrefix,
  minCount = DEFAULT_MIN_FILTER_COUNT,
  root,
}) {
  function getFilterCards() {
    return Array.from(root.querySelectorAll("[data-filter-card]"));
  }

  function getSourceSelect() {
    return getFilterCards()[0]?.querySelector(".filter-field-select") ?? null;
  }

  function createFilterCard() {
    const card = document.createElement("section");
    const header = document.createElement("div");
    const heading = document.createElement("h2");
    const removeButton = document.createElement("button");
    const label = document.createElement("label");
    const select = document.createElement("select");
    const rangeRow = createRangeRow();
    const criteriaRow = createCriteriaRow();
    const sourceSelect = getSourceSelect();

    card.className = "filter-card";
    card.dataset.filterCard = "";

    header.className = "filter-card-header";

    heading.dataset.filterHeading = "";

    removeButton.className = "filter-remove-button";
    removeButton.type = "button";
    removeButton.dataset.filterRemove = "";
    removeButton.hidden = true;
    removeButton.textContent = "X";

    label.className = "sr-only";
    label.dataset.filterLabel = "";

    select.className = "filter-field-select";

    if (sourceSelect) {
      Array.from(sourceSelect.options).forEach((option) => {
        select.append(createOptionClone(option));
      });
    } else {
      const defaultOption = document.createElement("option");
      defaultOption.value = "none";
      defaultOption.textContent = "<None>";
      defaultOption.defaultSelected = true;
      defaultOption.selected = true;
      select.append(defaultOption);
    }

    header.append(heading, removeButton);
    card.append(header, label, select, rangeRow, criteriaRow);

    return card;
  }

  function createRangeRow() {
    const rangeRow = document.createElement("div");
    const minItem = document.createElement("span");
    const maxItem = document.createElement("span");
    const minLabel = document.createElement("strong");
    const maxLabel = document.createElement("strong");
    const minValue = document.createElement("span");
    const maxValue = document.createElement("span");

    rangeRow.className = "filter-range-row";
    rangeRow.dataset.filterRange = "";
    rangeRow.hidden = true;

    minLabel.textContent = "Min:";
    maxLabel.textContent = "Max:";
    minValue.dataset.filterMin = "";
    maxValue.dataset.filterMax = "";

    minItem.append(minLabel, " ", minValue);
    maxItem.append(maxLabel, " ", maxValue);
    rangeRow.append(minItem, maxItem);

    return rangeRow;
  }

  function createCriteriaRow() {
    const criteriaRow = document.createElement("div");
    const operatorLabel = document.createElement("label");
    const operatorSelect = document.createElement("select");
    const valueLabel = document.createElement("label");
    const valueInput = document.createElement("input");
    const errorMessage = document.createElement("p");

    criteriaRow.className = "filter-criteria-row";
    criteriaRow.dataset.filterCriteria = "";
    criteriaRow.hidden = true;

    operatorLabel.className = "sr-only";
    operatorLabel.dataset.filterOperatorLabel = "";
    operatorLabel.textContent = "Filter operator";
    operatorSelect.className = "filter-operator-select";
    operatorSelect.dataset.filterOperator = "";

    FILTER_OPERATORS.forEach((operator) => {
      const option = document.createElement("option");
      option.value = operator;
      option.textContent = operator;
      operatorSelect.append(option);
    });

    valueLabel.className = "sr-only";
    valueLabel.dataset.filterValueLabel = "";
    valueLabel.textContent = "Filter value";
    valueInput.className = "filter-value-input";
    valueInput.dataset.filterValue = "";
    valueInput.inputMode = "decimal";
    valueInput.step = "any";
    valueInput.type = "number";

    errorMessage.className = "filter-value-error";
    errorMessage.dataset.filterError = "";
    errorMessage.hidden = true;

    criteriaRow.append(
      operatorLabel,
      operatorSelect,
      valueLabel,
      valueInput,
      errorMessage
    );

    return criteriaRow;
  }

  function ensureRangeRow(card) {
    let rangeRow = card.querySelector("[data-filter-range]");

    if (!rangeRow) {
      rangeRow = createRangeRow();
      card.append(rangeRow);
    }

    return rangeRow;
  }

  function ensureCriteriaRow(card) {
    let criteriaRow = card.querySelector("[data-filter-criteria]");

    if (!criteriaRow) {
      criteriaRow = createCriteriaRow();
      card.append(criteriaRow);
    }

    return criteriaRow;
  }

  function syncValueError(input, message = "") {
    const card = input.closest("[data-filter-card]");
    const errorMessage = card?.querySelector("[data-filter-error]");
    const hasError = message !== "";

    input.setCustomValidity(message);
    input.setAttribute("aria-invalid", hasError ? "true" : "false");

    if (!errorMessage) {
      return;
    }

    errorMessage.textContent = message;
    errorMessage.hidden = !hasError;

    if (hasError) {
      input.setAttribute("aria-describedby", errorMessage.id);
    } else {
      input.removeAttribute("aria-describedby");
    }
  }

  function setValueBounds(input, range) {
    const validationRange = getValidationRange(range);
    const minBound = validationRange.min;
    const maxBound = validationRange.max;

    input.min = String(minBound);
    input.max = String(maxBound);

    if (input.value === "") {
      syncValueError(input);
      return;
    }

    const value = Number.parseFloat(input.value);
    const isValid =
      Number.isFinite(value) &&
      value >= minBound - FILTER_BOUND_TOLERANCE &&
      value <= maxBound + FILTER_BOUND_TOLERANCE;

    syncValueError(
      input,
      isValid
        ? ""
        : `Enter a value from ${formatValue(range.min)} to ${formatValue(
            range.max
          )}.`
    );
  }

  function hideFilterDetails(card) {
    const rangeRow = ensureRangeRow(card);
    const criteriaRow = ensureCriteriaRow(card);
    const operatorSelect = criteriaRow.querySelector("[data-filter-operator]");
    const valueInput = criteriaRow.querySelector("[data-filter-value]");

    rangeRow.hidden = true;
    criteriaRow.hidden = true;

    if (operatorSelect) {
      operatorSelect.value = FILTER_OPERATORS[0];
    }

    if (valueInput) {
      valueInput.value = "";
      valueInput.removeAttribute("min");
      valueInput.removeAttribute("max");
      syncValueError(valueInput);
    }
  }

  function updateFilterRange(card) {
    const select = card.querySelector(".filter-field-select");
    const rangeRow = ensureRangeRow(card);
    const criteriaRow = ensureCriteriaRow(card);
    const minValue = rangeRow.querySelector("[data-filter-min]");
    const maxValue = rangeRow.querySelector("[data-filter-max]");
    const valueInput = criteriaRow.querySelector("[data-filter-value]");

    if (!select || select.value === "none") {
      hideFilterDetails(card);
      return;
    }

    const range = getFieldRange(select.value);

    if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) {
      hideFilterDetails(card);
      return;
    }

    minValue.textContent = formatValue(range.min);
    maxValue.textContent = formatValue(range.max);
    setValueBounds(valueInput, range);
    rangeRow.hidden = false;
    criteriaRow.hidden = false;
  }

  function syncFilterCard(card, index, canRemove) {
    const heading =
      card.querySelector("[data-filter-heading]") ?? card.querySelector("h2");
    const label =
      card.querySelector("[data-filter-label]") ?? card.querySelector("label");
    const removeButton = card.querySelector("[data-filter-remove]");
    const select = card.querySelector(".filter-field-select");
    const operatorLabel = card.querySelector("[data-filter-operator-label]");
    const valueLabel = card.querySelector("[data-filter-value-label]");
    const errorMessage = card.querySelector("[data-filter-error]");
    const headingId = `${idPrefix}${index}Heading`;
    const selectId = `${idPrefix}${index}Selector`;
    const operatorId = `${idPrefix}${index}Operator`;
    const valueId = `${idPrefix}${index}Value`;
    const errorId = `${idPrefix}${index}Error`;
    const title = `Filter ${index}`;

    card.setAttribute("aria-labelledby", headingId);

    if (heading) {
      heading.dataset.filterHeading = "";
      heading.id = headingId;
      heading.textContent = title;
    }

    if (label) {
      label.dataset.filterLabel = "";
      label.setAttribute("for", selectId);
      label.textContent = `${title} field`;
    }

    if (select) {
      select.id = selectId;
    }

    if (operatorLabel) {
      const operatorSelect = card.querySelector("[data-filter-operator]");
      operatorLabel.setAttribute("for", operatorId);
      operatorLabel.textContent = `${title} operator`;

      if (operatorSelect) {
        operatorSelect.id = operatorId;
      }
    }

    if (valueLabel) {
      const valueInput = card.querySelector("[data-filter-value]");
      valueLabel.setAttribute("for", valueId);
      valueLabel.textContent = `${title} value`;

      if (valueInput) {
        valueInput.id = valueId;
      }
    }

    if (errorMessage) {
      errorMessage.id = errorId;
    }

    if (removeButton) {
      removeButton.hidden = !canRemove;
      removeButton.setAttribute("aria-label", `Remove ${title}`);
    }

    updateFilterRange(card);
  }

  function syncFilterCards() {
    const cards = getFilterCards();
    const canRemove = cards.length > minCount;

    cards.forEach((card, index) => {
      syncFilterCard(card, index + 1, canRemove);
    });
  }

  function addFilter() {
    actionRow.before(createFilterCard());
    syncFilterCards();
  }

  function removeFilter(card) {
    if (!card || getFilterCards().length <= minCount) {
      return;
    }

    card.remove();
    syncFilterCards();
  }

  function reset() {
    getFilterCards()
      .slice(minCount)
      .forEach((card) => {
        card.remove();
      });

    getFilterCards().forEach((card) => {
      const select = card.querySelector(".filter-field-select");
      const operatorSelect = card.querySelector("[data-filter-operator]");
      const valueInput = card.querySelector("[data-filter-value]");

      if (select) {
        select.value = "none";
      }

      if (operatorSelect) {
        operatorSelect.value = FILTER_OPERATORS[0];
      }

      if (valueInput) {
        valueInput.value = "";
        syncValueError(valueInput);
      }
    });

    syncFilterCards();
  }

  function updateRanges() {
    getFilterCards().forEach(updateFilterRange);
  }

  function focusFirstInvalid() {
    const invalidInput = getFilterCards()
      .map((card) => card.querySelector("[data-filter-value]"))
      .find((input) => input && !input.checkValidity());

    if (!invalidInput) {
      return true;
    }

    invalidInput.reportValidity();
    invalidInput.focus();
    return false;
  }

  function bindEvents() {
    addButton.addEventListener("click", addFilter);
    root.addEventListener("change", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const select = event.target.closest(".filter-field-select");

      if (!select || !root.contains(select)) {
        return;
      }

      updateFilterRange(select.closest("[data-filter-card]"));
    });
    root.addEventListener("input", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const valueInput = event.target.closest("[data-filter-value]");

      if (!valueInput || !root.contains(valueInput)) {
        return;
      }

      updateFilterRange(valueInput.closest("[data-filter-card]"));
    });
    root.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const removeButton = event.target.closest("[data-filter-remove]");

      if (!removeButton || !root.contains(removeButton)) {
        return;
      }

      removeFilter(removeButton.closest("[data-filter-card]"));
    });

    syncFilterCards();
  }

  return {
    addFilter,
    bindEvents,
    focusFirstInvalid,
    reset,
    sync: syncFilterCards,
    updateRanges,
  };
}
