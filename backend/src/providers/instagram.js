import axios from 'axios';
import { loadToken } from '../db.js';
import { getSessionUserId } from '../session.js';
import { getInstagramUserId } from './facebook.js';

const fbVersion = process.env.FACEBOOK_GRAPH_VERSION || 'v19.0';

export async function post(req, { caption, imageUrl, pageId }) {
	if (!imageUrl) throw new Error('Instagram requires imageUrl');
	const fb = await loadToken(getSessionUserId(req), 'facebook');
	if (!fb?.pages?.length) throw new Error('No Facebook Page connected');
	const page = pageId ? fb.pages.find(p => p.id === pageId) : fb.pages[0];
	if (!page) throw new Error('Specified Page not found');
	const igUserId = await getInstagramUserId(page.id, page.access_token);
	if (!igUserId) throw new Error('No Instagram Business account linked to the Page');
	const container = await axios.post(`https://graph.facebook.com/${fbVersion}/${igUserId}/media`, null, {
		params: { image_url: imageUrl, caption, access_token: page.access_token },
	});
	const publish = await axios.post(`https://graph.facebook.com/${fbVersion}/${igUserId}/media_publish`, null, {
		params: { creation_id: container.data.id, access_token: page.access_token },
	});
	return { id: publish.data?.id || 'ok' };
}