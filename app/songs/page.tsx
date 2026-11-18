import Image from 'next/image'

export const metadata = {
  title: 'songs',
  description: 'stuff ive been listening to lately. this is facts, not opinion.',
}

type Pick = {
  title: string
  artist: string
  cover: string
}

// Keep these lists in rank order. Update them as favorites change.
const topSongs: Pick[] = [
  { title: 'Future Me Hates Me', artist: 'The Beths', cover: '/images/music/future-me-hates-me.jpg' },
  { title: 'theirthoughts', artist: 'bunii', cover: '/images/music/theirthoughts.jpg' },
  { title: 'First Rate Town', artist: 'Good Kid', cover: '/images/music/first-rate-town.jpg' },
  { title: 'Kaibutsu', artist: 'YOASOBI', cover: '/images/music/kaibutsu.jpg' },
  {
    title: 'Perfect Pinterest Garden (Ninajirachi & underscores Remix)',
    artist: 'Porter Robinson, Ninajirachi & underscores',
    cover: '/images/music/perfect-pinterest-garden-remix.jpg',
  },
]
const topAlbums: Pick[] = [
  { title: 'SMILE! :D', artist: 'Porter Robinson', cover: '/images/music/smile.jpg' },
  { title: 'Eternal Atake (Deluxe)', artist: 'Lil Uzi Vert', cover: '/images/music/eternal-atake-deluxe.jpg' },
  { title: 'Phantom Pop', artist: 'Wild Party', cover: '/images/music/phantom-pop.jpg' },
]

function RankedList({ picks }: { picks: Pick[] }) {
  return (
    <ol className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {picks.map((pick, index) => (
        <li key={`${pick.title}-${pick.artist}`} className="flex items-center gap-3 py-3">
          <span className="w-5 shrink-0 text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
            {index + 1}.
          </span>
          <Image
            src={pick.cover}
            alt={`Cover art for ${pick.title}`}
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 shrink-0 rounded-sm border border-neutral-200 object-cover dark:border-neutral-800"
          />
          <div className="min-w-0">
            <p className="font-medium leading-snug">{pick.title}</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {pick.artist}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function SongsPage() {
  return (
    <section className="space-y-10">
      <header>
        <h1 className="mb-8 text-2xl font-semibold tracking-tighter">songs</h1>
        <p className="mb-4">A few things ive been listening to lately</p>
      </header>

      <section aria-labelledby="songs-heading">
        <h2 id="songs-heading" className="text-lg font-semibold tracking-tight">
          current top 5 songs
        </h2>
        <RankedList picks={topSongs} />
      </section>

      <section aria-labelledby="albums-heading">
        <h2 id="albums-heading" className="text-lg font-semibold tracking-tight">
          top 3 albums
        </h2>
        <RankedList picks={topAlbums} />
      </section>
    </section>
  )
}
