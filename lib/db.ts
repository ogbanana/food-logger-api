import { Pool } from "pg";

const ca = process.env.DATABASE_CA_CERT;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false },
});

export default pool;
