declare namespace Cloudflare {
  interface Env {
    UNIADAPT_AUTH_SECRET?: string;
    UNIADAPT_BOOTSTRAP_TOKEN?: string;
    UNIADAPT_ACCESS_ISSUER?: string;
    UNIADAPT_ACCESS_AUDIENCE?: string;
    UNIADAPT_ALLOWED_EMAILS?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
