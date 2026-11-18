import Link from 'next/link'

const navItems = {
  '/': {
    name: 'home',
  },
  '/blog': {
    name: 'blog',
  },
  '/about': {
    name: 'about',
  },
  '/songs': {
    name: 'songs',
  },
}

export function Navbar() {
  return (
    <aside className="-ml-[8px] mb-16 tracking-tight">
      <div className="lg:sticky lg:top-20">
        <nav
          className="flex flex-row items-start relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
          id="nav"
        >
          <div className="flex flex-row space-x-0 pr-10">
            {Object.entries(navItems).map(([path, { name }]) => {
              return (
                <Link
                  key={path}
                  href={path}
                  className="group relative m-1 flex items-center px-2 py-1 transition-colors hover:text-neutral-800 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 dark:hover:text-neutral-200"
                >
                  {name}
                  <span
                    aria-hidden="true"
                    className="inline-block w-[0.4em] opacity-0 transition-all duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0 motion-safe:group-focus-visible:translate-y-0 motion-reduce:transition-none"
                  >
                    !
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </aside>
  )
}
