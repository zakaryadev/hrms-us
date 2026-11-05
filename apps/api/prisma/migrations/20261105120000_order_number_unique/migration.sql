-- Буйруқ рақами бир йил ичида такрорланмаслиги керак. Эски маълумотларда дубликат бўлса, индекс яратилмайди
-- (миграция тўхтамайди); дубликатларни тозалагандан кейин индексни қўлда яратиш мумкин.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "orders" GROUP BY "order_number", EXTRACT(YEAR FROM "order_date") HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'orders: дубликат буйруқ рақамлари топилди — unique индекс яратилмади';
  ELSE
    CREATE UNIQUE INDEX "orders_number_year_key" ON "orders" ("order_number", (EXTRACT(YEAR FROM "order_date")));
  END IF;
END $$;
