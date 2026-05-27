export default function handler(_req: any, res: any) {
  res.status(200).json({
    status: "online",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    checks: {
      firebase: "pending",
      storage: "online",
      runtime: "vercel-serverless",
    },
  });
}
