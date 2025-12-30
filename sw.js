self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("subhashayah-v1").then(cache =>
      cache.addAll(["/", "/index.html", "/styles.css", "/app.js"])
    )
  );
});
