const fs = require('fs');
const path = require('path');

const AR_PATH = path.join(__dirname, 'src', 'messages', 'ar.json');

function injectPrintKeys() {
    console.log("Reading ar.json...");
    const arData = JSON.parse(fs.readFileSync(AR_PATH, 'utf8'));

    // --- 1. General Statement Print Keys ---
    if (!arData.Reports) arData.Reports = {};
    if (!arData.Reports.GeneralStatement) arData.Reports.GeneralStatement = {};

    arData.Reports.GeneralStatement.ReportTitles = {
        Customer: "كشف حساب عميل",
        Supplier: "كشف حساب مورد",
        Treasury: "كشف حركة نقدية",
        Expense: "تحليل مصروفات",
        General: "كشف حساب عام"
    };

    arData.Reports.GeneralStatement.Headers = {
        PrintDate: "تاريخ الطباعة:",
        PeriodFrom: "تقرير حركة الحساب في الفترة من",
        PeriodTo: "إلى",
        Code: "الكود:"
    };

    arData.Reports.GeneralStatement.Summary = {
        OpeningBalance: "الرصيد الافتتاحي",
        TotalMovement: "إجمالي الحركة",
        ClosingBalance: "الرصيد الختامي"
    };

    arData.Reports.GeneralStatement.Table = {
        Date: "التاريخ",
        DueDate: "الاستحقاق",
        Description: "البيان",
        Reference: "المرجع",
        Debit: "مدين (+)",
        Credit: "دائن (-)",
        Balance: "الرصيد"
    };

    arData.Reports.GeneralStatement.Footer = {
        AccountantSignature: "توقيع المحاسب",
        ReviewSignature: "توقيع المراجعة",
        Stamp: "ختم المؤسسة",
        DateGenerated: "تم إنشاء هذا التقرير بواسطة المحاسب الذكي في {date}"
    };

    // --- 2. Sales / Purchases Print Keys enhancements ---
    if (!arData.Sales) arData.Sales = {};
    if (!arData.Sales.Invoice) arData.Sales.Invoice = {};
    if (!arData.Sales.Invoice.Print) arData.Sales.Invoice.Print = {};

    arData.Sales.Invoice.Print.Tax = "ضريبة القيمة المضافة";
    arData.Sales.Invoice.Print.InstallmentInterest = "فائدة التقسيط";

    if (!arData.Purchases) arData.Purchases = {};
    if (!arData.Purchases.Print) arData.Purchases.Print = {};
    arData.Purchases.Print.Title = "فاتورة مشتريات";
    arData.Purchases.Print.Supplier = "المورد:";
    arData.Purchases.Print.PaymentMethod = "طريقة الدفع:";
    arData.Purchases.Print.Item = "الصنف / البيان";
    arData.Purchases.Print.Qty = "الكمية";
    arData.Purchases.Print.Price = "السعر";
    arData.Purchases.Print.Total = "الإجمالي";
    arData.Purchases.Print.Subtotal = "المجموع الفرعي:";
    arData.Purchases.Print.GrandTotal = "الإجمالي النهائي:";
    arData.Purchases.Print.Footer = "شكراً لتعاملكم معنا";

    // --- 3. Representatives Print Keys ---
    if (!arData.Representatives) arData.Representatives = {};
    if (!arData.Representatives.Report) arData.Representatives.Report = {};
    if (!arData.Representatives.Report.Print) arData.Representatives.Report.Print = {};

    arData.Representatives.Report.Print = {
        Title: "تقرير أداء مندوب مبيعات",
        Subtitle: "كشف عمولات ومبيعات",
        From: "من:",
        To: "إلى:",
        PrintDate: "تاريخ الطباعة:",
        TotalSales: "إجمالي المبيعات",
        InvoicesCount: "فاتورة",
        Collected: "المحقق / المحصل",
        FixedSalary: "الراتب الثابت",
        DueCommission: "العمولة المستحقة",
        RatePercentage: "%",
        RateFixed: "ثابت",
        TotalDue: "إجمالي المستحق",
        RelatedInvoicesTitle: "فواتير المبيعات المرتبطة",
        NoData: "لا توجد فواتير مرتبطة خلال هذه الفترة",
        StatusPaid: "خالص",
        StatusPartial: "جزئي",
        StatusDeferred: "آجل",
        RepSignature: "توقيع المندوب",
        ReviewApproval: "المراجعة والاعتماد",
        FacilityStamp: "ختم المنشأة",
        Table: {
            InvoiceNo: "رقم الفاتورة",
            Date: "تاريخ",
            Customer: "العميل",
            Total: "الإجمالي",
            Paid: "المدفوع",
            Status: "الحالة"
        }
    };

    fs.writeFileSync(AR_PATH, JSON.stringify(arData, null, 4), 'utf8');
    console.log("Successfully injected new keys into ar.json!");
}

injectPrintKeys();
