import postgres from 'postgres'

if (!process.env.DATABASE_URL)
  throw Error("DATABASE_URL is not defined")
const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)

export default sql