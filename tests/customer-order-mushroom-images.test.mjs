import assert from 'node:assert/strict';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { readFileSync } from 'node:fs';

const mushroomTypes = [{
  mushroom_type_id: 3,
  name: 'Nấm sò trắng',
  image_url: 'https://cdn.example/mushroom-from-db.png',
}];
const mushroomSource = readFileSync(new URL('../src/core/api/mushroomImages.ts', import.meta.url), 'utf8');
const mushroomCompiled = ts.transpileModule(mushroomSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const mushroomModule = new Module('mushroom-images-test');
mushroomModule.require = (name) => {
  if (name.endsWith('/axiosClient')) {
    return { axiosClient: { get: async () => ({ data: { data: mushroomTypes } }) } };
  }
  if (name.endsWith('/endpoints')) {
    return { API_ENDPOINTS: { MUSHROOM_TYPES: { BASE: '/mushroom-types' } } };
  }
  throw new Error(`Unexpected dependency: ${name}`);
};
mushroomModule._compile(mushroomCompiled.outputText, 'mushroom-images-test');
const { findMushroomImage, getMushroomImages } = mushroomModule.exports;

let requestedUrl;
const repositorySource = readFileSync(
  new URL('../src/features/order/data/repositories/OrderRepository.ts', import.meta.url),
  'utf8',
);
const repositoryCompiled = ts.transpileModule(repositorySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const repositoryModule = new Module('order-repository-mushroom-images-test');
repositoryModule.require = (name) => {
  if (name.endsWith('/axiosClient')) {
    return {
      axiosClient: {
        get: async (url) => {
          requestedUrl = url;
          if (url === '/orders') {
            return {
              data: {
                data: [{
                  order_id: 11,
                  user_id: 8,
                  status: 'PAID',
                  payment_status: 'PAID',
                  total_amount: 1000,
                  mushroom_name: 'Nấm sò trắng',
                  items: [{
                    order_item_id: 2,
                    item_type: 'MUSHROOM',
                    mushroom_type_id: 999,
                    mushroom_name: 'Nấm sò trắng',
                    image_url: null,
                    quantity: 1,
                    unit_price: 1000,
                    total_price: 1000,
                  }],
                }],
              },
            };
          }
          return {
            data: {
              data: {
                orderId: 11,
                sessions: [{
                  session_id: 21,
                  mushroom_type_id: 999,
                  mushroom_name: 'Nấm sò trắng',
                  status: 'CULTIVATING',
                  assigned_trays: [],
                }],
              },
            },
          };
        },
      },
    };
  }
  if (name.endsWith('/endpoints')) {
    return {
      API_ENDPOINTS: {
        ORDERS: { BASE: '/orders' },
        CUSTOMER: { CULTIVATION_STATUS: (orderId) => `/orders/${orderId}/cultivation` },
      },
    };
  }
  if (name.endsWith('/mushroomImages')) {
    return { findMushroomImage, getMushroomImages };
  }
  if (name.endsWith('/appError')) {
    return {
      AppError: class AppError extends Error {
        constructor(message, code, status) {
          super(message);
          this.code = code;
          this.status = status;
        }
      },
    };
  }
  if (name.endsWith('/errorHandler')) {
    return { handleApiError: (error) => error };
  }
  throw new Error(`Unexpected dependency: ${name}`);
};
repositoryModule._compile(repositoryCompiled.outputText, 'order-repository-mushroom-images-test');
const { OrderRepository } = repositoryModule.exports;
const repository = new OrderRepository();

test('orders and sessions use the mushroom catalog image, falling back from ID to name', async () => {
  const orders = await repository.getCustomerOrders();
  assert.equal(orders[0].items[0].image_url, mushroomTypes[0].image_url);
  assert.equal(orders[0].image_url, mushroomTypes[0].image_url);

  const status = await repository.getCustomerCultivationStatus(11);
  assert.equal(requestedUrl, '/orders/11/cultivation');
  assert.equal(status.sessions[0].mushroom_image_url, mushroomTypes[0].image_url);
});
