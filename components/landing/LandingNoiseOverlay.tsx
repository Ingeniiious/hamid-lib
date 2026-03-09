import { NOISE_TEXTURE } from "./landing-constants";

export function LandingNoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        backgroundImage: `url(${NOISE_TEXTURE})`,
        backgroundRepeat: "repeat",
        opacity: 0.035,
      }}
    />
  );
}
