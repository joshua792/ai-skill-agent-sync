const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function timestamp(): string {
  return new Date().toLocaleTimeString();
}

export function info(msg: string): void {
  console.log(`${COLORS.dim}${timestamp()}${COLORS.reset} ${msg}`);
}

export function success(msg: string): void {
  console.log(
    `${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.green}${msg}${COLORS.reset}`
  );
}

export function warn(msg: string): void {
  console.log(
    `${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.yellow}${msg}${COLORS.reset}`
  );
}

export function error(msg: string): void {
  console.error(
    `${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.red}${msg}${COLORS.reset}`
  );
}

export function dim(msg: string): void {
  console.log(`${COLORS.dim}${msg}${COLORS.reset}`);
}
