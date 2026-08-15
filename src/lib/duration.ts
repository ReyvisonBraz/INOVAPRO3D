/** Formatação de tempo restante para contadores da interface. */

export interface DurationParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export function splitDuration(milliseconds: number): DurationParts {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Relógio compacto: `mm:ss`, ganhando o campo de horas apenas quando existe. */
export function formatClock(milliseconds: number): string {
  const { hours, minutes, seconds } = splitDuration(milliseconds);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Texto por extenso para leitores de tela, onde `12:05` seria ambíguo. */
export function describeDuration(milliseconds: number): string {
  const { hours, minutes, seconds } = splitDuration(milliseconds);
  const parts = [
    hours > 0 ? `${hours} ${hours === 1 ? "hora" : "horas"}` : null,
    minutes > 0 ? `${minutes} ${minutes === 1 ? "minuto" : "minutos"}` : null,
    `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`,
  ].filter((part): part is string => part !== null);
  return parts.join(" e ");
}
