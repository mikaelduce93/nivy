// Ambient module declarations for packages that ship no types.
// Keep this file as a script (no top-level imports/exports) so the
// `declare module` blocks remain ambient rather than module augmentations.

declare module 'react-speech-recognition' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition: any
  export default SpeechRecognition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const useSpeechRecognition: any
}
