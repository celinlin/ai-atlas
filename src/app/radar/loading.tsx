export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 pt-14 md:px-8" aria-busy="true">
      <div className="skeleton h-12 w-64" />
      <div className="skeleton h-4 w-96 max-w-full" />
      <div className="grid gap-10 pt-6 md:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2.5"><div className="skeleton h-3 w-28" /><div className="skeleton h-5 w-11/12" /><div className="skeleton h-5 w-2/3" /><div className="skeleton h-3.5 w-full" /></div>
        ))}
      </div>
    </div>
  );
}
