console.log("Environment variables:");
for (const key in process.env) {
  if (key.toLowerCase().includes('database') || key.toLowerCase().includes('postgres') || key.toLowerCase().includes('sql') || key.toLowerCase().includes('password') || key.toLowerCase().includes('db')) {
    console.log(`${key}: ${process.env[key]}`);
  }
}
