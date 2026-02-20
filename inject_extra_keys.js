const fs = require('fs');
const path = require('path');

const AR_PATH = path.join(__dirname, 'src', 'messages', 'ar.json');

function injectExtraPrintKeys() {
    const arData = JSON.parse(fs.readFileSync(AR_PATH, 'utf8'));

    // --- 1. Employees Print Keys ---
    if (!arData.Employees) arData.Employees = {};
    if (!arData.Employees.Report) arData.Employees.Report = {};
    if (!arData.Employees.Report.Print) arData.Employees.Report.Print = {};

    arData.Employees.Report.Print = {
        Title: "تقرير مالي للموظف",
        From: "من:",
        To: "إلى:",
        PrintDate: "تاريخ الطباعة:",
        TotalBasic: "إجمالي الأساسي",
        TotalIncentives: "إجمالي الحوافز",
        TotalDeductions: "إجمالي الاستقطاعات",
        NetDisbursed: "صافي المنصرف",
        PayrollRecords: "سجلات الرواتب",
        AdvancesRecords: "سجلات السلف والقروض",
        NoData: "لا يوجد بيانات",
        Table: {
            Date: "التاريخ",
            Month: "الشهر",
            Basic: "الأساسي",
            Incentives: "حوافز",
            Deductions: "استقطاعات",
            AdvanceDeduction: "خصم سلف",
            Net: "الصافي",
            Type: "النوع",
            Amount: "المبلغ",
            DeductionMonth: "شهر الخصم",
            Status: "الحالة",
            Notes: "ملاحظات"
        },
        AdvanceTypeDisburse: "صرف سلفة",
        AdvanceTypeRepay: "استرداد نقدي",
        StatusDeducted: "تم الخصم",
        StatusOpen: "رصيد مفتوح",
        EmpSignature: "توقيع الموظف",
        ReviewApproval: "المراجعة والاعتماد",
        FacilityStamp: "ختم المنشأة"
    };

    // --- 2. Customers Print Keys ---
    if (!arData.Customers) arData.Customers = {};
    if (!arData.Customers.Report) arData.Customers.Report = {};
    if (!arData.Customers.Report.Print) arData.Customers.Report.Print = {};

    arData.Customers.Report.Print = {
        Subtitle: "كشف حساب عميل مالي",
        ReportDate: "تاريخ التقرير:",
        SaleInvoice: "فاتورة بيع",
        ReceiptVoucher: "سند قبض",
        Table: {
            Date: "التاريخ",
            Type: "النوع",
            Reference: "المرجع",
            Description: "البيان",
            Debit: "مدين",
            Credit: "دائن",
            Balance: "الرصيد"
        },
        AccountantSignature: "توقيع المحاسب",
        ReviewSignature: "توقيع المراجعة",
        FacilityStamp: "ختم المؤسسة"
    };

    fs.writeFileSync(AR_PATH, JSON.stringify(arData, null, 4), 'utf8');
    console.log("Successfully injected extra keys into ar.json!");
}

injectExtraPrintKeys();
