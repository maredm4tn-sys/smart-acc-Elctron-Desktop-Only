import { getExpenseAccounts, getExpensesList } from "@/features/accounting/actions";
import { getDictionary } from "@/lib/i18n-server";
import ExpensesClientPage from "./expenses-client";

export default async function ExpensesPage() {
    try {
        const accountsList = await getExpenseAccounts();
        const rawDict = await getDictionary();
        const dict = rawDict as any;

        if (!dict || !dict.Expenses) {
            return <div className="p-10 text-center">Translation Missing: dict.Expenses</div>;
        }

        const initialData = await getExpensesList();

        return (
            <ExpensesClientPage
                initialData={initialData}
                accountsList={accountsList || []}
                dict={dict}
            />
        );
    } catch (error: any) {
        console.error("Expenses Page Crash:", error);
        return (
            <div className="p-10 text-center space-y-4">
                <h1 className="text-2xl font-bold text-red-600">حدث خطأ أثناء تحميل المصروفات</h1>
                <p className="text-gray-500">{error.message}</p>
            </div>
        );
    }
}
