import { describe, expect, it } from 'vitest';
import { describeOrderError } from './checkout.js';

describe('describeOrderError', () => {
  it('names the field the server rejected', () => {
    const error = Object.assign(new Error('Check the customer and cart information.'), {
      code: 'INVALID_ORDER',
      details: { formErrors: [], fieldErrors: { email: ['Invalid email address'] } }
    });
    expect(describeOrderError(error)).toBe('Check the customer and cart information. Please correct: email address.');
  });

  it('lists several rejected fields in form order', () => {
    const error = Object.assign(new Error('Check the customer and cart information.'), {
      details: { fieldErrors: { customerName: ['Too small'], address: ['Too small'] } }
    });
    expect(describeOrderError(error)).toBe('Check the customer and cart information. Please correct: full name, delivery address.');
  });

  it('keeps stock and network messages unchanged', () => {
    expect(describeOrderError(new Error('Only 5 unit(s) of 1080p Webcam are available.'))).toBe('Only 5 unit(s) of 1080p Webcam are available.');
    expect(describeOrderError(Object.assign(new Error('Could not reach the ShopSmart server.'), { code: 'NETWORK_ERROR' }))).toBe('Could not reach the ShopSmart server.');
  });

  it('ignores unknown fields and falls back to a default message', () => {
    expect(describeOrderError(Object.assign(new Error('Bad'), { details: { fieldErrors: { secret: ['x'] } } }))).toBe('Bad');
    expect(describeOrderError(null)).toBe('The order could not be placed. Please try again.');
  });
});
