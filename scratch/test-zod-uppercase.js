const z = require('zod');

try {
  z.string().trim().uppercase();
  console.log("z.string().uppercase() exists!");
} catch (e) {
  console.log("z.string().uppercase() DOES NOT exist. Error:", e.message);
}
