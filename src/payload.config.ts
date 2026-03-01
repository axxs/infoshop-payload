// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Books } from './collections/Books'
import { Categories } from './collections/Categories'
import { Subjects } from './collections/Subjects'
import { Suppliers } from './collections/Suppliers'
import { Events } from './collections/Events'
import { EventAttendance } from './collections/EventAttendance'
import { Sales } from './collections/Sales'
import { SaleItems } from './collections/SaleItems'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { Theme } from './globals/Theme'
import { Layout } from './globals/Layout'
import { StoreSettings } from './globals/StoreSettings'
import { Inquiries } from './collections/Inquiries'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Infoshop',
    },
  },
  collections: [
    Users,
    Media,
    Books,
    Categories,
    Subjects,
    Suppliers,
    Events,
    EventAttendance,
    Sales,
    SaleItems,
    ContactSubmissions,
    Inquiries,
  ],
  globals: [Theme, Layout, StoreSettings],
  editor: lexicalEditor(),
  secret: (() => {
    const secret = process.env.PAYLOAD_SECRET
    if (!secret) {
      throw new Error(
        'PAYLOAD_SECRET environment variable is required. Generate one with: openssl rand -base64 32',
      )
    }
    return secret
  })(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: (() => {
    if (process.env.DATABASE_URI?.startsWith('postgres')) {
      return postgresAdapter({
        push: true,
        pool: { connectionString: process.env.DATABASE_URI },
      })
    }
    // Dynamic path prevents webpack from bundling sqlite's native libsql dependency
    // into the standalone build where it can't resolve. Only used in local dev.
    const pkg = '@payloadcms/db-' + 'sqlite'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sqliteAdapter } = require(pkg)
    return sqliteAdapter({ client: { url: process.env.DATABASE_URI || '' } })
  })(),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
