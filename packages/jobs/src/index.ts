// Public surface for @industrysignal/jobs.
//
// Consumers should:
//   1. Import `inngest` to send events.
//   2. Call `createFunctions({ db })` to get the array to register with
//      Inngest's `serve()` handler.

export { inngest, type IndustrySignalEvents } from './client';
export { createFunctions, type JobContext } from './factory';
