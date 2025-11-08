# Theme System Architecture

**Status**: ✅ Core Implementation Complete + Dark Mode Fixed
**Created**: 2025-01-08
**Last Updated**: 2025-01-09

## Executive Summary

This document details the comprehensive theme system implementation for Infoshop, built following Payload CMS best practices. The system enables multi-site theming with block-based content composition, supporting multiple visual themes with light/dark mode variants.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Decisions](#design-decisions)
3. [Implementation Details](#implementation-details)
4. [Usage Guide](#usage-guide)
5. [File Structure](#file-structure)
6. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Payload CMS Admin                         │
│  (Configure themes, layouts, and blocks)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Payload Globals                             │
│  • Theme Global (colors, typography, mode)                   │
│  • Layout Global (header, footer, homepage blocks)           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Server Components                       │
│  • Fetch globals via getPayload()                            │
│  • Server-side rendering with theme data                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                ThemeProvider (Client)                        │
│  • Apply CSS variables based on theme                        │
│  • Handle light/dark/auto mode                               │
│  • Listen for system preference changes                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Block Components                           │
│  • Render blocks using theme CSS variables                   │
│  • Tailwind CSS v4 with @theme directive                     │
└─────────────────────────────────────────────────────────────┘
```

### Core Concepts

1. **Payload Globals**: Centralized configuration stored in database
2. **Block-Based Composition**: Flexible, reusable content sections
3. **CSS Variable Theming**: Runtime theme switching without rebuilds
4. **Server Components First**: Optimal performance with RSC architecture
5. **Type-Safe**: Full TypeScript integration with generated types

---

## Design Decisions

### Decision 1: Payload Globals for Theme Configuration

**Rationale**: Store theme configuration in Payload globals rather than filesystem configuration.

**Advantages**:

- ✅ Non-technical users can modify themes via admin UI
- ✅ Supports runtime theme switching without deployments
- ✅ Version control and draft/publish workflow
- ✅ Multi-environment support (dev/staging/prod)

**Trade-offs**:

- ⚠️ Database dependency for theme data
- ⚠️ Requires Payload to be running

**Alternative Considered**: Filesystem configuration files

- ❌ Rejected: Requires code changes and deployments for theme updates

### Decision 2: CSS Variables Over CSS-in-JS

**Rationale**: Use CSS custom properties for theming rather than CSS-in-JS solutions.

**Advantages**:

- ✅ Native browser support, no runtime overhead
- ✅ Works seamlessly with Tailwind CSS v4
- ✅ Easy to inspect and debug in DevTools
- ✅ Supports cascade and inheritance
- ✅ Can be updated dynamically without re-renders

**Trade-offs**:

- ⚠️ Limited IE11 support (acceptable for modern browsers)

**Alternative Considered**: Styled Components / Emotion

- ❌ Rejected: Runtime overhead, bundle size, RSC complexity

### Decision 3: Block-Based Content System

**Rationale**: Use Payload's block field type for flexible content composition.

**Advantages**:

- ✅ Content editors control page layout
- ✅ Reusable blocks across pages
- ✅ Type-safe with generated TypeScript types
- ✅ Follows Payload CMS conventions
- ✅ Supports complex layouts without code changes

**Trade-offs**:

- ⚠️ More complex than static layouts
- ⚠️ Requires BlockRenderer component

**Alternative Considered**: Hardcoded page layouts

- ❌ Rejected: Inflexible, requires code changes for layout updates

### Decision 4: Server Components for Data Fetching

**Rationale**: Use Next.js Server Components for all data fetching.

**Advantages**:

- ✅ Zero client-side JavaScript for data fetching
- ✅ Faster initial page loads
- ✅ Better SEO (content in initial HTML)
- ✅ Reduced bundle size
- ✅ Simplified data flow

**Trade-offs**:

- ⚠️ Some blocks must be async functions
- ⚠️ Can't use React hooks in Server Components

**Alternative Considered**: Client-side data fetching

- ❌ Rejected: Poor performance, larger bundles, worse SEO

### Decision 5: Lexical Rich Text with Safe Serialization

**Rationale**: Serialize Lexical editor output to React components rather than HTML strings.

**Advantages**:

- ✅ **XSS Protection**: Renders to React elements, not HTML strings
- ✅ Type-safe rendering
- ✅ Custom component rendering
- ✅ Better performance (React VDOM optimization)

**Trade-offs**:

- ⚠️ Custom serializer maintenance

**Alternative Considered**: HTML string rendering

- ❌ Rejected: XSS vulnerability risk

---

## Implementation Details

### Theme Global Structure

**Location**: `src/globals/Theme.ts`

**Fields**:

```typescript
{
  activeTheme: 'default' | 'radical',
  colorMode: 'auto' | 'light' | 'dark',

  // Per-theme color tokens (light mode)
  default_light_primary: string (HSL),
  default_light_background: string (HSL),
  default_light_foreground: string (HSL),
  // ... 15 more color tokens

  // Per-theme color tokens (dark mode)
  default_dark_primary: string (HSL),
  // ... 15 more color tokens

  // Per-theme typography
  default_fontFamily: string,
  default_headingFontFamily: string,
  default_radius: string,

  // Radical theme (same structure)
  radical_light_*: ...,
  radical_dark_*: ...,
  radical_fontFamily: ...,
}
```

**HSL Color Format**: All colors use HSL format for Tailwind CSS v4 compatibility:

- Format: `220 80% 50%` (raw HSL values without hsl() wrapper)
- Stored in database without hsl() wrapper
- ThemeProvider wraps values in hsl() when applying to CSS variables
- Rationale: Database stores raw values, runtime applies proper formatting

### ThemeProvider Implementation

**Location**: `src/app/(frontend)/components/ThemeProvider.tsx`

**Purpose**: Client-side theme application and management

**Key Features**:

1. **CSS Variable Application**: Applies theme colors as CSS custom properties
   - Wraps raw HSL values in `hsl()` function for Tailwind v4 compatibility
   - Updates root element inline styles dynamically

2. **Dark Mode Support**: Three color modes supported
   - `light`: Force light mode regardless of system preference
   - `dark`: Force dark mode regardless of system preference
   - `auto`: Respect system preference (default)

3. **System Preference Listening**: Automatically responds to OS dark mode changes
   - Uses `window.matchMedia('(prefers-color-scheme: dark)')`
   - Re-applies theme when system preference changes

4. **SSR Safety**: Prevents flash of unstyled content
   - Returns null until client-side hydration complete
   - Uses `mounted` state to track hydration

**Dark Mode Implementation**:

The dark mode system works through multiple layers:

1. **globals.css**: Defines base CSS variables with `@theme` directive
   - Light mode defaults in main `@theme` block
   - Dark mode values in `.dark` class selector
   - System preference fallback in `@media (prefers-color-scheme: dark)`

2. **ThemeProvider**: Applies `.dark` class to HTML element when needed
   - Line 34: `root.classList.toggle('dark', useDarkMode)`
   - Determines dark mode based on `colorMode` setting and system preference
   - Wraps color values in `hsl()` for proper CSS formatting

3. **Tailwind CSS v4**: Uses CSS variables for theming
   - Utilities like `bg-background` reference `--color-background`
   - Values must be complete color values (e.g., `hsl(222 84% 5%)`)
   - Not just HSL channels (e.g., `222 84% 5%`)

### Navigation Dropdown Implementation

**Location**: `src/app/(frontend)/components/layout/NavigationDropdown.tsx`

**Purpose**: Accessible dropdown menu for navigation items with children

**Features**:

- Uses Radix UI primitives for accessibility
- Supports keyboard navigation
- ARIA-compliant
- Renders "View All" link plus child navigation items
- Integrated into HeaderDynamic component

**Integration**: HeaderDynamic checks for `item.children.length > 0` and conditionally renders NavigationDropdown component instead of a simple link.

### Lexical Serialization

**Location**: `src/lib/serializeLexical.tsx`

**Purpose**: Convert Lexical editor JSON to React components

**Security Approach**: Render to React elements instead of HTML strings

- ✅ **No XSS Risk**: All output is typed React components
- ✅ **Type Safe**: Strongly typed node handling

**Supported Node Types**:

- Paragraph
- Headings (h1-h6)
- Text with formatting (bold, italic, underline, strikethrough)
- Links
- Lists (ordered/unordered)
- List items
- Blockquotes

**Example**:

```typescript
// Lexical JSON
{ type: 'paragraph', children: [
  { type: 'text', text: 'Hello', format: 1 } // 1 = bold
]}

// Rendered as React component
<p><strong>Hello</strong></p>
```

---

## Usage Guide

### Initial Setup

1. **Start Development Server**:

   ```bash
   pnpm dev
   ```

2. **Access Payload Admin**:
   Navigate to `http://localhost:3000/admin`

3. **Configure Theme Global**:
   - Go to Globals → Theme
   - Select active theme (default or radical)
   - Choose color mode (auto, light, dark)
   - Customise color tokens if desired
   - Publish changes

4. **Configure Layout Global**:
   - Go to Globals → Layout
   - Configure Header (logo, navigation)
   - Configure Footer (columns, social links)
   - Add Homepage blocks

### Adding Homepage Blocks

1. Navigate to **Globals → Layout → Homepage tab**
2. Click "Add Block"
3. Select block type
4. Configure block fields
5. Reorder blocks as needed
6. Publish changes
7. View homepage at `http://localhost:3000`

### Creating a New Block Type

1. **Define Block Schema** (`src/blocks/YourBlock.ts`)
2. **Export from Index** (`src/blocks/index.ts`)
3. **Create Component** (`src/app/(frontend)/components/blocks/YourBlock.tsx`)
4. **Add to BlockRenderer**
5. **Generate Types**: `pnpm generate:types`

---

## File Structure

```
src/
├── globals/
│   ├── Theme.ts              # Theme configuration global
│   └── Layout.ts             # Layout configuration global
├── blocks/
│   ├── Hero.ts               # Hero block definition
│   ├── BookShowcase.ts       # Book showcase block
│   ├── Content.ts            # Content block
│   ├── CallToAction.ts       # CTA block
│   ├── Media.ts              # Media block
│   ├── Archive.ts            # Archive block
│   └── index.ts              # Block exports
├── app/(frontend)/
│   ├── layout.tsx            # Root layout with ThemeProvider
│   ├── page.tsx              # Homepage with BlockRenderer
│   ├── globals.css           # Base theme CSS variables
│   └── components/
│       ├── ThemeProvider.tsx # Client-side theme application
│       ├── ThemeToggle.tsx   # Dark mode toggle UI
│       └── blocks/
│           ├── Hero.tsx
│           ├── BookShowcase.tsx
│           ├── Content.tsx
│           ├── CallToAction.tsx
│           ├── Media.tsx
│           ├── Archive.tsx
│           └── BlockRenderer.tsx
├── lib/
│   ├── serializeLexical.tsx  # Safe Lexical serializer
│   └── utils.ts              # Utility functions
└── payload.config.ts         # Payload config
```

---

## Future Enhancements

### Near-Term (Weeks 5-7)

1. **Live Preview Support**: Enable draft preview in Payload admin
2. **Header/Footer Migration**: Use Layout Global for header/footer
3. **Integration Tests**: Test theme switching and block rendering
4. **Admin Documentation**: In-admin help text and examples

### Long-Term

1. **Theme Packages**: Package themes as npm modules
2. **Block Variations**: Support multiple variants per block type
3. **Performance Optimisations**: Cache theme CSS variables
4. **Advanced Features**: Per-page theme overrides, scheduled changes

---

## Technical Debt & Known Issues

### None Currently

All implementation follows best practices:

- ✅ Zero TypeScript errors
- ✅ Zero linting warnings
- ✅ XSS protection via safe Lexical serialization
- ✅ Proper error handling with fallbacks
- ✅ Type-safe throughout

---

**Document Version**: 1.0
**Implementation Version**: Week 4 Complete
