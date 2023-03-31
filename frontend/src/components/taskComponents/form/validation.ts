const setValidity = (target: HTMLInputElement, isValid: boolean) => {
  if (isValid) {
    target.classList.remove("invalid");
    target.classList.add("valid");
  } else {
    target.classList.remove("valid");
    target.classList.add("invalid");
  }
};

export const evaluateRange = (props: { elementId: number; element: any }) => {
  const { min, max } = props.element.boundaries;
  const lowerInput: HTMLInputElement = document.querySelector(`.${props.elementId}__initial__lowerValue`);
  const upperInput: HTMLInputElement = document.querySelector(`.${props.elementId}__initial__upperValue`);
  const lowerValue = parseFloat(lowerInput.value.replace(",", "."));
  const upperValue = parseFloat(upperInput.value.replace(",", "."));

  const lowerCondition = lowerValue >= min && lowerValue <= max && lowerValue <= upperValue;
  const upperCondition = upperValue >= min && upperValue <= max && upperValue >= lowerValue;

  setValidity(lowerInput, lowerCondition);
  setValidity(upperInput, upperCondition);
};

export const evaluateValue = (props: { elementId: number; element: any }) => {
  if (!props.element.validate) return;
  const { min, max } = props.element.boundaries;
  const input: HTMLInputElement = document.querySelector(`.${props.elementId}__value`);
  const value = parseFloat(input.value.replace(",", "."));
  const condition = value >= min && value <= max;

  setValidity(input, condition);
};
