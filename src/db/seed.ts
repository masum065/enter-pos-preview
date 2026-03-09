import { db } from './index';
import { users, settings, products, customers, suppliers, stockItems, supplierTransactions } from './schema';
import * as bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create default users
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const employeePassword = await bcrypt.hash('employee123', 10);
    
    await db.insert(users).values([
      {
        userId: 'admin',
        name: 'System Administrator',
        email: 'admin@entercomputer.com',
        passwordHash: adminPassword,
        role: 'admin',
        isActive: true,
      },
      {
        userId: 'manager',
        name: 'Manager User',
        email: 'manager@entercomputer.com',
        passwordHash: managerPassword,
        role: 'manager',
        isActive: true,
      },
      {
        userId: 'employee',
        name: 'Employee User',
        email: 'employee@entercomputer.com',
        passwordHash: employeePassword,
        role: 'employee',
        isActive: true,
      },
    ]).onConflictDoNothing();

    console.log('✅ Default users created:');
    console.log('   - Admin (userId: admin, password: admin123)');
    console.log('   - Manager (userId: manager, password: manager123)');
    console.log('   - Employee (userId: employee, password: employee123)');

    // Insert default settings
    await db.insert(settings).values([
      {
        key: 'shop_info',
        value: { name: 'Enter Computer', address: '', phone: '', email: '' },
        description: 'Shop information',
      },
      {
        key: 'tax_settings',
        value: { default_tax_percent: 0, tax_enabled: false },
        description: 'Tax configuration',
      },
      {
        key: 'invoice_prefixes',
        value: { sales: 'INV', purchases: 'PURCH', services: 'SRV', expenses: 'EXP' },
        description: 'Invoice number prefixes',
      },
      {
        key: 'low_stock_threshold',
        value: { threshold: 3 },
        description: 'Low stock alert threshold',
      },
      {
        key: 'shop_info_v2',
        value: {
          shopName: 'Enter Computers',
          tagline: 'বেস্ট কোয়ালিটির প্রজেক্ট ইউজড ল্যাপটপ & মোবাইল এর বিশ্বস্ত প্রতিষ্ঠান',
          address: 'অলকা নদী বাংলা কমপ্লেক্স ২য় তলা দোকান নং ২৩৮\nরাম বাবু রোড, গাংগিনারপার, সদর, ময়মনসিংহ।',
          phone1: '01789-443043',
          phone2: '01684-134574',
          email: 'info@entercomputers.com.bd',
          website: 'www.entercomputers.com.bd',
          facebook: 'fb.com/entercomputersmym',
          logo: '/enter-logo.png',
          signature: '',
          termsAndConditions: [
            { label: 'ল্যাপটপ ওয়ারেন্টি', text: '১০ দিনের রিপ্লেসমেন্ট গ্যারান্টি (শুধুমাত্র হার্ডওয়্যার সমস্যার জন্য)। ২ বছরের ফ্রি সার্ভিস ওয়ারেন্টি। প্রয়োজনীয় পার্টস বা খুচরা যন্ত্রাংশের মূল্য গ্রাহককে বহন করতে হবে।' },
            { label: 'মোবাইল ওয়ারেন্টি', text: '৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি। ১ বছরের ফ্রি সার্ভিস ওয়ারেন্টি। মোবাইলের Display এবং Motherboard কোনো ওয়ারেন্টির অন্তর্ভুক্ত নয়।' },
            { label: 'রিপ্লেসমেন্ট নীতি', text: 'রিপ্লেসমেন্টের ক্ষেত্রে একই মডেলের ডিভাইস প্রদান করা হবে। স্টক না থাকলে আলোচনা সাপেক্ষে অন্য মডেল নির্বাচন করা যাবে।' },
            { label: 'এক্সচেঞ্জ ও রিটার্ন', text: 'ক্রয়ের ২ মাসের মধ্যে Exchange করলে নূন্যতম ২০% মূল্য কর্তন হবে। ক্রয়ের ২ মাসের মধ্যে Return করলে নূন্যতম ৩০% মূল্য কর্তন হবে। ডিভাইসের কন্ডিশন যাচাই করে চূড়ান্ত মূল্য নির্ধারণ করা হবে।' },
            { label: 'ওয়ারেন্টি বাতিল', text: 'ডিভাইসে Physical Damage / Scratch থাকে। পানি বা Liquid Damage হয়। শর্ট সার্কিট বা ভোল্টেজের সমস্যায় ক্ষতি হয়। ওয়ারেন্টি সিল বা স্টিকার নষ্ট করা হয়। অন্য কোনো টেকনিশিয়ান দ্বারা ডিভাইস খোলা হয়।' },
          ],
          termsFooter: 'গুরুত্বপূর্ণ: ওয়ারেন্টি সুবিধা পেতে অরিজিনাল ক্যাশ মেমো/বিল অবশ্যই সংরক্ষণ করতে হবে।',
        },
        description: 'Shop information for invoices (v2)',
      },
    ]).onConflictDoNothing();

    console.log('✅ Default settings created');

    // =============================================
    // PRODUCTS (Computer/Phone shop items)
    // =============================================
    const productData = [
      { modelName: 'iPhone 15 Pro Max', brand: 'Apple', category: 'Phone', defaultSalePrice: '189000', warranty: '1 Year', description: '256GB, Natural Titanium' },
      { modelName: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', category: 'Phone', defaultSalePrice: '159000', warranty: '1 Year', description: '256GB, Titanium Gray' },
      { modelName: 'HP Pavilion 15', brand: 'HP', category: 'Laptop', defaultSalePrice: '72000', warranty: '2 Years', description: 'i5-13th Gen, 8GB RAM, 512GB SSD' },
      { modelName: 'Lenovo IdeaPad 3', brand: 'Lenovo', category: 'Laptop', defaultSalePrice: '55000', warranty: '2 Years', description: 'Ryzen 5, 8GB RAM, 256GB SSD' },
      { modelName: 'Dell Inspiron 14', brand: 'Dell', category: 'Laptop', defaultSalePrice: '68000', warranty: '2 Years', description: 'i5-12th Gen, 16GB RAM, 512GB SSD' },
      { modelName: 'Xiaomi Redmi Note 13 Pro', brand: 'Xiaomi', category: 'Phone', defaultSalePrice: '32000', warranty: '1 Year', description: '8/256GB, Forest Green' },
      { modelName: 'AirPods Pro 2', brand: 'Apple', category: 'Accessories', defaultSalePrice: '35000', warranty: '1 Year', description: 'USB-C, Active Noise Cancellation' },
      { modelName: 'Logitech MX Master 3S', brand: 'Logitech', category: 'Accessories', defaultSalePrice: '12500', warranty: '1 Year', description: 'Wireless Mouse, Graphite' },
    ];

    const insertedProducts = await db.insert(products).values(productData).onConflictDoNothing().returning();
    console.log(`✅ ${insertedProducts.length} products created`);

    // =============================================
    // CUSTOMERS
    // =============================================
    const customerData = [
      { name: 'রহিম উদ্দিন', phone: '01711111111', address: 'মিরপুর, ঢাকা', nid: '1990123456789' },
      { name: 'করিম হোসেন', phone: '01822222222', address: 'ধানমন্ডি, ঢাকা', nid: '1985987654321' },
      { name: 'সালমা বেগম', phone: '01933333333', address: 'উত্তরা, ঢাকা' },
      { name: 'আব্দুল কাদের', phone: '01644444444', address: 'চট্টগ্রাম' },
      { name: 'ফারহানা আক্তার', phone: '01555555555', address: 'সিলেট', nid: '1995111222333' },
    ];

    const insertedCustomers = await db.insert(customers).values(customerData).onConflictDoNothing().returning();
    console.log(`✅ ${insertedCustomers.length} customers created`);

    // =============================================
    // SUPPLIERS
    // =============================================
    const supplierData = [
      { companyName: 'Tech Galaxy BD', phone: '01700100200', address: 'IDB Bhaban, Agargaon', contactPerson: 'Jahangir Alam', balance: '25000', totalPurchases: '500000', totalPaid: '475000' },
      { companyName: 'Mobile World Ltd', phone: '01800200300', address: 'Elephant Road, Dhaka', contactPerson: 'Rafiq Islam', balance: '0', totalPurchases: '300000', totalPaid: '300000' },
      { companyName: 'Computer Source BD', phone: '01900300400', address: 'Multiplan Center, Dhaka', contactPerson: 'Kamal Ahmed', balance: '15000', totalPurchases: '200000', totalPaid: '185000' },
    ];

    const insertedSuppliers = await db.insert(suppliers).values(supplierData).onConflictDoNothing().returning();
    console.log(`✅ ${insertedSuppliers.length} suppliers created`);

    // =============================================
    // STOCK ITEMS
    // =============================================
    if (insertedProducts.length > 0 && insertedSuppliers.length > 0) {
      const adminUser = await db.select().from(users).limit(1);
      const adminId = adminUser[0]?.id;

      const stockData = [
        // iPhones from Tech Galaxy
        { serialNumber: 'APL-IP15PM-001', imei: '351234567890001', productId: insertedProducts[0].id, purchasePrice: '175000', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[0].id, supplierName: 'Tech Galaxy BD', purchaseDate: new Date('2026-01-15'), status: 'available', createdBy: adminId },
        { serialNumber: 'APL-IP15PM-002', imei: '351234567890002', productId: insertedProducts[0].id, purchasePrice: '175000', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[0].id, supplierName: 'Tech Galaxy BD', purchaseDate: new Date('2026-01-15'), status: 'available', createdBy: adminId },
        // Samsung from Mobile World
        { serialNumber: 'SAM-S24U-001', imei: '351234567890003', productId: insertedProducts[1].id, purchasePrice: '145000', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[1].id, supplierName: 'Mobile World Ltd', purchaseDate: new Date('2026-01-20'), status: 'available', createdBy: adminId },
        { serialNumber: 'SAM-S24U-002', imei: '351234567890004', productId: insertedProducts[1].id, purchasePrice: '145000', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[1].id, supplierName: 'Mobile World Ltd', purchaseDate: new Date('2026-02-01'), status: 'available', createdBy: adminId },
        // HP Laptop from Computer Source
        { serialNumber: 'HP-PAV15-001', productId: insertedProducts[2].id, purchasePrice: '62000', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[2].id, supplierName: 'Computer Source BD', purchaseDate: new Date('2026-02-05'), status: 'available', createdBy: adminId },
        // Lenovo
        { serialNumber: 'LEN-IP3-001', productId: insertedProducts[3].id, purchasePrice: '45000', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[2].id, supplierName: 'Computer Source BD', purchaseDate: new Date('2026-02-10'), status: 'available', createdBy: adminId },
        // Dell
        { serialNumber: 'DEL-INS14-001', productId: insertedProducts[4].id, purchasePrice: '58000', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[2].id, supplierName: 'Computer Source BD', purchaseDate: new Date('2026-02-10'), status: 'available', createdBy: adminId },
        // Xiaomi from local purchase
        { serialNumber: 'XIA-RN13P-001', imei: '351234567890005', productId: insertedProducts[5].id, purchasePrice: '26000', purchaseSource: 'local' as const, sellerId: insertedCustomers[0].id, purchaseDate: new Date('2026-02-12'), status: 'available', createdBy: adminId },
        // AirPods
        { serialNumber: 'APL-APP2-001', productId: insertedProducts[6].id, purchasePrice: '29000', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[0].id, supplierName: 'Tech Galaxy BD', purchaseDate: new Date('2026-02-15'), status: 'available', createdBy: adminId },
        // Mouse
        { serialNumber: 'LOG-MXM3S-001', productId: insertedProducts[7].id, purchasePrice: '9500', purchaseSource: 'supplier' as const, supplierId: insertedSuppliers[0].id, supplierName: 'Tech Galaxy BD', purchaseDate: new Date('2026-02-15'), status: 'available', createdBy: adminId },
      ];

      const insertedStock = await db.insert(stockItems).values(stockData).onConflictDoNothing().returning();
      console.log(`✅ ${insertedStock.length} stock items created`);
    }

    console.log('🎉 Seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
