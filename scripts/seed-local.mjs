import { existsSync, readFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const envPath = new URL("../.env.local", import.meta.url);

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    process.env[key] ??= valueParts.join("=");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl =
  process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required. Run `supabase status -o env --workdir /Users/keki/dev/dss-db` and copy the service role key into .env.local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const users = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    email: "admin@dss.local",
    password: "dss-admin-1234",
    displayName: "김민정",
    role: "A",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    email: "production@dss.local",
    password: "dss-production-1234",
    displayName: "박현우",
    role: "P",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    email: "executive@dss.local",
    password: "dss-executive-1234",
    displayName: "이서연",
    role: "E",
  },
];

const customers = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    name: "동성전자",
    business_registration_no: "101-81-00001",
    identifier: "DS-ELEC",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    name: "한빛산업",
    business_registration_no: "101-81-00002",
    identifier: "HB-IND",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    name: "세림테크",
    business_registration_no: "101-81-00003",
    identifier: "SR-TECH",
  },
];

const contacts = [
  {
    id: "21000000-0000-4000-8000-000000000001",
    customer_id: customers[0].id,
    name: "김영수",
    phone: "010-1000-1001",
    email: "youngsoo@example.com",
    position: "구매팀장",
  },
  {
    id: "21000000-0000-4000-8000-000000000002",
    customer_id: customers[1].id,
    name: "박지현",
    phone: "010-1000-1002",
    email: "jihyun@example.com",
    position: "생산관리",
  },
  {
    id: "21000000-0000-4000-8000-000000000003",
    customer_id: customers[2].id,
    name: "이준호",
    phone: "010-1000-1003",
    email: "junho@example.com",
    position: "구매담당",
  },
];

const designs = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    design_no: "DS-1042",
    product_name: "실리콘 패킹 R",
    specification: "R-100 / 5T",
    department_code: "R",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    design_no: "DS-2050",
    product_name: "실리콘 튜브 S",
    specification: "S-20 / 투명",
    department_code: "S",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    design_no: "DS-3301",
    product_name: "실리콘 몰드 P",
    specification: "P-300 / 흑색",
    department_code: "P",
  },
];

const orders = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    order_no: "260610-0001",
    status: "active",
    requested_date: "2026-06-10",
    channel: "카톡",
    customer_id: customers[0].id,
    contact_id: contacts[0].id,
    design_id: designs[0].id,
    quantity: 500,
    delivery_type: "single",
    received_by: users[0].id,
    released_at: null,
    released_by: null,
    cancelled_at: null,
    cancelled_by: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    order_no: "260610-0002",
    status: "active",
    requested_date: "2026-06-10",
    channel: "이메일",
    customer_id: customers[1].id,
    contact_id: contacts[1].id,
    design_id: designs[1].id,
    quantity: 500,
    delivery_type: "split",
    received_by: users[0].id,
    released_at: null,
    released_by: null,
    cancelled_at: null,
    cancelled_by: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    order_no: "260609-0008",
    status: "released",
    requested_date: "2026-06-09",
    channel: "전화",
    customer_id: customers[2].id,
    contact_id: contacts[2].id,
    design_id: designs[2].id,
    quantity: 120,
    delivery_type: "single",
    received_by: users[0].id,
    released_at: "2026-06-10T02:30:00.000Z",
    released_by: users[0].id,
    cancelled_at: null,
    cancelled_by: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    order_no: "260608-0004",
    status: "cancelled",
    requested_date: "2026-06-08",
    channel: "기타: 팩스",
    customer_id: customers[0].id,
    contact_id: contacts[0].id,
    design_id: designs[2].id,
    quantity: 80,
    delivery_type: "single",
    received_by: users[0].id,
    released_at: null,
    released_by: null,
    cancelled_at: "2026-06-10T03:00:00.000Z",
    cancelled_by: users[0].id,
  },
];

const schedules = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    order_id: orders[0].id,
    scheduled_date: "2026-06-18",
    quantity: 500,
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    order_id: orders[1].id,
    scheduled_date: "2026-06-18",
    quantity: 300,
  },
  {
    id: "50000000-0000-4000-8000-000000000003",
    order_id: orders[1].id,
    scheduled_date: "2026-06-25",
    quantity: 200,
  },
  {
    id: "50000000-0000-4000-8000-000000000004",
    order_id: orders[2].id,
    scheduled_date: "2026-06-21",
    quantity: 120,
  },
  {
    id: "50000000-0000-4000-8000-000000000005",
    order_id: orders[3].id,
    scheduled_date: "2026-06-22",
    quantity: 80,
  },
];

async function assertNoError(label, result) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function upsertUser(user) {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  const existing = listData.users.find((candidate) => candidate.email === user.email);

  if (existing) {
    await assertNoError(
      `update user ${user.email}`,
      await supabase.auth.admin.updateUserById(existing.id, {
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { display_name: user.displayName },
      }),
    );

    return existing.id;
  }

  const data = await assertNoError(
    `create user ${user.email}`,
    await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: user.displayName },
    }),
  );

  return data.user.id;
}

for (const user of users) {
  const id = await upsertUser(user);
  user.id = id;
}

await assertNoError(
  "auth users ready",
  { error: null, data: users },
);

const { Client } = pg;
const db = new Client({ connectionString: databaseUrl });

await db.connect();

try {
  await db.query("begin");

  for (const user of users) {
    await db.query(
      `
        insert into public.profiles (id, email, display_name, role, is_active)
        values ($1, $2, $3, $4, true)
        on conflict (id)
        do update set
          email = excluded.email,
          display_name = excluded.display_name,
          role = excluded.role,
          is_active = true
      `,
      [user.id, user.email, user.displayName, user.role],
    );
  }

  for (const customer of customers) {
    await db.query(
      `
        insert into public.customers (id, name, business_registration_no, identifier)
        values ($1, $2, $3, $4)
        on conflict (id)
        do update set
          name = excluded.name,
          business_registration_no = excluded.business_registration_no,
          identifier = excluded.identifier,
          is_active = true,
          deleted_at = null
      `,
      [customer.id, customer.name, customer.business_registration_no, customer.identifier],
    );
  }

  for (const contact of contacts) {
    await db.query(
      `
        insert into public.customer_contacts
          (id, customer_id, name, phone, email, position)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (id)
        do update set
          customer_id = excluded.customer_id,
          name = excluded.name,
          phone = excluded.phone,
          email = excluded.email,
          position = excluded.position,
          is_active = true,
          deleted_at = null
      `,
      [contact.id, contact.customer_id, contact.name, contact.phone, contact.email, contact.position],
    );
  }

  for (const design of designs) {
    await db.query(
      `
        insert into public.designs
          (id, design_no, product_name, specification, department_code)
        values ($1, $2, $3, $4, $5)
        on conflict (id)
        do update set
          design_no = excluded.design_no,
          product_name = excluded.product_name,
          specification = excluded.specification,
          department_code = excluded.department_code,
          is_active = true,
          deleted_at = null
      `,
      [
        design.id,
        design.design_no,
        design.product_name,
        design.specification,
        design.department_code,
      ],
    );
  }

  await db.query("delete from public.order_status_events where order_id = any($1::uuid[])", [
    orders.map((order) => order.id),
  ]);
  await db.query("delete from public.delivery_schedules where order_id = any($1::uuid[])", [
    orders.map((order) => order.id),
  ]);

  for (const order of orders) {
    await db.query(
      `
        insert into public.orders
          (
            id, order_no, status, requested_date, channel,
            customer_id, contact_id, design_id, quantity, delivery_type,
            received_by, released_at, released_by, cancelled_at, cancelled_by
          )
        values
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        on conflict (id)
        do update set
          order_no = excluded.order_no,
          status = excluded.status,
          requested_date = excluded.requested_date,
          channel = excluded.channel,
          customer_id = excluded.customer_id,
          contact_id = excluded.contact_id,
          design_id = excluded.design_id,
          quantity = excluded.quantity,
          delivery_type = excluded.delivery_type,
          received_by = excluded.received_by,
          released_at = excluded.released_at,
          released_by = excluded.released_by,
          cancelled_at = excluded.cancelled_at,
          cancelled_by = excluded.cancelled_by
      `,
      [
        order.id,
        order.order_no,
        order.status,
        order.requested_date,
        order.channel,
        order.customer_id,
        order.contact_id,
        order.design_id,
        order.quantity,
        order.delivery_type,
        order.received_by,
        order.released_at,
        order.released_by,
        order.cancelled_at,
        order.cancelled_by,
      ],
    );
  }

  for (const schedule of schedules) {
    await db.query(
      `
        insert into public.delivery_schedules
          (id, order_id, scheduled_date, quantity)
        values ($1, $2, $3, $4)
        on conflict (id)
        do update set
          order_id = excluded.order_id,
          scheduled_date = excluded.scheduled_date,
          quantity = excluded.quantity,
          shipped_quantity = 0,
          status = 'ready',
          last_shipped_date = null,
          note = null
      `,
      [schedule.id, schedule.order_id, schedule.scheduled_date, schedule.quantity],
    );
  }

  for (const order of orders) {
    await db.query(
      `
        insert into public.order_status_events
          (order_id, from_status, to_status, changed_by, note)
        values ($1, null, $2, $3, 'local development seed')
      `,
      [order.id, order.status, users[0].id],
    );
  }

  await db.query("commit");
} catch (error) {
  await db.query("rollback");
  throw error;
} finally {
  await db.end();
}

console.log(
  JSON.stringify(
    {
      users: users.length,
      customers: customers.length,
      contacts: contacts.length,
      designs: designs.length,
      orders: orders.length,
      schedules: schedules.length,
    },
    null,
    2,
  ),
);
