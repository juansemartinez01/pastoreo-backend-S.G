import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  const usersService = app.get(UsersService);
  const config = app.get(ConfigService);

  const adminEmail = config.get<string>('SEED_ADMIN_EMAIL');
  const adminPassword = config.get<string>('SEED_ADMIN_PASSWORD');

  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  }

 const seedTenantId = must(
   config.get<string>('SEED_TENANT_ID'),
   'SEED_TENANT_ID',
 );

 const existing = await usersService.findByEmail(adminEmail, seedTenantId);

  if (existing) {
    console.log('✅ Admin user already exists, skipping seed');
    await app.close();
    return;
  }

  const password_hash = await bcrypt.hash(adminPassword, 10);

  function must<T>(value: T | undefined, name: string): T {
    if (value === undefined || value === null) {
      throw new Error(`${name} is required`);
    }
    return value;
  }

  

  const admin = await usersService.createUser({
    tenant_id: seedTenantId,
    email: adminEmail,
    password_hash,
    roleNames: ['admin'],
  });

  console.log('✅ Admin user created');
  console.log({
    id: admin.id,
    email: admin.email,
    roles: admin.roles.map((r) => r.name),
  });

  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Seed failed', err);
  process.exit(1);
});
