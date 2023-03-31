const isEqualArrayContent = (arr1: Array<string | number>, arr2: Array<string | number>, enforceOrder: boolean = false) => {
  const vKey = (i: string | number, v: string | number) => {
    return (enforceOrder ? `${i}-` : "") + `${typeof v}-${v}`;
  };

  if (arr1.length !== arr2.length) return false;

  const d1 = {};
  const d2 = {};
  for (let i = arr1.length - 1; i >= 0; i--) {
    d1[vKey(i, arr1[i])] = true;
    d2[vKey(i, arr2[i])] = true;
  }

  for (let i = arr1.length - 1; i >= 0; i--) {
    const v = vKey(i, arr1[i]);
    if (d1[v] !== d2[v]) return false;
  }

  for (let i = arr2.length - 1; i >= 0; i--) {
    const v = vKey(i, arr2[i]);
    if (d1[v] !== d2[v]) return false;
  }

  return true;
};

const delay = (label: string, callback: Function, time: number = 500) => {
  if (typeof window.delayed_methods == "undefined") {
    window.delayed_methods = {};
  }
  window.delayed_methods[label] = Date.now();
  const t = window.delayed_methods[label];
  setTimeout(function () {
    if (window.delayed_methods[label] != t) {
      return;
    } else {
      window.delayed_methods[label] = "";
      callback();
    }
  }, time);
};

/**
 * throttle decorator/HOF
 * use to limit high frequency events
 * e.g. mousemove-event
 */
export function throttle(callback: Function, interval: number = 50) {
  let enableHandler = true;
  return function (...args) {
    if (!enableHandler) return;

    enableHandler = false;
    callback.apply(this, args);
    setTimeout(() => (enableHandler = true), interval);
  };
}

/**
 * debounce decorator/HOF
 * use to stop the handling of the event if there are too many events in a given interval
 * e.g. key-events on autocomplete-fields
 */
export function debounce(callback: Function, interval: number = 150) {
  let debounceTimeoutId;

  return function (...args) {
    clearTimeout(debounceTimeoutId);
    debounceTimeoutId = setTimeout(() => callback.apply(this, args), interval);
  };
}

const pollGraphRender = (selector, fn) => {
  let nodes = document.querySelectorAll(selector);
  const pollGraph = setInterval(() => {
    nodes = document.querySelectorAll(selector);

    if (nodes.length) {
      clearInterval(pollGraph);
      fn();
    }
  }, 500);
};

export { isEqualArrayContent, delay, pollGraphRender };
