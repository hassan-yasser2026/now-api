UPDATE "orders"
SET "platformCommission" = ROUND("subtotal" * 0.05, 2)
WHERE "platformCommission" = 0
  AND "subtotal" > 0;
