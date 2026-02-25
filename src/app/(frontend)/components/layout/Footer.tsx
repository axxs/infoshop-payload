import Link from 'next/link'
import { ScrollReveal } from '../cinematic/ScrollReveal'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <ScrollReveal>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold">About Infoshop</h3>
              <p className="text-sm text-muted-foreground">
                A community-run bookstore collective promoting radical literature and independent
                publishing.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold">Shop</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/shop" className="text-muted-foreground hover:text-primary">
                    All Books
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shop?category=all"
                    className="text-muted-foreground hover:text-primary"
                  >
                    Categories
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shop?sort=newest"
                    className="text-muted-foreground hover:text-primary"
                  >
                    New Arrivals
                  </Link>
                </li>
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-primary">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-primary">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-muted-foreground hover:text-primary">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div>
              <h3 className="mb-4 font-heading text-lg font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Infoshop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
