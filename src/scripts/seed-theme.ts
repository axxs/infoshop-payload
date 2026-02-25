/**
 * Seed script for Theme and Layout globals
 * Run with: pnpm seed:theme
 * Or: NODE_OPTIONS='--require dotenv/config' pnpm tsx src/scripts/seed-theme.ts
 */

// Load environment variables FIRST before importing config
import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'
dotenvConfig({ path: resolve(process.cwd(), '.env') })

// Now import Payload after env vars are loaded
import { getPayload } from 'payload'
import payloadConfig from '../payload.config'

async function seedTheme() {
  console.log('Starting theme seed...')

  // Debug: Check if env vars are loaded
  if (!process.env.PAYLOAD_SECRET) {
    console.error('PAYLOAD_SECRET not found in environment variables')
    console.log(
      'Available env vars:',
      Object.keys(process.env).filter((k) => k.includes('PAYLOAD')),
    )
    process.exit(1)
  }

  console.log('Environment variables loaded')

  const payload = await getPayload({ config: payloadConfig })

  try {
    // Seed Theme Global
    console.log('Seeding Theme Global...')
    await payload.updateGlobal({
      slug: 'theme',
      data: {
        activeTheme: 'organic-tech',
        colorMode: 'auto',
      },
    })
    console.log('Theme Global seeded successfully')

    // Seed Layout Global
    console.log('Seeding Layout Global...')
    await payload.updateGlobal({
      slug: 'layout',
      data: {
        // Header fields
        navigation: [
          {
            label: 'Shop',
            href: '/shop',
          },
          {
            label: 'Categories',
            href: '/shop/categories',
            children: [
              {
                label: 'Politics',
                href: '/shop/categories/politics',
              },
              {
                label: 'History',
                href: '/shop/categories/history',
              },
              {
                label: 'Philosophy',
                href: '/shop/categories/philosophy',
              },
            ],
          },
          {
            label: 'Events',
            href: '/events',
          },
          {
            label: 'About',
            href: '/about',
          },
        ],
        ctaButton: {
          label: 'Become a Member',
          href: '/membership',
        },
        // Footer fields
        columns: [
          {
            title: 'Quick Links',
            links: [
              { label: 'Shop', href: '/shop' },
              { label: 'Categories', href: '/shop/categories' },
              { label: 'Subjects', href: '/shop/subjects' },
              { label: 'Events', href: '/events' },
            ],
          },
          {
            title: 'About',
            links: [
              { label: 'About Us', href: '/about' },
              { label: 'Contact', href: '/contact' },
              { label: 'Membership', href: '/membership' },
              { label: 'FAQ', href: '/faq' },
            ],
          },
          {
            title: 'Community',
            links: [
              { label: 'Blog', href: '/blog' },
              { label: 'Events', href: '/events' },
              { label: 'Resources', href: '/resources' },
            ],
          },
        ],
        socialLinks: [
          {
            platform: 'facebook',
            url: 'https://facebook.com/infoshop',
          },
          {
            platform: 'twitter',
            url: 'https://twitter.com/infoshop',
          },
          {
            platform: 'instagram',
            url: 'https://instagram.com/infoshop',
          },
        ],
        copyright: '2025 Infoshop. All rights reserved.',
        // Homepage blocks
        blocks: [
          // Block 1: Hero Section
          {
            blockType: 'hero',
            variant: 'fullHeight',
            title: 'Welcome to Infoshop',
            subtitle:
              'Your community bookstore collective. Discover radical literature, independent publishing, and grassroots knowledge.',
            icon: 'book-open',
            alignment: 'center',
            ctaButtons: [
              {
                label: 'Browse All Books',
                href: '/shop',
                variant: 'default',
              },
              {
                label: 'Browse Categories',
                href: '/shop/categories',
                variant: 'outline',
              },
            ],
          },
          // Block 2: Book Showcase (New Arrivals)
          {
            blockType: 'bookShowcase',
            title: 'New Arrivals',
            description: 'Recently added to our collection',
            displayMode: 'newest',
            limit: 8,
            columns: '4',
            showViewAllLink: true,
            viewAllHref: '/shop',
          },
          // Block 3: Content Block (About)
          {
            blockType: 'content',
            layout: 'twoColumns',
            backgroundColor: 'muted',
            columns: [
              {
                richText: {
                  root: {
                    type: 'root',
                    children: [
                      {
                        type: 'heading',
                        tag: 'h2',
                        children: [
                          {
                            type: 'text',
                            text: 'About Infoshop',
                          },
                        ],
                      },
                      {
                        type: 'paragraph',
                        children: [
                          {
                            type: 'text',
                            text: 'Infoshop is a community-run bookstore collective dedicated to providing access to radical, independent, and grassroots literature. We believe in the power of knowledge as a tool for social change.',
                          },
                        ],
                      },
                    ],
                  },
                },
                align: 'left',
              },
              {
                richText: {
                  root: {
                    type: 'root',
                    children: [
                      {
                        type: 'heading',
                        tag: 'h2',
                        children: [
                          {
                            type: 'text',
                            text: 'Our Mission',
                          },
                        ],
                      },
                      {
                        type: 'paragraph',
                        children: [
                          {
                            type: 'text',
                            text: 'We support independent publishers, promote diverse voices, and create spaces for community engagement. Every purchase supports our mission of making knowledge accessible to all.',
                          },
                        ],
                      },
                    ],
                  },
                },
                align: 'left',
              },
            ],
          },
          // Block 4: Book Showcase (Featured)
          {
            blockType: 'bookShowcase',
            title: 'Featured Books',
            description: 'Staff picks and community favourites',
            displayMode: 'featured',
            limit: 8,
            columns: '4',
            showViewAllLink: true,
            viewAllHref: '/shop',
          },
          // Block 5: Call to Action
          {
            blockType: 'callToAction',
            icon: 'info',
            title: 'Join Our Community',
            description: {
              root: {
                type: 'root',
                children: [
                  {
                    type: 'paragraph',
                    children: [
                      {
                        type: 'text',
                        text: 'Become a member and get discounts on all books, access to exclusive events, and support independent publishing.',
                      },
                    ],
                  },
                ],
              },
            },
            backgroundColor: 'gradient',
            buttons: [
              {
                label: 'Learn More',
                href: '/membership',
                variant: 'default',
                size: 'lg',
              },
            ],
          },
          // Block 6: Archive (Upcoming Events)
          {
            blockType: 'archive',
            title: 'Upcoming Events',
            collection: 'events',
            dateRange: {
              start: new Date().toISOString(),
              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            },
            layout: 'grid',
            enableSearch: false,
            enableFilters: false,
            itemsPerPage: 6,
          },
        ],
      },
    })
    console.log('Layout Global seeded successfully')

    console.log('\nTheme seed completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Start the dev server: pnpm dev')
    console.log('2. Visit http://localhost:3000 to see the themed homepage')
    console.log('3. Visit http://localhost:3000/admin/globals/theme to customise themes')
    console.log('4. Visit http://localhost:3000/admin/globals/layout to customise blocks')
    console.log('\nTry switching between themes:')
    console.log('   - Go to Admin > Globals > Theme')
    console.log('   - Change "Active Theme" to switch between available themes')
    console.log('   - Change "Color Mode" to test light/dark modes')
  } catch (error) {
    console.error('Error seeding theme:', error)
    process.exit(1)
  }

  process.exit(0)
}

// Run the seed function
seedTheme()
