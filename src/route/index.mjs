import compose from 'koa-compose';

// Import all routes
import apiV1 from './api-v1.mjs';


export default async () => compose([
  await apiV1(),
]);
