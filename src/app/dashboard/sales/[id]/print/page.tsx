import { db } from "@/db";
import { invoices, invoiceItems, products, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";
import { getSettings } from "@/features/settings/actions";
import { getDictionary, getLocale } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

export default async function InvoicePrintPage(props: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ type?: string; auto?: string }>
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const type = searchParams.type || 'standard';
    const auto = searchParams.auto === 'true';

    const dict = await getDictionary();
    const locale = await getLocale();
    let invoice = null;
    let items: any[] = [];
    let settings = null;

    try {
        const invId = parseInt(params.id);
        const invRes = await db.select().from(invoices).where(eq(invoices.id, invId));
        settings = await getSettings();

        if (invRes.length > 0) {
            invoice = invRes[0];
            items = await db.select({
                description: invoiceItems.description,
                quantity: invoiceItems.quantity,
                unitPrice: invoiceItems.unitPrice,
                total: invoiceItems.total,
                sku: products.sku
            })
                .from(invoiceItems)
                .leftJoin(products, eq(invoiceItems.productId, products.id))
                .where(eq(invoiceItems.invoiceId, invId));
        }
    } catch (e) {
        console.error("Print Page Error", e);
    }

    if (!invoice) return notFound();

    const dateObj = new Date(invoice.createdAt || new Date());
    const dateStr = dateObj.toLocaleDateString('en-GB');
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // --- Improved Auto-Print & Auto-Close Script ---
    const autoPrintScript = (
        <script dangerouslySetInnerHTML={{
            __html: `
                (function() {
                    function signalDone() {
                        if (window.opener) {
                            window.opener.postMessage({ type: 'PRINT_COMPLETED' }, '*');
                        }
                    }

                    window.addEventListener('afterprint', () => {
                        signalDone();
                        ${auto ? 'window.close();' : ''}
                    });

                    // Also signal if the user just closes the tab or navigates away
                    window.addEventListener('beforeunload', signalDone);

                    ${auto ? `
                    window.onload = function() {
                        setTimeout(function() {
                            window.focus();
                            window.print();
                        }, 800);
                    };
                    ` : ''}
                })();
            `
        }} />
    );

    // --- THERMAL LAYOUT (80mm) ---
    if (type === 'thermal') {
        return (
            <div className="bg-white h-auto text-black font-mono font-bold" style={{ width: '80mm', margin: '0', padding: '4mm' }}>
                <style>{`
                    @media print {
                        @page { size: 80mm auto; margin: 0; }
                        body { margin: 0; padding: 0; width: 80mm; background: white; overflow: hidden; }
                        .no-print { display: none; }
                        * { -webkit-print-color-adjust: exact; }
                    }
                `}</style>
                {autoPrintScript}

                <div className="text-center mb-2">
                    <h1 className="text-xl leading-tight font-black">{settings?.name || "المحاسب الذكي"}</h1>
                    <div className="border-t-2 border-black my-1" />
                    <p className="text-sm">فاتورة مبيعات</p>
                </div>

                <div className="text-[12px] space-y-1 my-3">
                    <div className="flex justify-between"><span>التاريخ:</span><span>{dateStr}</span></div>
                    <div className="flex justify-between"><span>الوقت:</span><span>{timeStr}</span></div>
                    <div className="flex justify-between"><span>رقم الفاتورة:</span><span>#{invoice.invoiceNumber}</span></div>
                    <div className="flex justify-between"><span>العميل:</span><span>{invoice.customerName || "عميل نقدي"}</span></div>
                </div>

                <div className="border-t-2 border-dashed border-black my-2" />
                <div className="flex text-[11px] pb-1 font-black">
                    <span className="w-10">الكمية</span>
                    <span className="flex-1 px-1">الصنف</span>
                    <span className="w-20 text-left">الإجمالي</span>
                </div>
                <div className="border-t border-black mb-1" />

                <div className="space-y-2 mb-4">
                    {items.map((item, i) => (
                        <div key={i} className="flex text-[12px] items-start border-b border-gray-100 pb-1">
                            <span className="w-10">{Number(item.quantity)}</span>
                            <span className="flex-1 px-1 leading-tight">{item.description}</span>
                            <span className="w-20 text-left font-black">{Number(item.total).toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t-2 border-dashed border-black my-2" />
                <div className="text-[12px] space-y-1">
                    <div className="flex justify-between"><span>المجموع:</span><span>{Number(invoice.subtotal).toFixed(2)}</span></div>
                    {Number(invoice.taxTotal) > 0 && <div className="flex justify-between"><span>الضريبة (14%):</span><span>{Number(invoice.taxTotal).toFixed(2)}</span></div>}
                    {Number(invoice.discountAmount) > 0 && <div className="flex justify-between"><span>الخصم:</span><span>-{Number(invoice.discountAmount).toFixed(2)}</span></div>}
                </div>
                <div className="border-t-2 border-black my-2" />

                <div className="flex justify-between items-center text-xl py-1 font-black">
                    <span>الإجمالي:</span>
                    <span>{Number(invoice.totalAmount).toFixed(2)} {settings?.currency || "EGP"}</span>
                </div>

                <div className="text-center text-[10px] mt-8 opacity-70">
                    <p>شكراً لتعاملكم معنا</p>
                    <p>*** المحاسب الذكي ***</p>
                </div>

                <div className="no-print mt-8 flex justify-center">
                    <PrintButton />
                </div>
            </div>
        );
    }

    // --- STANDARD A4 LAYOUT ---
    return (
        <div className="bg-white min-h-screen p-0 sm:p-8 text-black font-sans" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <style>{`
                @media print {
                    @page { size: A4; margin: 15mm; }
                    body { margin: 0; padding: 0; background: white; }
                    .no-print { display: none; }
                }
            `}</style>
            {autoPrintScript}

            <div className="max-w-[210mm] mx-auto bg-white p-8 border print:border-0 shadow-sm print:shadow-none min-h-[297mm] flex flex-col">
                {/* Header */}
                <div className={cn("flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-8")}>
                    <div>
                        <h1 className="text-4xl font-black text-blue-900 mb-2">{settings?.name || dict.Logo}</h1>
                        <p className="text-gray-600 font-bold">{settings?.address || dict.Settings.Form.Placeholders.Address}</p>
                        <p className="text-gray-600 font-bold">{settings?.phone || dict.Settings.Form.Placeholders.Phone}</p>
                    </div>
                    <div className={cn("text-left")} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="bg-blue-900 text-white px-6 py-2 rounded-lg mb-2 inline-block">
                            <h2 className="text-xl font-bold uppercase tracking-widest">
                                {Number(invoice.taxTotal) > 0 ? dict.Sales.Invoice.Print.Title : dict.Sales.Invoice.Print.SimpleTitle}
                            </h2>
                        </div>
                        <div className="space-y-1 text-sm font-bold text-gray-700">
                            <p>{dict.Sales.Invoice.Print.InvoiceNo}: <span className="text-blue-900">#{invoice.invoiceNumber}</span></p>
                            <p>{dict.Sales.Invoice.Print.Date}: {dateStr}</p>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-2">{dict.Sales.Invoice.Print.BillTo}</h3>
                        <p className="text-lg font-black text-slate-900">{invoice.customerName || dict.Sales.Invoice.Form.CashCustomer}</p>
                    </div>
                    <div className={cn("bg-slate-50 p-4 rounded-xl border border-slate-100")} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-2">{dict.POS.PaymentMethod}</h3>
                        <p className="text-lg font-black text-blue-700 uppercase">
                            {invoice.paymentMethod === 'cash' ? dict.POS.Cash :
                                invoice.paymentMethod === 'card' ? dict.POS.Card :
                                    invoice.paymentMethod === 'bank' ? dict.POS.Bank : (invoice.paymentMethod || "CASH")}
                        </p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="flex-1">
                    <table className="w-full border-collapse overflow-hidden rounded-xl shadow-sm">
                        <thead className="bg-blue-900 text-white">
                            <tr>
                                <th className={cn("p-4", locale === 'ar' ? "text-right" : "text-left")}>{dict.Sales.Invoice.Print.Item} / {dict.Sales.Invoice.Form.Table.Description}</th>
                                <th className="p-4 text-center w-24">{dict.Sales.Invoice.Print.Qty}</th>
                                <th className="p-4 text-center w-32">{dict.Sales.Invoice.Print.Price}</th>
                                <th className={cn("p-4 w-32", locale === 'ar' ? "text-left" : "text-right")}>{dict.Sales.Invoice.Print.Total}</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 font-medium">
                            {items.map((item, i) => (
                                <tr key={i} className="border-b border-slate-100 even:bg-slate-50/50">
                                    <td className={cn("p-4 font-bold", locale === 'ar' ? "text-right" : "text-left")}>{item.description}</td>
                                    <td className="p-4 text-center font-mono">{Number(item.quantity).toFixed(2)}</td>
                                    <td className="p-4 text-center font-mono">{Number(item.unitPrice).toFixed(2)}</td>
                                    <td className={cn("p-4 font-mono font-bold", locale === 'ar' ? "text-left" : "text-right")} dir="ltr">{Number(item.total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className={cn("mt-8 flex", locale === 'ar' ? "justify-end" : "justify-end")}>
                    <div className="w-72 space-y-3">
                        <div className="flex justify-between px-2 text-slate-500 font-bold">
                            <span>{dict.Sales.Invoice.Print.Subtotal}:</span>
                            <span className="font-mono">{Number(invoice.subtotal).toFixed(2)}</span>
                        </div>
                        {Number(invoice.taxTotal) > 0 && (
                            <div className="flex justify-between px-2 text-slate-500 font-bold">
                                <span>{dict.Sales.Invoice.Print.Tax}:</span>
                                <span className="font-mono">{Number(invoice.taxTotal).toFixed(2)}</span>
                            </div>
                        )}
                        {Number(invoice.discountAmount) > 0 && (
                            <div className="flex justify-between px-2 text-green-600 font-bold">
                                <span>{dict.Sales.Invoice.Form.Discount}:</span>
                                <span className="font-mono">-{Number(invoice.discountAmount).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between bg-blue-900 text-white p-4 rounded-xl shadow-lg">
                            <span className="text-xl font-black">{dict.Sales.Invoice.Print.GrandTotal}:</span>
                            <span className="text-2xl font-black font-mono">{Number(invoice.totalAmount).toFixed(2)} {settings?.currency || "EGP"}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Message */}
                <div className="mt-16 border-t pt-6 text-center text-slate-400 text-sm font-bold">
                    <p>{dict.Sales.Invoice.Print.Footer}</p>
                </div>
            </div>

            <div className="fixed bottom-8 left-8 no-print">
                <PrintButton />
            </div>
        </div>
    );
}
