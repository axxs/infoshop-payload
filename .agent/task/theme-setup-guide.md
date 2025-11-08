# Theme System Setup Guide

**Quick Start Guide for Infoshop Theme System**
**Last Updated**: 2025-01-08

## Table of Contents

1. [First-Time Setup](#first-time-setup)
2. [Default Theme Configuration](#default-theme-configuration)
3. [Radical Theme Configuration](#radical-theme-configuration)
4. [Creating Homepage Blocks](#creating-homepage-blocks)
5. [Header & Footer Setup](#header--footer-setup)
6. [Troubleshooting](#troubleshooting)

---

## First-Time Setup

### Quick Start: Automated Seed Script (Recommended)

The fastest way to set up the theme system is to use the automated seed script:

```bash
cd /home/axxs/infoshop-payload
pnpm seed:theme
```

This will automatically populate:

- Theme Global with default and radical theme configurations
- Layout Global with header, footer, and 6 example homepage blocks

After running the seed script, you can:

1. Start the dev server: `pnpm dev`
2. Visit `http://localhost:3000` to see the themed homepage
3. Visit `http://localhost:3000/admin` to customise themes and blocks

**If you prefer to configure manually**, follow the steps below.

---

### Manual Setup

#### Step 1: Start the Development Server

```bash
cd /home/axxs/infoshop-payload
pnpm dev
```

Wait for the server to start. You should see:

```
✓ Ready on http://localhost:3000
```

#### Step 2: Access Payload Admin

1. Open your browser to `http://localhost:3000/admin`
2. Log in with your admin credentials
3. You should see the Payload dashboard

#### Step 3: Configure Theme Global

1. In the sidebar, navigate to **Globals** → **Theme**
2. You'll see three tabs: **Active Theme**, **Default Theme**, **Radical Theme**
3. Start with the **Active Theme** tab

---

## Default Theme Configuration

### Active Theme Settings

**Active Theme Tab:**

```
Active Theme: Default (Blue)
Color Mode: Auto (respects system preference)
```

### Default Theme - Light Mode

**Default Theme Tab → Light Sub-tab:**

Copy these exact values into the corresponding fields:

```
Primary: 221 83% 53%
Background: 0 0% 100%
Foreground: 222 84% 5%
Card: 0 0% 100%
Card Foreground: 222 84% 5%
Popover: 0 0% 100%
Popover Foreground: 222 84% 5%
Secondary: 210 40% 96%
Secondary Foreground: 222 47% 11%
Muted: 210 40% 96%
Muted Foreground: 215 16% 47%
Accent: 210 40% 96%
Accent Foreground: 222 47% 11%
Destructive: 0 84% 60%
Destructive Foreground: 210 40% 98%
Border: 214 32% 91%
Input: 214 32% 91%
Ring: 221 83% 53%
```

**Typography:**

```
Font Family: system-ui, -apple-system, sans-serif
Heading Font Family: system-ui, -apple-system, sans-serif
Radius: 0.5rem
```

### Default Theme - Dark Mode

**Default Theme Tab → Dark Sub-tab:**

```
Primary: 217 91% 60%
Background: 222 84% 5%
Foreground: 210 40% 98%
Card: 222 84% 5%
Card Foreground: 210 40% 98%
Popover: 222 84% 5%
Popover Foreground: 210 40% 98%
Secondary: 217 33% 18%
Secondary Foreground: 210 40% 98%
Muted: 217 33% 18%
Muted Foreground: 215 20% 65%
Accent: 217 33% 18%
Accent Foreground: 210 40% 98%
Destructive: 0 63% 31%
Destructive Foreground: 210 40% 98%
Border: 217 33% 18%
Input: 217 33% 18%
Ring: 224 76% 48%
```

**Typography:** (same as light mode)

```
Font Family: system-ui, -apple-system, sans-serif
Heading Font Family: system-ui, -apple-system, sans-serif
Radius: 0.5rem
```

**Click "Publish" to save your changes.**

---

## Radical Theme Configuration

The "Radical" theme uses a bold red and black color scheme, inspired by radical literature and activist aesthetics.

### Radical Theme - Light Mode

**Radical Theme Tab → Light Sub-tab:**

```
Primary: 0 84% 50%
Background: 0 0% 100%
Foreground: 0 0% 9%
Card: 0 0% 98%
Card Foreground: 0 0% 9%
Popover: 0 0% 100%
Popover Foreground: 0 0% 9%
Secondary: 0 0% 96%
Secondary Foreground: 0 0% 9%
Muted: 0 0% 96%
Muted Foreground: 0 0% 45%
Accent: 0 84% 95%
Accent Foreground: 0 84% 20%
Destructive: 0 84% 50%
Destructive Foreground: 0 0% 98%
Border: 0 0% 90%
Input: 0 0% 90%
Ring: 0 84% 50%
```

**Typography:**

```
Font Family: system-ui, -apple-system, sans-serif
Heading Font Family: Georgia, serif
Radius: 0.25rem
```

### Radical Theme - Dark Mode

**Radical Theme Tab → Dark Sub-tab:**

```
Primary: 0 84% 60%
Background: 0 0% 9%
Foreground: 0 0% 98%
Card: 0 0% 12%
Card Foreground: 0 0% 98%
Popover: 0 0% 9%
Popover Foreground: 0 0% 98%
Secondary: 0 0% 18%
Secondary Foreground: 0 0% 98%
Muted: 0 0% 18%
Muted Foreground: 0 0% 65%
Accent: 0 84% 20%
Accent Foreground: 0 84% 95%
Destructive: 0 63% 40%
Destructive Foreground: 0 0% 98%
Border: 0 0% 18%
Input: 0 0% 18%
Ring: 0 84% 60%
```

**Typography:** (same as light mode)

```
Font Family: system-ui, -apple-system, sans-serif
Heading Font Family: Georgia, serif
Radius: 0.25rem
```

**Click "Publish" to save your changes.**

---

## Creating Homepage Blocks

### Example: Complete Homepage Setup

Here's a recommended homepage layout using all 6 block types:

#### Block 1: Hero Section

**Configuration:**

```
Block Type: Hero Section
Variant: Full Height
Title: "Welcome to Infoshop"
Subtitle: "Your community bookstore collective. Discover radical literature, independent publishing, and grassroots knowledge."
Icon: Book Open
Alignment: Center
```

**CTA Buttons:**

1. Button 1:
   - Label: "Browse All Books"
   - Href: "/shop"
   - Variant: Default
   - Size: Large

2. Button 2:
   - Label: "Browse Categories"
   - Href: "/shop/categories"
   - Variant: Outline
   - Size: Large

#### Block 2: Book Showcase

**Configuration:**

```
Block Type: Book Showcase
Title: "New Arrivals"
Description: "Recently added to our collection"
Display Mode: Newest Books
Limit: 8
Columns: 4
Show View All Link: Yes
View All Href: "/shop"
```

#### Block 3: Content Block

**Configuration:**

```
Block Type: Content
Layout: Two Columns
Background Color: Muted
```

**Column 1:**

```
Rich Text:
## About Infoshop

Infoshop is a community-run bookstore collective dedicated to providing access to radical, independent, and grassroots literature. We believe in the power of knowledge as a tool for social change.
```

**Column 2:**

```
Rich Text:
## Our Mission

We support independent publishers, promote diverse voices, and create spaces for community engagement. Every purchase supports our mission of making knowledge accessible to all.
```

#### Block 4: Book Showcase (Featured)

**Configuration:**

```
Block Type: Book Showcase
Title: "Featured Books"
Description: "Staff picks and community favorites"
Display Mode: Featured Books
Limit: 8
Columns: 4
Show View All Link: Yes
View All Href: "/shop"
```

#### Block 5: Call to Action

**Configuration:**

```
Block Type: Call to Action
Icon: Users
Title: "Join Our Community"
Description: "Become a member and get discounts on all books, access to exclusive events, and support independent publishing."
Background Color: Primary
```

**Buttons:**

1. Button 1:
   - Label: "Learn More"
   - Href: "/membership"
   - Variant: Secondary
   - Size: Large

#### Block 6: Archive

**Configuration:**

```
Block Type: Archive
Title: "Upcoming Events"
Collection: Events
Layout: Grid
Enable Search: No
Enable Filters: No
Items Per Page: 6
```

**Date Range:**

```
Start: (today's date)
End: (30 days from now)
```

---

## Header & Footer Setup

### Header Configuration

**Layout Global → Header Tab:**

**Logo:**

- Upload your logo image (recommended: SVG or PNG with transparency)
- Recommended size: 200x60px

**Navigation:**

Link 1:

```
Label: Shop
Href: /shop
```

Link 2 (with dropdown):

```
Label: Categories
Href: /shop/categories

Children:
  - Label: Politics
    Href: /shop/categories/politics

  - Label: History
    Href: /shop/categories/history

  - Label: Philosophy
    Href: /shop/categories/philosophy
```

Link 3:

```
Label: Events
Href: /events
```

Link 4:

```
Label: About
Href: /about
```

**CTA Button:**

```
Label: Become a Member
Href: /membership
```

### Footer Configuration

**Layout Global → Footer Tab:**

**Column 1:**

```
Title: Quick Links

Links:
  - Label: Shop
    Href: /shop

  - Label: Categories
    Href: /shop/categories

  - Label: Subjects
    Href: /shop/subjects

  - Label: Events
    Href: /events
```

**Column 2:**

```
Title: About

Links:
  - Label: About Us
    Href: /about

  - Label: Contact
    Href: /contact

  - Label: Membership
    Href: /membership

  - Label: FAQ
    Href: /faq
```

**Column 3:**

```
Title: Community

Links:
  - Label: Blog
    Href: /blog

  - Label: Events
    Href: /events

  - Label: Resources
    Href: /resources
```

**Social Links:**

```
1. Platform: Facebook
   URL: https://facebook.com/infoshop

2. Platform: Twitter
   URL: https://twitter.com/infoshop

3. Platform: Instagram
   URL: https://instagram.com/infoshop
```

**Copyright:**

```
© 2025 Infoshop. All rights reserved.
```

**Click "Publish" to save all changes.**

---

## Troubleshooting

### Issue: Homepage shows "Homepage blocks not yet configured"

**Solution**:

1. Navigate to Globals → Layout → Homepage tab
2. Add at least one block
3. Publish changes
4. Refresh the homepage

### Issue: Theme colors not applying

**Solution**:

1. Verify Theme Global is published (not in draft)
2. Check browser DevTools → Elements → `<html>` tag
3. Should see `data-theme="default"` or `data-theme="radical"`
4. Should see CSS variables in inline styles
5. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Dark mode not working

**Solution**:

1. Check Theme Global → Active Theme → Color Mode setting
2. If set to "Auto", check your system dark mode preference
3. If set to "Light" or "Dark", it will force that mode
4. The dark mode toggle component is at `/components/ThemeToggle.tsx`

### Issue: Blocks not rendering correctly

**Solution**:

1. Check browser console for JavaScript errors
2. Verify all block fields are filled in (especially required fields)
3. For BookShowcase blocks, ensure books exist in the database
4. For Archive blocks, ensure date ranges are valid
5. Check TypeScript compilation: `pnpm build`

### Issue: TypeScript errors after adding blocks

**Solution**:

1. Run `pnpm generate:types` to regenerate Payload types
2. Restart TypeScript server in your editor
3. Restart dev server: `pnpm dev`

### Issue: Images not displaying in blocks

**Solution**:

1. Verify images are uploaded to Media collection
2. Check image URLs in browser DevTools
3. Verify Next.js Image domains in `next.config.mjs`
4. Check file permissions on uploads directory

---

## Next Steps

Once you've completed this setup:

1. ✅ **Test Theme Switching**: Change Active Theme between Default and Radical
2. ✅ **Test Dark Mode**: Change Color Mode between Auto, Light, and Dark
3. ✅ **Add Content**: Upload books and create events
4. ✅ **Customize Blocks**: Experiment with different block configurations
5. ✅ **Customize Colors**: Adjust color tokens to match your brand

---

## Quick Reference: HSL Color Format

When entering colors, use this format:

```
Format: HUE SATURATION% LIGHTNESS%
Example: 221 83% 53%

NO hsl() wrapper needed!
NO commas!
```

**HSL Guide:**

- **Hue**: 0-360 (0=red, 120=green, 240=blue)
- **Saturation**: 0-100% (0=grey, 100=vivid)
- **Lightness**: 0-100% (0=black, 50=normal, 100=white)

**Example Colors:**

- Red: `0 84% 50%`
- Blue: `221 83% 53%`
- Green: `142 71% 45%`
- Grey: `0 0% 50%`

---

## Support

For issues or questions:

1. Check the architecture docs: `.agent/task/theme-system.md`
2. Review Payload documentation: https://payloadcms.com/docs
3. Check console for error messages
4. Verify all steps in this guide

---

**Setup Guide Version**: 1.0
**Compatible With**: Infoshop Theme System Week 4+
