export function formatRON(cents) {
  const ron = (cents / 100).toFixed(2);
  return `${ron} RON`;
}
