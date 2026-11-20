const FIELD_LABELS = {
  customerName: 'full name',
  email: 'email address',
  address: 'delivery address',
  items: 'cart items'
};

const ACCOUNT_FIELD_LABELS = {
  name: 'full name',
  email: 'email address',
  password: 'password'
};

function describeWithFields(error, labelsByField, fallback) {
  const message = error?.message || fallback;
  const labels = Object.keys(error?.details?.fieldErrors ?? {})
    .filter((field) => labelsByField[field])
    .map((field) => labelsByField[field]);
  if (labels.length === 0) return message;
  return `${message} Please correct: ${labels.join(', ')}.`;
}

export function describeOrderError(error) {
  return describeWithFields(error, FIELD_LABELS, 'The order could not be placed. Please try again.');
}

export function describeAccountError(error) {
  return describeWithFields(error, ACCOUNT_FIELD_LABELS, 'Sign-in failed. Please try again.');
}
