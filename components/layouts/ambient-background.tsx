"use client"

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gen-z-lavender/12 rounded-full blur-[150px] motion-safe:animate-pulse-slow" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-gen-z-coral/12 rounded-full blur-[140px] motion-safe:animate-pulse-slow motion-safe:delay-1000" />
      <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
    </div>
  )
}
