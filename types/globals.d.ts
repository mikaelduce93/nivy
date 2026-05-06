/**
 * Global ambient type declarations for third-party packages
 * that don't ship their own types and aren't covered by @types/*.
 *
 * TODO(ts): widen type — install proper @types or write narrow surfaces
 * once the consuming components stabilise.
 */

// react-speech-recognition has no published @types and the bundled types
// are inadequate. We declare an opaque module to unblock the type-checker;
// runtime behavior is unchanged.
declare module 'react-speech-recognition' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition: any
  export default SpeechRecognition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const useSpeechRecognition: any
}
