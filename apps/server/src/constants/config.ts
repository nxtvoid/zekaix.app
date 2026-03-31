const DEFAULT_PORT = 3001
const parsed = Number(process.env.PORT)
export const PORT = Number.isFinite(parsed) ? parsed : DEFAULT_PORT
export const WEB_ORIGIN = process.env.WEB_ORIGIN
