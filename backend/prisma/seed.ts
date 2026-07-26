import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Define Permission Groups & Actions
  const permissionGroupsData = [
    {
      name: 'dashboard',
      description: 'Dashboard overview access',
      actions: ['watch'],
    },
    {
      name: 'permission',
      description: 'System permission management',
      actions: ['watch', 'create', 'read', 'update', 'delete'],
    },
    {
      name: 'role',
      description: 'Role and capability management',
      actions: ['watch', 'create', 'read', 'update', 'delete'],
    },
    {
      name: 'user',
      description: 'User account management',
      actions: ['watch', 'create', 'read', 'update', 'delete'],
    },
    {
      name: 'media',
      description: 'Shared media library assets',
      actions: ['watch', 'read', 'upload', 'write', 'delete'],
    },
    {
      name: 'category',
      description: 'Product category hierarchy',
      actions: ['watch', 'create', 'read', 'update', 'delete'],
    },
    {
      name: 'brand',
      description: 'Product manufacturer brands',
      actions: ['watch', 'create', 'read', 'update', 'delete'],
    },
    {
      name: 'attribute',
      description: 'Product variation attributes and values',
      actions: ['watch', 'create', 'read', 'update', 'delete'],
    },
    {
      name: 'product',
      description: 'Product catalog, simple items, and variants',
      actions: ['watch', 'create', 'read', 'update', 'delete'],
    },
  ];

  const allCreatedPermissions: any[] = [];

  for (const groupDef of permissionGroupsData) {
    const group = await prisma.permissionGroup.upsert({
      where: { name: groupDef.name },
      update: { description: groupDef.description },
      create: {
        name: groupDef.name,
        description: groupDef.description,
      },
    });

    for (const action of groupDef.actions) {
      const permName = `${groupDef.name}:${action}`;
      const perm = await prisma.permission.upsert({
        where: { name: permName },
        update: { groupId: group.id },
        create: {
          name: permName,
          description: `${action} permission for ${groupDef.name}`,
          groupId: group.id,
        },
      });
      allCreatedPermissions.push(perm);
    }
  }

  console.log(`✅ Created/verified ${allCreatedPermissions.length} permissions across 9 modules.`);

  // 2. Create Super Administrator Role (Holds ALL permissions)
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Administrator' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Super Administrator',
      description: 'Full system access with all administrative and catalog permissions',
      status: 'ACTIVE',
    },
  });

  // Assign all permissions to Super Admin role
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: allCreatedPermissions.map((p) => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    })),
  });

  // 3. Create Limited Catalog Manager Role (No user, role, or permission access)
  const catalogPermissions = allCreatedPermissions.filter(
    (p) =>
      p.name.startsWith('category:') ||
      p.name.startsWith('brand:') ||
      p.name.startsWith('attribute:') ||
      p.name.startsWith('product:') ||
      p.name.startsWith('media:') ||
      p.name === 'dashboard:watch',
  );

  const catalogRole = await prisma.role.upsert({
    where: { name: 'Catalog Manager' },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Catalog Manager',
      description: 'Limited catalog access only (categories, brands, attributes, products, media). Lacks user/role/permission access.',
      status: 'ACTIVE',
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: catalogRole.id } });
  await prisma.rolePermission.createMany({
    data: catalogPermissions.map((p) => ({
      roleId: catalogRole.id,
      permissionId: p.id,
    })),
  });

  console.log('✅ Created roles: Super Administrator & Catalog Manager');

  // 4. Create Users
  const hashedPassword = await bcrypt.hash('Admin@123456', 10);
  const catalogHashedPassword = await bcrypt.hash('Catalog@123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@trendsbird.com' },
    update: {
      password: hashedPassword,
      roleId: superAdminRole.id,
      isActive: true,
    },
    create: {
      name: 'Super Admin User',
      email: 'admin@trendsbird.com',
      password: hashedPassword,
      phone: '+8801700000000',
      gender: 'male',
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'catalog@trendsbird.com' },
    update: {
      password: catalogHashedPassword,
      roleId: catalogRole.id,
      isActive: true,
    },
    create: {
      name: 'Limited Catalog User',
      email: 'catalog@trendsbird.com',
      password: catalogHashedPassword,
      phone: '+8801800000000',
      gender: 'female',
      roleId: catalogRole.id,
      isActive: true,
    },
  });

  console.log('✅ Seeded Accounts:');
  console.log('   - Super Admin: admin@trendsbird.com / Admin@123456');
  console.log('   - Catalog User (403 Test): catalog@trendsbird.com / Catalog@123456');

  // 5. Seed Sample Categories, Brands, Attributes & Products
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets, phones, laptops and electronics',
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'phones' },
    update: {},
    create: {
      name: 'Phones',
      slug: 'phones',
      description: 'Smartphones and accessories',
      parentId: electronics.id,
      isActive: true,
      sortOrder: 2,
    },
  });

  const apparel = await prisma.category.upsert({
    where: { slug: 'apparel' },
    update: {},
    create: {
      name: 'Apparel & Fashion',
      slug: 'apparel',
      description: 'Clothing, shirts, jeans and activewear',
      isActive: true,
      sortOrder: 3,
    },
  });

  const appleBrand = await prisma.brand.upsert({
    where: { slug: 'apple' },
    update: {},
    create: {
      name: 'Apple',
      slug: 'apple',
      description: 'Think Different - Apple Products',
      status: 'ACTIVE',
    },
  });

  const nikeBrand = await prisma.brand.upsert({
    where: { slug: 'nike' },
    update: {},
    create: {
      name: 'Nike',
      slug: 'nike',
      description: 'Just Do It - Athletic footwear and apparel',
      status: 'ACTIVE',
    },
  });

  // Attributes
  const colorAttr = await prisma.attribute.upsert({
    where: { slug: 'color' },
    update: {},
    create: {
      name: 'Colour',
      slug: 'color',
      type: 'COLOUR_SWATCH',
      values: {
        create: [
          { value: 'Red', slug: 'red', referenceValue: '#FF0000' },
          { value: 'Blue', slug: 'blue', referenceValue: '#0000FF' },
          { value: 'Black', slug: 'black', referenceValue: '#000000' },
        ],
      },
    },
    include: { values: true },
  });

  const sizeAttr = await prisma.attribute.upsert({
    where: { slug: 'size' },
    update: {},
    create: {
      name: 'Size',
      slug: 'size',
      type: 'RADIO',
      values: {
        create: [
          { value: 'Medium', slug: 'medium' },
          { value: 'Large', slug: 'large' },
        ],
      },
    },
    include: { values: true },
  });

  // Seed Simple Product
  await prisma.product.upsert({
    where: { sku: 'MOUSE-W-100' },
    update: {},
    create: {
      name: 'Wireless Ergonomic Mouse',
      slug: 'wireless-ergonomic-mouse',
      sku: 'MOUSE-W-100',
      shortDescription: 'High precision 2.4GHz ergonomic wireless mouse',
      longDescription: 'Full contoured design with adjustable DPI switch and silent buttons.',
      hasVariants: false,
      price: 49.99,
      salePrice: 39.99,
      stock: 150,
      stockStatus: 'IN_STOCK',
      weight: 0.2,
      isActive: true,
      isFeatured: true,
      brandId: appleBrand.id,
      categories: {
        create: [{ categoryId: electronics.id }],
      },
    },
  });

  // Seed Variable Product
  const existingVariable = await prisma.product.findUnique({ where: { sku: 'SHIRT-PREM-V' } });
  if (!existingVariable) {
    const redVal = colorAttr.values.find((v) => v.value === 'Red')!;
    const blueVal = colorAttr.values.find((v) => v.value === 'Blue')!;
    const mVal = sizeAttr.values.find((v) => v.value === 'Medium')!;
    const lVal = sizeAttr.values.find((v) => v.value === 'Large')!;

    await prisma.product.create({
      data: {
        name: 'Trends Premium T-Shirt',
        slug: 'trends-premium-tshirt',
        sku: 'SHIRT-PREM-V',
        shortDescription: '100% Organic Cotton Premium T-Shirt',
        longDescription: 'Soft touch breathable cotton with reinforced stitching and vibrant colors.',
        hasVariants: true,
        weight: 0.3,
        isActive: true,
        isFeatured: true,
        brandId: nikeBrand.id,
        categories: {
          create: [{ categoryId: apparel.id }],
        },
        variants: {
          create: [
            {
              sku: 'SHIRT-RED-M',
              price: 29.99,
              salePrice: 24.99,
              stock: 50,
              stockStatus: 'IN_STOCK',
              attributeValues: {
                create: [{ attributeValueId: redVal.id }, { attributeValueId: mVal.id }],
              },
            },
            {
              sku: 'SHIRT-RED-L',
              price: 29.99,
              stock: 30,
              stockStatus: 'IN_STOCK',
              attributeValues: {
                create: [{ attributeValueId: redVal.id }, { attributeValueId: lVal.id }],
              },
            },
            {
              sku: 'SHIRT-BLUE-M',
              price: 29.99,
              stock: 45,
              stockStatus: 'IN_STOCK',
              attributeValues: {
                create: [{ attributeValueId: blueVal.id }, { attributeValueId: mVal.id }],
              },
            },
          ],
        },
      },
    });
  }

  console.log('✅ Seeded sample Categories, Brands, Attributes, Simple & Variable Products!');
  console.log('🌱 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
