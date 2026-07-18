export function formatVolts(v: number): string {
  if (Math.abs(v) < 0.0005) return "0V";
  if (Math.abs(v) < 1) return `${(v * 1000).toFixed(0)}mV`;
  return `${v.toFixed(2).replace(/\.?0+$/, "")}V`;
}

export function formatAmps(a: number): string {
  const abs = Math.abs(a);
  if (abs < 1e-6) return "0A";
  if (abs >= 1) return `${a.toFixed(2).replace(/\.?0+$/, "")}A`;
  if (abs >= 1e-3) return `${(a * 1000).toFixed(1).replace(/\.0$/, "")}mA`;
  return `${(a * 1e6).toFixed(0)}µA`;
}

export function formatOhms(ohms: number): string {
  if (ohms >= 1e6) return `${(ohms / 1e6).toFixed(1).replace(/\.0$/, "")}MΩ`;
  if (ohms >= 1e3) return `${(ohms / 1e3).toFixed(1).replace(/\.0$/, "")}kΩ`;
  return `${ohms.toFixed(1).replace(/\.0$/, "")}Ω`;
}
