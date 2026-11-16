import { BlogPosts } from 'app/components/posts'
import { DiscordAvatar } from 'app/components/discord-avatar'
import { SiDiscord, SiInstagram, SiX, SiYoutube } from 'react-icons/si'

const socialLinks = [
  { name: 'Instagram', href: 'https://www.instagram.com/tyler_.chin/', Icon: SiInstagram },
  { name: 'Discord', href: 'https://discord.com/users/499751229291757578', Icon: SiDiscord },
  { name: 'X', href: 'https://x.com/acni101', Icon: SiX },
  { name: 'YouTube', href: 'https://www.youtube.com/@Hisez', Icon: SiYoutube },
]

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 flex items-center gap-3 text-2xl font-semibold tracking-tighter">
        <DiscordAvatar />
        <span className="group">
          acni
          <span
            aria-hidden="true"
            className="inline-block w-[0.4em] opacity-0 transition-all duration-200 ease-out group-hover:opacity-100 motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0 motion-reduce:transition-none"
          >
            !
          </span>
        </span>
      </h1>
      <p className="mb-4">
        {`Hey, i'm tyler. I often write blogposts on this website about binary exploitation concepts, CTF challenges, and any low-level exploitation challenges that catch my eye.`}
      </p>
      <nav aria-label="Social links" className="-ml-1 mt-10 flex items-center gap-1">
        {socialLinks.map(({ name, href, Icon }) => (
          <a
            key={name}
            href={href}
            aria-label={name}
            title={name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-neutral-900 transition-colors hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-white dark:hover:text-neutral-300"
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
          </a>
        ))}
      </nav>
      <div className="mt-3 mb-8">
        <BlogPosts abbreviatedDates showCategories />
      </div>
    </section>
  )
}
