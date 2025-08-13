import axios from 'axios';
import { AuthorizationCode } from 'simple-oauth2';
import { saveToken, loadToken } from '../db.js';
import { getSessionUserId } from '../session.js';

const fbVersion = process.env.FACEBOOK_GRAPH_VERSION || 'v19.0';

const client = new AuthorizationCode({
	client: { id: process.env.FACEBOOK_CLIENT_ID, secret: process.env.FACEBOOK_CLIENT_SECRET },
	auth: {
		tokenHost: `https://graph.facebook.com`,
		tokenPath: `/${fbVersion}/oauth/access_token`,
		authorizeHost: 'https://www.facebook.com',
		authorizePath: `/${fbVersion}/dialog/oauth`,
	},
});

const scopes = [
	'public_profile',
	'pages_show_list',
	'pages_read_engagement',
	'pages_manage_posts',
	'instagram_basic',
	'instagram_content_publish',
];

export function start(req, res) {
	const state = getSessionUserId(req);
	const url = client.authorizeURL({ redirect_uri: process.env.FACEBOOK_REDIRECT_URI, scope: scopes.join(','), state });
	res.redirect(url);
}

export async function callback(req, res) {
	const { code, state } = req.query;
	if (!code || state !== getSessionUserId(req)) return res.status(400).send('Invalid state');
	const tokenParams = { code, redirect_uri: process.env.FACEBOOK_REDIRECT_URI };
	const token = await client.getToken(tokenParams);
	const userToken = token.token.access_token;
	// Load pages and store page tokens
	const pages = await axios.get(`https://graph.facebook.com/${fbVersion}/me/accounts`, { params: { access_token: userToken } });
	await saveToken(getSessionUserId(req), 'facebook', {
		userToken,
		pages: (pages.data.data || []).map(p => ({ id: p.id, name: p.name, access_token: p.access_token })),
	});
	res.redirect(`${process.env.FRONTEND_URL}/connected?platform=facebook`);
}

export async function postPage(req, { text, link, imageUrl, pageId }) {
	const fb = await loadToken(getSessionUserId(req), 'facebook');
	if (!fb?.pages?.length) throw new Error('No Facebook Page connected');
	const page = pageId ? fb.pages.find(p => p.id === pageId) : fb.pages[0];
	if (!page) throw new Error('Specified Facebook Page not found');
	const pageToken = page.access_token;
	if (imageUrl) {
		const resp = await axios.post(`https://graph.facebook.com/${fbVersion}/${page.id}/photos`, null, {
			params: { url: imageUrl, caption: text, access_token: pageToken },
		});
		return { id: resp.data?.post_id || resp.data?.id || 'ok' };
	} else {
		const resp = await axios.post(`https://graph.facebook.com/${fbVersion}/${page.id}/feed`, null, {
			params: { message: text, link, access_token: pageToken },
		});
		return { id: resp.data?.id || 'ok' };
	}
}

export async function getInstagramUserId(pageId, pageAccessToken) {
	const pageInfo = await axios.get(`https://graph.facebook.com/${fbVersion}/${pageId}`, {
		params: { fields: 'instagram_business_account', access_token: pageAccessToken },
	});
	return pageInfo.data?.instagram_business_account?.id;
}