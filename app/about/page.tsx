import Image from 'next/image'
import placements from './placements.json'

export const metadata = {
  title: 'about',
}

const teamLinks = [
  { name: 'L3ak', href: 'https://l3ak.team/' },
  { name: '0xf1sh', href: 'https://0xf1.sh/' },
  { name: 'Shellphish', href: 'https://shellphish.net/' },
  { name: 'tjcsc', href: 'https://ctftime.org/team/53812/' },
  { name: '0xfun', href: 'https://0xfun.org' },
]

function TeamList({ teams }: { teams: typeof teamLinks }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
      {teams.map((team) => (
        <li key={team.name}>
          <a
            href={team.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-neutral-400 underline-offset-4 transition-colors hover:text-blue-600 dark:decoration-neutral-600 dark:hover:text-blue-400"
          >
            {team.name}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function AboutPage() {
  return (
    <section className="space-y-10">
      <header>
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="/images/pfp.jpg"
            alt=""
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 rounded-full object-cover"
          />
          <h1 className="text-2xl font-semibold tracking-tighter">about</h1>
        </div>
        <p className="mb-4">
          Hey, i'm tyler, aka acni. I'm a college freshman at Purdue University studying cybersecurity.
          I'm interested in low-level exploitation and penetration testing, and I play binary exploitation
          for various CTF teams.
        </p>
      </header>

      <section aria-labelledby="teams-heading">
        <h2 id="teams-heading" className="text-lg font-semibold tracking-tight">
          active &amp; former teams
        </h2>
        <TeamList teams={teamLinks} />
      </section>

      <section aria-labelledby="research-heading">
        <h2 id="research-heading" className="text-lg font-semibold tracking-tight">
          disclosures
        </h2>
        <ul className="mt-4 space-y-3">
          <li>
            <a
              href="https://wpscan.com/vulnerability/4972f315-3819-4fb9-b56a-a88df992416e/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              CVE-2026-74851
            </a>
          </li>
          <li>CVE-2026-104829</li>
          <li>
            <a
              href="https://enthion.org/disclosures"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              inc@Enthion
            </a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="placements-heading">
        <h2 id="placements-heading" className="text-lg font-semibold tracking-tight">
          competition placements
        </h2>
        <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {placements.map((placement) => (
            <li
              key={`${placement.event}-${placement.team}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium leading-snug">{placement.event}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {placement.team}
                </p>
              </div>
              <span className="whitespace-nowrap text-sm tabular-nums text-neutral-700 dark:text-neutral-300">
                {placement.place}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
