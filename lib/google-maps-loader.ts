// On-demand Google Maps script loader. The script used to load in the root
// layout on every page; now only components that actually render a map or
// address autocomplete pull it in. Always loads the `places` library so the
// script is identical no matter which consumer wins the race.
let mapsPromise: Promise<void> | null = null

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  const w = window as any
  if (w.google?.maps?.places) return Promise.resolve()

  if (!mapsPromise) {
    mapsPromise = new Promise<void>((resolve, reject) => {
      const ready = () => w.google?.maps?.places

      // A maps script may already exist (e.g. server-rendered HTML from an
      // older deploy) — poll instead of injecting a duplicate.
      const existing = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existing) {
        const iv = setInterval(() => {
          if (ready()) {
            clearInterval(iv)
            resolve()
          }
        }, 200)
        return
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => {
        mapsPromise = null
        script.remove()
        reject(new Error("Google Maps failed to load"))
      }
      document.head.appendChild(script)
    })
  }
  return mapsPromise
}
