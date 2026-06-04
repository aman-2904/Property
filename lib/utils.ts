import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function numberToIndianWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const g = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
  };

  const h = (n: number): string => {
    if (n < 100) return g(n);
    const hundred = Math.floor(n / 100);
    const rem = n % 100;
    return a[hundred] + " Hundred" + (rem ? " and " + g(rem) : "");
  };

  const format = (val: number): string => {
    if (val === 0) return "Zero";
    let str = "";
    
    // Crore (1,00,00,000)
    const crore = Math.floor(val / 10000000);
    let rem = val % 10000000;
    if (crore > 0) {
      str += (crore < 100 ? g(crore) : h(crore)) + " Crore ";
    }
    
    // Lakh (1,00,000)
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    if (lakh > 0) {
      str += g(lakh) + " Lakh ";
    }
    
    // Thousand (1,000)
    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;
    if (thousand > 0) {
      str += g(thousand) + " Thousand ";
    }
    
    // Hundred & Below
    if (rem > 0) {
      str += h(rem);
    }
    
    return str.trim() + " Rupees Only";
  };

  return format(Math.floor(num));
}
