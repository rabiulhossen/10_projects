import React, { useMemo, useState } from 'react'

const defaultTargets = { linkedin: true, facebook: true, twitter: true, instagram: true }

export default function App() {
	const [text, setText] = useState('')
	const [link, setLink] = useState('')
	const [imageUrl, setImageUrl] = useState('')
	const [targets, setTargets] = useState(defaultTargets)
	const [pageId, setPageId] = useState('')
	const [result, setResult] = useState(null)
	const [busy, setBusy] = useState(false)

	async function publish() {
		setBusy(true)
		setResult(null)
		try {
			const resp = await fetch('/api/post', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ text, link: link || undefined, imageUrl: imageUrl || undefined, targets, pageId: pageId || undefined })
			})
			const data = await resp.json()
			setResult(data)
		} catch (e) {
			setResult({ error: String(e) })
		} finally {
			setBusy(false)
		}
	}

	return (
		<div style={{ maxWidth: 760, margin: '32px auto', fontFamily: 'system-ui, sans-serif' }}>
			<h2>Social Multi-Poster</h2>
			<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
				<button onClick={() => (window.location.href = '/auth/linkedin/start')}>Connect LinkedIn</button>
				<button onClick={() => (window.location.href = '/auth/facebook/start')}>Connect Facebook/Instagram</button>
				<button onClick={() => (window.location.href = '/auth/twitter/start')}>Connect Twitter (X)</button>
			</div>

			<div style={{ display: 'grid', gap: 8 }}>
				<textarea rows={6} placeholder="Write your post..." value={text} onChange={e => setText(e.target.value)} />
				<input placeholder="Optional link (LI/FB)" value={link} onChange={e => setLink(e.target.value)} />
				<input placeholder="Optional image URL (required for IG)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
				<div style={{ display: 'flex', gap: 16 }}>
					<label><input type="checkbox" checked={targets.linkedin} onChange={e => setTargets({ ...targets, linkedin: e.target.checked })} /> LinkedIn</label>
					<label><input type="checkbox" checked={targets.facebook} onChange={e => setTargets({ ...targets, facebook: e.target.checked })} /> Facebook</label>
					<label><input type="checkbox" checked={targets.twitter} onChange={e => setTargets({ ...targets, twitter: e.target.checked })} /> Twitter</label>
					<label><input type="checkbox" checked={targets.instagram} onChange={e => setTargets({ ...targets, instagram: e.target.checked })} /> Instagram</label>
				</div>
				<input placeholder="Optional Facebook Page ID" value={pageId} onChange={e => setPageId(e.target.value)} />
				<button onClick={publish} disabled={busy}>{busy ? 'Publishing...' : 'Publish to selected'}</button>
			</div>

			<pre style={{ background: '#f6f8fa', padding: 12, marginTop: 16 }}>
				{result ? JSON.stringify(result, null, 2) : 'Results will appear here'}
			</pre>
			<p style={{ color: '#555' }}>
				Note: Instagram requires an image URL and a Business/Creator account linked to a Facebook Page.
			</p>
		</div>
	)
}