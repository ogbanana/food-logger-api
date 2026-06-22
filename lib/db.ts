import { Pool } from "pg";

// Prefer verified TLS. When the managed provider's CA certificate is supplied
// via DATABASE_CA_CERT, the server certificate is fully validated. Only when no
// CA is configured do we fall back to the previous unverified behavior, so
// production can be tightened by setting DATABASE_CA_CERT.
const ca = process.env.DATABASE_CA_CERT;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false },
});

export default pool;
