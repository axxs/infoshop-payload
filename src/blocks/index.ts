export { Hero } from './Hero'
export { BookShowcase } from './BookShowcase'
export { Content } from './Content'
export { CallToAction } from './CallToAction'
export { Media } from './Media'
export { Archive } from './Archive'

// Export all blocks as an array for easy use in collections/globals
import { Hero } from './Hero'
import { BookShowcase } from './BookShowcase'
import { Content } from './Content'
import { CallToAction } from './CallToAction'
import { Media } from './Media'
import { Archive } from './Archive'

export const blocks = [Hero, BookShowcase, Content, CallToAction, Media, Archive]
