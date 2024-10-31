export function fetchSettings() {
  const settings = {};
  document.querySelectorAll("[data-param]").forEach((el) => {
    const rawVal = el.value;
    const conversion = {
      number: (val) => Number(val),
      string: (val) => val,
      checkbox: (val) => val === "on",
    }[el.dataset.type];

    settings[el.dataset.key] = conversion(rawVal);
  });
  return settings;
}
