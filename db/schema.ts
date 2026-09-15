import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  created: text('created').notNull(),
});
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  preferences: text('preferences').notNull(),
  activeWorkspace: text('active_workspace').notNull(),
});
export const members = sqliteTable(
  'members',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    userId: text('user_id').notNull(),
    role: text('role').notNull(),
    joined: text('joined').notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] })],
);
export const loads = sqliteTable(
  'loads',
  {
    id: text('id').notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    data: text('data').notNull(),
    version: integer('version').notNull().default(1),
    updated: text('updated').notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.id] })],
);
export const fuel = sqliteTable(
  'fuel',
  {
    id: text('id').notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    data: text('data').notNull(),
    updated: text('updated').notNull(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.id] })],
);
export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  data: text('data').notNull(),
  createdBy: text('created_by').notNull(),
  created: text('created').notNull(),
});
export const invites = sqliteTable('invites', {
  hash: text('hash').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  role: text('role').notNull(),
  expires: text('expires').notNull(),
  usedBy: text('used_by'),
  createdBy: text('created_by').notNull(),
});
