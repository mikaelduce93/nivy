// Test-only shim for `server-only`. The real package throws at import
// time when bundled for the client; tests run in node and need to import
// server modules without that guard.
export {}
