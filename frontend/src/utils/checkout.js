const FIELD_LABELS = {
  customerName: 'full name',
  email: 'email address',
  address: 'delivery address',
  items: 'cart items'
};

export function describeOrderError(error) {
  const message = error?.message || 'The order could not be placed. Please try again.';
  const labels = Object.keys(error?.details?.fieldErrors ?? {})
    .filter((field) => FIELD_LABELS[field])
    .map((field) => FIELD_LABELS[field]);
  if (labels.length === 0) return message;
  return `${message} Please correct: ${labels.join(', ')}.`;
}
