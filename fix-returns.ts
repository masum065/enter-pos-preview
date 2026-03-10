import { db } from "./src/db";
import { sales, saleReturns, saleItems, stockItems, customers } from "./src/db/schema";
import { eq, inArray } from "drizzle-orm";

async function run() {
  console.log("Fetching sales with returns...");
  
  const allSales = await db.select().from(sales);
  
  for (const sale of allSales) {
    const totalReturned = parseFloat(sale.totalReturned || "0");
    if (totalReturned > 0) {
      console.log(`Fixing sale ${sale.invoiceNumber} (ID: ${sale.id}) - Total Returned: ${totalReturned}`);
      
      // Get all returns for this sale
      const returns = await db.select().from(saleReturns).where(eq(saleReturns.saleId, sale.id));
      
      let refundAmountObj = 0;
      for (const r of returns) {
        refundAmountObj += parseFloat(r.refundAmount);
      }

      // Calculate how much was already deducted (if it was)
      // Actually, since the old logic DID NOT deduct from grandTotal, subtotal, or paidAmount, 
      // we can just deduct it now safely. Wait, let's check if it was already deducted.
      // If we run this twice, we might deduct twice.
      // We can verify by recalculating the subtotal from active items.
      
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
      const activeItems = items.filter(i => !i.isReturned);
      
      const newSubtotal = activeItems.reduce((acc, i) => acc + parseFloat(i.amount), 0);
      
      if (Math.abs(parseFloat(sale.subtotal) - newSubtotal) > 1) {
        // It hasn't been fixed yet! Let's fix it.
        const diff = parseFloat(sale.subtotal) - newSubtotal; // This should equal totalReturned
        
        const newGrandTotal = parseFloat(sale.grandTotal) - totalReturned;
        const newPaidAmount = parseFloat(sale.paidAmount) - refundAmountObj;
        const newDueAmount = Math.max(0, newGrandTotal - newPaidAmount);
        
        console.log(`  Updating: GrandTotal ${sale.grandTotal} -> ${newGrandTotal}, Paid ${sale.paidAmount} -> ${newPaidAmount}`);
        
        await db.update(sales)
          .set({
            subtotal: newSubtotal.toFixed(2),
            grandTotal: newGrandTotal.toFixed(2),
            paidAmount: newPaidAmount.toFixed(2),
            dueAmount: newDueAmount.toFixed(2),
          })
          .where(eq(sales.id, sale.id));
          
        console.log(`  Fixed ${sale.invoiceNumber}`);
      } else {
        console.log(`  Skipping ${sale.invoiceNumber} - already correct.`);
      }
    }
  }
  
  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
