type SortableJourney = {id: string; startedAt: number; basketCents?: number};

export function sortJourneys<T extends SortableJourney>(rows: T[], sort: string): T[] {
  return [...rows].sort((a, b) => {
    const newestFirst = b.startedAt - a.startedAt || a.id.localeCompare(b.id);
    if (sort === 'oldest') return a.startedAt - b.startedAt || a.id.localeCompare(b.id);
    if (sort === 'value-high' || sort === 'value-low') {
      if (a.basketCents === undefined) return b.basketCents === undefined ? newestFirst : 1;
      if (b.basketCents === undefined) return -1;
      const difference = sort === 'value-high' ? b.basketCents - a.basketCents : a.basketCents - b.basketCents;
      return difference || newestFirst;
    }
    return newestFirst;
  });
}
