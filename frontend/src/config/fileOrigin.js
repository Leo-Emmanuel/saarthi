/**
 * File origin — base URL for static files served by the backend.
 *
 * Derived from the centralized axios baseURL by stripping the "/api"
 * suffix, e.g. "http://localhost:5000/api" → "http://localhost:5000".
 *
 * Import this instead of recomputing FILE_ORIGIN in every component.
 */
import api from './axios';

export const FILE_ORIGIN = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
