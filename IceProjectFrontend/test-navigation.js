// Quick test of the getActiveTab function logic

function getActiveTab(currentPath) {
  if (currentPath === "/dashboard") return "dashboard";
  if (currentPath.startsWith("/dashboard/orders")) return "orders";
  if (currentPath.startsWith("/dashboard/history")) return "history";
  if (currentPath.startsWith("/dashboard/invoices")) return "invoices";
  if (currentPath.startsWith("/dashboard/payments")) return "payments";
  return "dashboard"; // default fallback
}

// Test cases
const testCases = [
  { path: "/dashboard", expected: "dashboard" },
  { path: "/dashboard/orders", expected: "orders" },
  { path: "/dashboard/history", expected: "history" },
  { path: "/dashboard/invoices", expected: "invoices" },
  { path: "/dashboard/payments", expected: "payments" },
  { path: "/dashboard/orders/new", expected: "orders" },
  { path: "/dashboard/history/123", expected: "history" },
  { path: "/some/other/path", expected: "dashboard" },
];

console.log('🧪 Testing Active Tab Detection');
console.log('==============================');

testCases.forEach(({ path, expected }) => {
  const result = getActiveTab(path);
  const status = result === expected ? '✅' : '❌';
  console.log(`${status} ${path} → ${result} (expected: ${expected})`);
});

console.log('\n🎉 Active tab detection should now work correctly!');