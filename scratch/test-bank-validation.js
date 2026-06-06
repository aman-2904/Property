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

function runTest(testName, payload, shouldPass, expectedErrorMsg = null) {
  try {
    const result = bankDetailsSchema.parse(payload);
    if (shouldPass) {
      console.log(`PASS: ${testName}`);
    } else {
      console.error(`FAIL: ${testName} - Expected validation failure but it passed. Result:`, result);
    }
  } catch (err) {
    if (!shouldPass) {
      const issues = err.issues.map(i => i.message);
      if (expectedErrorMsg && !issues.some(msg => msg.includes(expectedErrorMsg))) {
        console.error(`FAIL: ${testName} - Failed as expected, but error message did not contain "${expectedErrorMsg}". Actual errors:`, issues);
      } else {
        console.log(`PASS: ${testName} (failed as expected with message: "${issues[0]}")`);
      }
    } else {
      console.error(`FAIL: ${testName} - Expected validation to pass but it failed:`, err.issues);
    }
  }
}

// 1. Valid payload
runTest('Valid input should pass', {
  accountHolderName: '  John Doe  ',
  bankName: 'HDFC Bank',
  accountNumber: '1234567890',
  confirmAccountNumber: '1234567890',
  ifscCode: 'hdfc0001234'
}, true);

// 2. Invalid IFSC code
runTest('Invalid IFSC format (lowercase/uppercase regex and pattern check)', {
  accountHolderName: 'John Doe',
  bankName: 'HDFC Bank',
  accountNumber: '1234567890',
  confirmAccountNumber: '1234567890',
  ifscCode: 'HDFC123456'
}, false, 'Invalid IFSC');

// 3. Mismatched account numbers
runTest('Account numbers mismatch', {
  accountHolderName: 'John Doe',
  bankName: 'HDFC Bank',
  accountNumber: '1234567890',
  confirmAccountNumber: '1234567891',
  ifscCode: 'HDFC0001234'
}, false, 'Account numbers do not match');

// 4. Missing / Blank fields (testing trim & minimum length)
runTest('Blank Account Holder Name (triggers min character check)', {
  accountHolderName: '    ',
  bankName: 'HDFC Bank',
  accountNumber: '1234567890',
  confirmAccountNumber: '1234567890',
  ifscCode: 'HDFC0001234'
}, false, 'must be at least 2 characters');
