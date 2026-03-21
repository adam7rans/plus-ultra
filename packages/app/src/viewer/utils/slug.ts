export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function flowToPath(section: string, title: string): string {
  return `/${slugify(section)}/${slugify(title)}`
}

export function pathToFlow(pathname: string, flows: { section: string; title: string; id: number }[]) {
  const parts = pathname.replace(/^\/+/, '').split('/')
  if (parts.length < 2) return null
  const [sectionSlug, flowSlug] = parts
  return flows.find(
    f => slugify(f.section) === sectionSlug && slugify(f.title) === flowSlug
  ) ?? null
}
