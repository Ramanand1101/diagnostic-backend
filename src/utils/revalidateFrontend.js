// Next.js caches lab pages for 60s (`revalidate: 60` in the App Router route). Without
// this, an admin edit stays stale on the public site for up to a minute even on a hard
// refresh. Fire-and-forget: a revalidation hiccup shouldn't fail the admin's save.
async function revalidateFrontend(path) {
  const base = process.env.FRONTEND_URL || 'https://healthontime.in';
  try {
    await fetch(`${base}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  } catch (err) {
    console.error('revalidateFrontend failed:', err.message);
  }
}

module.exports = revalidateFrontend;
