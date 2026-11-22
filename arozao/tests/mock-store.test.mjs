import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDemoStore, createUser, getCurrentCustomerOrders } from '../lib/mock-store.mjs';

test('demo store initializes with products and seeded customer user', () => {
  const store = initializeDemoStore();
  assert.ok(Array.isArray(store.products) && store.products.length >= 12);
  assert.ok(Array.isArray(store.users) && store.users.length >= 1);
  assert.ok(Array.isArray(store.orders));
});

test('createUser persists a customer account with the expected fields', () => {
  const store = initializeDemoStore();
  const user = createUser(store, {
    name: 'Test Customer',
    email: 'test@example.com',
    password: 'securepass',
    role: 'customer'
  });

  assert.equal(user.role, 'customer');
  assert.equal(user.email, 'test@example.com');
  assert.ok(user.id);
});

test('customer order lookup returns the current user order list', () => {
  const store = initializeDemoStore();
  const result = getCurrentCustomerOrders(store, 'demo-customer');
  assert.ok(Array.isArray(result));
});
