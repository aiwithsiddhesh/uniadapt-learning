declare namespace Cloudflare {
  interface Env {
    UNIADAPT_AUTH_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
