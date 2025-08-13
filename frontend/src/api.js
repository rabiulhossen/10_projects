export async function postUnified(body) {
	const resp = await fetch('/api/post', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(body),
	});
	if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
	return resp.json();
}