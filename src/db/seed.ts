import { db } from './index';
import { users, settings } from './schema';
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
    ]).onConflictDoNothing();

    console.log('✅ Default settings created');
    console.log('🎉 Seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
