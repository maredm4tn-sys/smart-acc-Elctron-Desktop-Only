CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`parent_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`balance` text DEFAULT '0.00',
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `advances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`employee_id` integer NOT NULL,
	`date` text NOT NULL,
	`salary_month` text NOT NULL,
	`amount` text NOT NULL,
	`type` text DEFAULT 'advance' NOT NULL,
	`treasury_account_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`treasury_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`employee_id` integer NOT NULL,
	`date` text NOT NULL,
	`check_in` text,
	`check_out` text,
	`status` text DEFAULT 'present' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`company_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`tax_id` text,
	`national_id` text,
	`credit_limit` real DEFAULT 0,
	`payment_day` integer,
	`opening_balance` real DEFAULT 0,
	`price_level` text DEFAULT 'retail' NOT NULL,
	`representative_id` integer,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`representative_id`) REFERENCES `representatives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`basic_salary` text DEFAULT '0.00' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `fiscal_years` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `installments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`customer_id` integer NOT NULL,
	`invoice_id` integer,
	`due_date` text NOT NULL,
	`amount` text NOT NULL,
	`amount_paid` text DEFAULT '0.00' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_date` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`product_id` integer,
	`unit_id` integer,
	`store_id` integer DEFAULT 1,
	`description` text NOT NULL,
	`quantity` text NOT NULL,
	`unit_price` text NOT NULL,
	`discount` text DEFAULT '0.00',
	`total` text NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_prod_idx` ON `invoice_items` (`invoice_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`customer_id` integer,
	`customer_name` text NOT NULL,
	`customer_tax_id` text,
	`issue_date` text NOT NULL,
	`due_date` text,
	`currency` text DEFAULT 'EGP' NOT NULL,
	`exchange_rate` text DEFAULT '1.000000' NOT NULL,
	`subtotal` text NOT NULL,
	`tax_total` text DEFAULT '0.00' NOT NULL,
	`total_amount` text NOT NULL,
	`discount_amount` text DEFAULT '0.00' NOT NULL,
	`discount_percent` text DEFAULT '0',
	`delivery_fee` text DEFAULT '0.00',
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`payment_status` text DEFAULT 'paid' NOT NULL,
	`type` text DEFAULT 'sale' NOT NULL,
	`price_type` text DEFAULT 'retail' NOT NULL,
	`store_id` integer DEFAULT 1,
	`related_invoice_id` text,
	`notes` text,
	`amount_paid` text DEFAULT '0.00' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`token_number` integer,
	`qr_code_data` text,
	`created_by` text,
	`is_installment` integer DEFAULT false,
	`installment_down_payment` text DEFAULT '0.00',
	`installment_count` integer DEFAULT 0,
	`installment_interest` text DEFAULT '0.00',
	`installment_monthly_amount` text DEFAULT '0.00',
	`representative_id` integer,
	`shift_id` integer,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`representative_id`) REFERENCES `representatives`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`fiscal_year_id` integer NOT NULL,
	`entry_number` text NOT NULL,
	`transaction_date` text NOT NULL,
	`description` text,
	`reference` text,
	`currency` text DEFAULT 'EGP' NOT NULL,
	`exchange_rate` text DEFAULT '1.000000' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `journal_entries_tenant_date_idx` ON `journal_entries` (`tenant_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `journal_entries_num_idx` ON `journal_entries` (`tenant_id`,`entry_number`);--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`description` text,
	`debit` text DEFAULT '0.00' NOT NULL,
	`credit` text DEFAULT '0.00' NOT NULL,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `journal_lines_acc_entry_idx` ON `journal_lines` (`account_id`,`journal_entry_id`);--> statement-breakpoint
CREATE TABLE `licensing` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trial_start_date` integer DEFAULT (unixepoch()),
	`is_activated` integer DEFAULT false NOT NULL,
	`activation_key` text,
	`machine_id` text,
	`last_used_date` integer,
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `payrolls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`employee_id` integer NOT NULL,
	`payment_date` text NOT NULL,
	`salary_month` text NOT NULL,
	`basic_salary` text NOT NULL,
	`incentives` text DEFAULT '0.00',
	`deductions` text DEFAULT '0.00',
	`advance_deductions` text DEFAULT '0.00',
	`net_salary` text NOT NULL,
	`treasury_account_id` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`treasury_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`type` text DEFAULT 'goods' NOT NULL,
	`sell_price` text DEFAULT '0.00' NOT NULL,
	`price_wholesale` text DEFAULT '0.00',
	`price_half_wholesale` text DEFAULT '0.00',
	`price_special` text DEFAULT '0.00',
	`buy_price` text DEFAULT '0.00' NOT NULL,
	`stock_quantity` text DEFAULT '0.00' NOT NULL,
	`min_stock` integer DEFAULT 0,
	`requires_token` integer DEFAULT false NOT NULL,
	`category_id` integer,
	`unit_id` integer,
	`location` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_invoice_id` integer NOT NULL,
	`product_id` integer,
	`description` text NOT NULL,
	`quantity` text NOT NULL,
	`unit_cost` text NOT NULL,
	`total` text NOT NULL,
	FOREIGN KEY (`purchase_invoice_id`) REFERENCES `purchase_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`supplier_id` integer,
	`supplier_name` text NOT NULL,
	`invoice_number` text,
	`reference_number` text,
	`issue_date` text NOT NULL,
	`due_date` text,
	`currency` text DEFAULT 'EGP' NOT NULL,
	`exchange_rate` text DEFAULT '1.000000' NOT NULL,
	`subtotal` text NOT NULL,
	`tax_total` text DEFAULT '0.00' NOT NULL,
	`total_amount` text NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`amount_paid` text DEFAULT '0.00' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`type` text DEFAULT 'purchase' NOT NULL,
	`related_invoice_id` integer,
	`notes` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `representatives` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`type` text DEFAULT 'sales' NOT NULL,
	`salary` text DEFAULT '0.00',
	`commission_type` text DEFAULT 'percentage',
	`commission_rate` text DEFAULT '0.00',
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`shift_number` integer NOT NULL,
	`start_time` integer DEFAULT (unixepoch()) NOT NULL,
	`end_time` integer,
	`start_balance` text DEFAULT '0.00' NOT NULL,
	`end_balance` text DEFAULT '0.00',
	`system_cash_balance` text DEFAULT '0.00',
	`system_visa_balance` text DEFAULT '0.00',
	`system_unpaid_balance` text DEFAULT '0.00',
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`company_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`tax_id` text,
	`opening_balance` real DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`tax_id` text,
	`logo_url` text,
	`currency` text DEFAULT 'EGP' NOT NULL,
	`subscription_plan` text DEFAULT 'free',
	`subscription_start_date` integer,
	`next_renewal_date` integer,
	`customer_rating` text DEFAULT 'Normal',
	`admin_notes` text,
	`activity_type` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`username` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'CLIENT' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`subscription_ends_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`voucher_number` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`amount` text NOT NULL,
	`description` text,
	`reference` text,
	`party_type` text,
	`party_id` integer,
	`account_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`shift_id` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
