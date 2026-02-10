import * as schemaSqlite from './schema.sqlite';
import * as schemaPg from './schema.pg';

// Logic to determine which schema to use
// We default to SQLite unless we are on Vercel or have Postgres explicitly configured
// AND strictly NOT in desktop mode.
const isDesktop = process.env.NEXT_PUBLIC_APP_MODE === 'desktop';
const isVercel = !!process.env.VERCEL;
const hasPostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

// Priority: Desktop -> SQLite
// Vercel -> Postgres
// Local Web -> SQLite (default) unless POSTGRES_URL is set? No, let's keep local web simple with SQLite for now to match desktop dev.
// But if user wants to debug Vercel locally, they might set POSTGRES_URL.

// const usePg = !isDesktop && (isVercel || hasPostgres);
const usePg = false; // FORCED: Desktop Offline Build requires pure SQLite types

export const tenants = schemaSqlite.tenants;
export const users = schemaSqlite.users;
export const fiscalYears = schemaSqlite.fiscalYears;
export const accounts = schemaSqlite.accounts;
export const journalEntries = schemaSqlite.journalEntries;
export const journalLines = schemaSqlite.journalLines;
export const categories = schemaSqlite.categories;
export const products = schemaSqlite.products;
export const suppliers = schemaSqlite.suppliers;
export const customers = schemaSqlite.customers;
export const invoices = schemaSqlite.invoices;
export const invoiceItems = schemaSqlite.invoiceItems;
export const purchaseInvoices = schemaSqlite.purchaseInvoices;
export const purchaseInvoiceItems = schemaSqlite.purchaseInvoiceItems;
export const vouchers = schemaSqlite.vouchers;
export const auditLogs = schemaSqlite.auditLogs;
export const licensing = schemaSqlite.licensing; // No PG version usually
export const installments = schemaSqlite.installments;
export const employees = schemaSqlite.employees;
export const advances = schemaSqlite.advances;
export const payrolls = schemaSqlite.payrolls;
export const attendance = schemaSqlite.attendance;
export const representatives = schemaSqlite.representatives;
export const units = schemaSqlite.units;
export const partners = schemaSqlite.partners;
export const partnerTransactions = schemaSqlite.partnerTransactions;

// Relations
export const usersRelations = schemaSqlite.usersRelations;
export const installmentsRelations = schemaSqlite.installmentsRelations;
export const employeesRelations = schemaSqlite.employeesRelations;
export const advancesRelations = schemaSqlite.advancesRelations;
export const payrollsRelations = schemaSqlite.payrollsRelations;
export const attendanceRelations = schemaSqlite.attendanceRelations;
export const representativesRelations = schemaSqlite.representativesRelations;
export const unitsRelations = schemaSqlite.unitsRelations;
export const fiscalYearsRelations = schemaSqlite.fiscalYearsRelations;
export const accountsRelations = schemaSqlite.accountsRelations;
export const journalEntriesRelations = schemaSqlite.journalEntriesRelations;
export const journalLinesRelations = schemaSqlite.journalLinesRelations;
export const customersRelations = schemaSqlite.customersRelations;
export const suppliersRelations = schemaSqlite.suppliersRelations;
export const invoicesRelations = schemaSqlite.invoicesRelations;
export const invoiceItemsRelations = schemaSqlite.invoiceItemsRelations;
export const purchaseInvoicesRelations = schemaSqlite.purchaseInvoicesRelations;
export const purchaseInvoiceItemsRelations = schemaSqlite.purchaseInvoiceItemsRelations;
export const vouchersRelations = schemaSqlite.vouchersRelations;
export const auditLogsRelations = schemaSqlite.auditLogsRelations;
export const categoriesRelations = schemaSqlite.categoriesRelations;
export const productsRelations = schemaSqlite.productsRelations;
export const shifts = schemaSqlite.shifts;
export const shiftsRelations = schemaSqlite.shiftsRelations;
export const partnersRelations = schemaSqlite.partnersRelations;
export const partnerTransactionsRelations = schemaSqlite.partnerTransactionsRelations;
