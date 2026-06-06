const z = require('zod');

const bankDetailsSchema = z
  .object({
    accountHolderName: z.string().trim().min(2, "Account holder name must be at least 2 characters"),
    bankName: z.string().trim().min(2, "Bank name must be at least 2 characters"),
    accountNumber: z.string().trim().min(5, "Account number must be at least 5 characters"),
    confirmAccountNumber: z.string().trim().min(5, "Confirm account number must be at least 5 characters"),
    ifscCode: z
      .string()
      .trim()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC code format (e.g. SBIN0001234)"),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers do not match",
    path: ["confirmAccountNumber"],
  });

try {
  const res = bankDetailsSchema.parse({
    accountHolderName: '  John Doe  ',
    bankName: 'HDFC Bank',
    accountNumber: '1234567890',
    confirmAccountNumber: '1234567890',
    ifscCode: 'hdfc0001234'
  });
  console.log("Success! Parsed output:", res);
} catch (err) {
  console.log("Failed with issues:", JSON.stringify(err.issues, null, 2));
}
