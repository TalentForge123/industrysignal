// @industrysignal/connectors-fr — France data-source connectors.
//
// Public surface: the CountryConnector factory + the contract types. The
// research pipeline (Block B) consumes `createFrConnector()` and never
// touches the per-source clients directly.

export { createFrConnector, frCapabilities, type FrConnectorOptions } from './connector';
export { DiskCache, NullCache, DAY_MS, type Cache } from './cache';
export * from './types';
