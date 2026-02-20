import { db } from "@/db";
import { purchaseInvoices, purchaseInvoiceItems, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PrintButton } from "../../sales/[id]/print-button"; // Reuse the same button
import { getSettings } from "@/features/settings/actions";
import { getDictionary, getLocale } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

export default async function PurchasePrintPage(props: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ type?: string; auto?: string }>
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const type = searchParams.type || 'standard';
    const auto = searchParams.auto === 'true';
    const dict = await getDictionary() as any;
    const locale = await getLocale();

    let invoice = null;
    let items: any[] = [];
    let settings = null;

    try {
        const invId = parseInt(params.id);
        const invRes = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, invId));
        settings = await getSettings();

        if (invRes.length > 0) {
            invoice = invRes[0];
            items = await db.select({
                description: purchaseInvoiceItems.description,
                quantity: purchaseInvoiceItems.quantity,
                unitPrice: purchaseInvoiceItems.unitCost, // Schema uses unitCost
                total: purchaseInvoiceItems.total,
                sku: products.sku
            })
                .from(purchaseInvoiceItems)
                .leftJoin(products, eq(purchaseInvoiceItems.productId, products.id))
                .where(eq(purchaseInvoiceItems.purchaseInvoiceId, invId)); // Schema uses purchaseInvoiceId
        }
    } catch (e) {
        console.error("Print Page Error", e);
    }

    if (!invoice) return notFound();

    const dateStr = invoice.issueDate;

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

    return (
        <div className="bg-white min-h-screen p-0 sm:p-8 text-black font-sans" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <style>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { margin: 0; padding: 0; background: white; }
                    .no-print { display: none; }
                }
            `}</style>
            {autoPrintScript}

            <div className="max-w-[210mm] mx-auto bg-white p-8 border print:border-0 shadow-sm print:shadow-none flex flex-col">
                <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-6 mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-emerald-900 mb-2">{settings?.name || dict.Logo}</h1>
                        <p className="text-gray-600 font-bold">{settings?.address || dict.Settings.Form.Placeholders.Address}</p>
                        <p className="text-gray-600 font-bold">{settings?.phone || dict.Settings.Form.Placeholders.Phone}</p>
                    </div>
                    <div className={cn(locale === 'ar' ? "text-right" : "text-left")}>
                        <div className="bg-emerald-900 text-white px-6 py-2 rounded-lg mb-2 inline-block">
                            <h2 className="text-xl font-bold uppercase tracking-widest">
                                {dict.Purchases?.Print?.Title}
                            </h2>
                        </div>
                        <div className="space-y-1 text-sm font-bold text-gray-700">
                            <p>{dict.Purchases.Table.InvoiceNo}: <span className="text-emerald-900">#{invoice.invoiceNumber}</span></p>
                            <p>{dict.Purchases.Table.Date}: {dateStr}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-2">{dict.Purchases?.Print?.Supplier}</h3>
                        <p className="text-lg font-black text-slate-900">{invoice.supplierName}</p>
                    </div>
                    <div className={cn("bg-slate-50 p-4 rounded-xl border border-slate-100", locale === 'ar' ? "text-right" : "text-left")}>
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-2">{dict.Purchases?.Print?.PaymentMethod}</h3>
                        <p className="text-lg font-black text-emerald-700 uppercase">
                            {invoice.paymentMethod === 'cash' ? dict.POS.Cash : dict.POS.Credit}
                        </p>
                    </div>
                </div>

                <div className="flex-1">
                    <table className="w-full border-collapse overflow-hidden rounded-xl shadow-sm">
                        <thead className="bg-emerald-900 text-white">
                            <tr>
                                <th className={cn("p-4", locale === 'ar' ? "text-right" : "text-left")}>{dict.Purchases?.Print?.Item}</th>
                                <th className="p-4 text-center w-24">{dict.Purchases?.Print?.Qty}</th>
                                <th className="p-4 text-center w-32">{dict.Purchases?.Print?.Price}</th>
                                <th className={cn("p-4 w-32", locale === 'ar' ? "text-left" : "text-right")}>{dict.Purchases?.Print?.Total}</th>
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

                <div className="mt-8 flex justify-end">
                    <div className="w-72 space-y-3">
                        <div className="flex justify-between px-2 text-slate-500 font-bold">
                            <span>{dict.Purchases?.Print?.Subtotal}</span>
                            <span className="font-mono">{Number(invoice.subtotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between bg-emerald-900 text-white p-4 rounded-xl shadow-lg">
                            <span className="text-xl font-black uppercase">{dict.Purchases?.Print?.GrandTotal}</span>
                            <span className="text-2xl font-black font-mono">{Number(invoice.totalAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-16 border-t pt-6 text-center text-slate-400 text-sm font-bold">
                    <p>{dict.Purchases?.Print?.Footer}</p>
                </div>
            </div>

            <div className={cn("fixed bottom-8 no-print", locale === 'ar' ? "left-8" : "right-8")}>
                <PrintButton />
            </div>
        </div>
    );
}
